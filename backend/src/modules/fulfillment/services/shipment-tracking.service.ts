import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationChannel,
  NotificationType,
  OrderStatus,
  Prisma,
  Shipment,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { GhnOrderApiService } from './ghn-order-api.service';
import { mapGhnStatus, objectValue } from './shipment-state';
import { shipmentGhnContext } from './ghn-context';

export interface ShipmentActor {
  id: string;
  role: string;
}

export interface TrackingResult {
  orderId: string;
  orderStatus: OrderStatus;
  shipment: Shipment | null;
  carrierStatus?: string;
  needsAttention?: boolean;
  ignoredStaleUpdate?: boolean;
}

@Injectable()
export class ShipmentTrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ghn: GhnOrderApiService,
  ) {}

  async view(orderId: string, actor: ShipmentActor): Promise<TrackingResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { shipment: true },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
    if (
      actor.id !== order.buyerId &&
      actor.id !== order.sellerId &&
      !['ADMIN', 'SUPPORT_STAFF'].includes(actor.role)
    ) {
      throw new ForbiddenException('Bạn không có quyền xem vận đơn này.');
    }
    return { orderId, orderStatus: order.status, shipment: order.shipment };
  }

  async refresh(orderId: string, actor?: ShipmentActor): Promise<TrackingResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { shipment: true },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
    if (
      actor &&
      actor.id !== order.buyerId &&
      actor.id !== order.sellerId &&
      !['ADMIN', 'SUPPORT_STAFF'].includes(actor.role)
    ) {
      throw new ForbiddenException('Bạn không có quyền xem vận đơn này.');
    }
    const waybill = order.shipment?.waybillCode;
    if (!waybill) throw new BadRequestException('Đơn chưa có vận đơn GHN được xác nhận.');
    const context = shipmentGhnContext(order.shipment?.metadata);
    const detail = await this.ghn.detail(waybill, context.shopId, context.environment);
    const mapped = mapGhnStatus(detail.status);
    const timestamp = Date.parse(String(detail.updated_date));
    if (!Number.isFinite(timestamp) || timestamp > Date.now() + 60000) {
      throw new BadGatewayException('Thời gian cập nhật GHN không hợp lệ.');
    }
    let carrierFee: { total: number; detail: Record<string, unknown> } | null = null;
    try {
      carrierFee = await this.ghn.fees(waybill, context.shopId, context.environment);
    } catch {
      /* Status sync remains useful if fee reconciliation is temporarily unavailable. */
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
      const current = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { shipment: true },
      });
      if (!current.shipment || current.shipment.waybillCode !== waybill)
        throw new BadRequestException('Vận đơn đã thay đổi.');
      const metadata = objectValue(current.shipment.metadata);
      if (metadata.clientOrderCode && detail.client_order_code !== metadata.clientOrderCode) {
        throw new BadGatewayException('Vận đơn GHN không khớp đơn nội bộ.');
      }
      const previous = objectValue(metadata.tracking);
      if (
        timestamp < Date.parse(String(previous.updatedAt)) ||
        (previous.terminal === true && previous.status !== detail.status)
      ) {
        return {
          orderId,
          orderStatus: current.status,
          shipment: current.shipment,
          ignoredStaleUpdate: true,
        };
      }
      const deliveredAt =
        metadata.deliveredAt ??
        (detail.status === 'delivered' ? new Date().toISOString() : undefined);
      const actualWeight = Number(detail.calculate_weight);
      const nextMetadata = {
        ...metadata,
        tracking: {
          status: detail.status,
          updatedAt: String(detail.updated_date),
          terminal: mapped.terminal,
          syncedAt: new Date().toISOString(),
          leadtime: detail.leadtime ?? null,
          log: detail.log ?? null,
          needsAttention: mapped.shipment === 'FAILED' || mapped.shipment === 'RETURNED',
        },
        ...(deliveredAt ? { deliveredAt } : {}),
        ...(carrierFee
          ? {
              actualCarrierFee: carrierFee.total,
              feeDifference: carrierFee.total - Number(current.shippingFee),
              feeDetail: carrierFee.detail,
              feeSyncedAt: new Date().toISOString(),
              differencePayer: 'SELLER',
            }
          : {}),
      };
      const shipment = await tx.shipment.update({
        where: { orderId },
        data: {
          status: mapped.shipment,
          metadata: nextMetadata as Prisma.InputJsonValue,
          ...(Number.isFinite(actualWeight) && actualWeight > 0
            ? { chargeableWeight: actualWeight / 1000 }
            : {}),
        },
      });
      const canAdvance = ![
        OrderStatus.CONFIRMED,
        OrderStatus.CANCELLED,
        OrderStatus.REFUNDED,
      ].includes(current.status as 'CONFIRMED' | 'CANCELLED' | 'REFUNDED');
      const status = mapped.order && canAdvance ? mapped.order : current.status;
      if (status !== current.status)
        await tx.order.update({ where: { id: orderId }, data: { status } });
      if (previous.status !== detail.status)
        await tx.notification.create({
          data: {
            userId: current.buyerId,
            type: NotificationType.ORDER,
            channel: NotificationChannel.IN_APP,
            title:
              detail.status === 'delivered'
                ? 'GHN xác nhận đã giao hàng'
                : 'Cập nhật vận chuyển GHN',
            content: `Đơn #${orderId.slice(0, 8)}: ${detail.status}. Mã vận đơn: ${waybill}.`,
          },
        });
      return {
        orderId,
        orderStatus: status,
        shipment,
        carrierStatus: detail.status,
        needsAttention: nextMetadata.tracking.needsAttention,
      };
    });
  }
}
