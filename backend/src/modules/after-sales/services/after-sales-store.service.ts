import {
  NotificationPublisher,
  publishNotification,
} from '../../../core/notifications/notification-publisher.service';
import { ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { AppErrorCode } from '@nexus/contracts';
import { AfterSalesRequest, OrderRefund, Prisma } from '@prisma/client';
import { AuditLogService } from '../../../core/audit/audit-log.service';
import { QueryAfterSalesInput, QueryRefundsInput } from '../dtos/after-sales.dto';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ReputationService } from '../../users/services/reputation.service';
import { ShipmentActor } from '../../fulfillment/services/shipment-tracking.service';

export const afterSalesInclude = {
  shipment: true,
  escrowRecord: true,
  dispute: true,
  afterSales: true,
  refunds: true,
} satisfies Prisma.OrderInclude;
export type AfterSalesOrder = Prisma.OrderGetPayload<{ include: typeof afterSalesInclude }>;
export const isStaff = (actor: ShipmentActor): boolean =>
  ['ADMIN', 'SUPPORT_STAFF'].includes(actor.role);

@Injectable()
export class AfterSalesStoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reputation: ReputationService,
    @Optional() private readonly notifications?: NotificationPublisher,
    @Optional() private readonly auditLog?: AuditLogService,
  ) {}

  async lock(tx: Prisma.TransactionClient, orderId: string): Promise<AfterSalesOrder> {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id: orderId }, include: afterSalesInclude });
    if (!order) {
      throw new NotFoundException({
        message: 'Không tìm thấy đơn hàng.',
        errorCode: AppErrorCode.NOT_FOUND,
      });
    }
    return order;
  }

  authorize(order: AfterSalesOrder, actor: ShipmentActor): void {
    if (actor.id !== order.buyerId && actor.id !== order.sellerId && !isStaff(actor))
      throw new ForbiddenException({
        message: 'Bạn không có quyền thao tác đơn hàng này.',
        errorCode: AppErrorCode.FORBIDDEN,
      });
  }

  async view(orderId: string, actor: ShipmentActor): Promise<AfterSalesOrder> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: afterSalesInclude,
    });
    if (!order) {
      throw new NotFoundException({
        message: 'Không tìm thấy đơn hàng.',
        errorCode: AppErrorCode.NOT_FOUND,
      });
    }
    this.authorize(order, actor);
    return order;
  }

  async audit(
    tx: Prisma.TransactionClient,
    order: AfterSalesOrder,
    actor: ShipmentActor,
    action: string,
    detail: Prisma.InputJsonObject = {},
  ): Promise<void> {
    if (this.auditLog) {
      await this.auditLog.record(
        {
          eventName: `order.${action}`,
          operatorId: actor.id,
          payload: { orderId: order.id, ...detail },
        },
        tx,
      );
    } else {
      await tx.eventLog.create({
        data: {
          eventName: `order.${action}`,
          operatorId: actor.id,
          payload: { orderId: order.id, ...detail },
        },
      });
    }
    for (const userId of [order.buyerId, order.sellerId]) {
      await publishNotification(
        tx,
        {
          userId,
          type: 'ORDER',
          channel: 'IN_APP',
          title: 'Cập nhật hủy/trả hàng',
          content: `Đơn #${order.id.slice(0, 8)}: ${action}.`,
        },
        this.notifications,
      );
    }
  }

  async listDisputes(
    buyerId: string,
  ): Promise<Prisma.DisputeGetPayload<{ include: { order: true } }>[]> {
    return this.prisma.dispute.findMany({
      where: { openedByUserId: buyerId },
      include: { order: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listRequests(
    actor: ShipmentActor,
    query: QueryAfterSalesInput,
  ): Promise<{ items: AfterSalesRequest[]; total: number; page: number; limit: number }> {
    const where: Prisma.AfterSalesRequestWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(!isStaff(actor)
        ? { order: { OR: [{ buyerId: actor.id }, { sellerId: actor.id }] } }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.afterSalesRequest.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.afterSalesRequest.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async listRefunds(
    actor: ShipmentActor,
    query: QueryRefundsInput,
  ): Promise<{ items: OrderRefund[]; total: number; page: number; limit: number }> {
    if (!isStaff(actor)) {
      throw new ForbiddenException({
        message: 'Chỉ nhân viên được xem hàng đợi hoàn tiền.',
        errorCode: AppErrorCode.FORBIDDEN,
      });
    }
    const where = { status: query.status };
    const [items, total] = await Promise.all([
      this.prisma.orderRefund.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.orderRefund.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async penalizeSeller(
    tx: Prisma.TransactionClient,
    sellerId: string,
    orderId: string,
  ): Promise<void> {
    await this.reputation.adjustScore(
      {
        userId: sellerId,
        deltaPoints: -10,
        penaltyType: 'ORDER_CANCELLATION',
        reason: 'Hủy đơn do lỗi người bán',
        referenceId: orderId,
      },
      tx,
    );
  }
}
