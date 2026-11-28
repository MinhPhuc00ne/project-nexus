import {
  NotificationPublisher,
  publishNotification,
} from '../../../core/notifications/notification-publisher.service';
import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';

import { ProviderConfigService } from '../../../core/providers/provider-config.service';
import {
  NotificationChannel,
  NotificationType,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  Shipment,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { GhnOrderApiService, GhnOrderDetail } from './ghn-order-api.service';
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
    private readonly providers: ProviderConfigService,
    @Optional() private readonly notifications?: NotificationPublisher,
  ) {}

  async view(orderId: string, actor: ShipmentActor): Promise<TrackingResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { shipment: true },
    });
    if (!order) throw new NotFoundException('Order not found.');
    if (
      actor.id !== order.buyerId &&
      actor.id !== order.sellerId &&
      !['ADMIN', 'SUPPORT_STAFF'].includes(actor.role)
    ) {
      throw new ForbiddenException('You do not have permission to view this waybill.');
    }
    return { orderId, orderStatus: order.status, shipment: order.shipment };
  }

  async refresh(
    orderId: string,
    actor?: ShipmentActor,
    mockStatus?: string,
  ): Promise<TrackingResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { shipment: true },
    });
    if (!order) throw new NotFoundException('Order not found.');
    if (
      actor &&
      actor.id !== order.buyerId &&
      actor.id !== order.sellerId &&
      !['ADMIN', 'SUPPORT_STAFF'].includes(actor.role)
    ) {
      throw new ForbiddenException('You do not have permission to view this waybill.');
    }
    const waybill = order.shipment?.waybillCode;
    if (!waybill) throw new BadRequestException('Order does not have a confirmed GHN waybill yet.');
    const context = shipmentGhnContext(order.shipment?.metadata);
    // Simulated tracking is a sandbox feature, named in the environment,
    // rather than something every non-production deployment inherits.
    const isSandbox = this.providers.isShippingSandbox();
    const metadataBefore = objectValue(order.shipment?.metadata);
    const previousTracking = objectValue(metadataBefore.tracking);

    // In sandbox mode, use mockStatus if explicitly provided, or retain a
    // previously simulated status during an ordinary refresh (for example when
    // the buyer confirms delivery) so it does not reset to ready_to_pick.
    const effectiveStatus =
      isSandbox && mockStatus
        ? mockStatus
        : isSandbox && previousTracking.isSimulated && typeof previousTracking.status === 'string'
          ? String(previousTracking.status)
          : undefined;

    let detail: GhnOrderDetail;
    if (isSandbox && effectiveStatus) {
      detail = {
        order_code: waybill,
        client_order_code: String(metadataBefore.clientOrderCode ?? order.id),
        status: effectiveStatus,
        shop_id: context.shopId,
        updated_date: new Date().toISOString(),
        calculate_weight: 500,
      };
    } else {
      detail = (await this.ghn.detail(
        waybill,
        context.shopId,
        context.environment,
      )) as GhnOrderDetail;
    }

    const mapped = mapGhnStatus(String(detail.status));
    const timestamp = Date.parse(String(detail.updated_date));
    if (!Number.isFinite(timestamp) || timestamp > Date.now() + 60000) {
      throw new BadGatewayException('Invalid GHN update timestamp.');
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
        throw new BadRequestException('Waybill has changed.');
      const metadata = objectValue(current.shipment.metadata);
      if (metadata.clientOrderCode && detail.client_order_code !== metadata.clientOrderCode) {
        throw new BadGatewayException('GHN waybill does not match the internal order.');
      }
      const previous = objectValue(metadata.tracking);
      if (
        !mockStatus &&
        (timestamp < Date.parse(String(previous.updatedAt)) ||
          (previous.terminal === true && previous.status !== detail.status))
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
        (detail.status === 'delivered' ? new Date(timestamp).toISOString() : undefined);
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
          isSimulated: Boolean(isSandbox && effectiveStatus),
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
      if (mapped.shipment === 'DELIVERED' && tx.payment) {
        await tx.payment.updateMany({
          where: { orderId, provider: PaymentProvider.COD, status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.SUCCESS },
        });
      }
      if (previous.status !== detail.status) {
        if (tx.eventLog) {
          await tx.eventLog.create({
            data: {
              eventName: 'order.shipment-updated',
              payload: {
                orderId,
                waybillCode: waybill,
                carrierStatus: detail.status,
                previousCarrierStatus: previous.status ?? null,
                shipmentStatus: mapped.shipment,
                orderStatus: status,
              },
            },
          });
        }
        await publishNotification(
          tx,
          {
            userId: current.buyerId,
            type: NotificationType.ORDER,
            channel: NotificationChannel.IN_APP,
            title:
              mapped.shipment === 'DELIVERED' ? 'GHN confirmed delivery' : 'GHN shipping update',
            content: `Order #${orderId.slice(0, 8)}: ${detail.status}. Waybill code: ${waybill}.`,
          },
          this.notifications,
        );
      }
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
