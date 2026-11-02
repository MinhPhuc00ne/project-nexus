import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AfterSalesRequest } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ShipmentActor } from '../../fulfillment/services/shipment-tracking.service';
import { GhnOrderApiService } from '../../fulfillment/services/ghn-order-api.service';
import {
  GhnActionRejectedException,
  GhnOrderActionService,
} from '../../fulfillment/services/ghn-order-action.service';
import { shipmentGhnContext } from '../../fulfillment/services/ghn-context';
import { objectValue } from '../../fulfillment/services/shipment-state';
import { InventoryService } from '../../catalog/services/inventory.service';
import { CancelOrderDto, ReviewReturnDto } from '../dtos/after-sales.dto';
import { AfterSalesStoreService } from './after-sales-store.service';
import { RefundService } from './refund.service';

@Injectable()
export class OrderCancellationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly store: AfterSalesStoreService,
    private readonly ghn: GhnOrderApiService,
    private readonly actions: GhnOrderActionService,
    private readonly inventory: InventoryService,
    private readonly refunds: RefundService,
  ) {}

  async cancel(
    orderId: string,
    actor: ShipmentActor,
    dto: CancelOrderDto,
  ): Promise<AfterSalesRequest> {
    const order = await this.prisma.$transaction(async (tx) => {
      const current = await this.store.lock(tx, orderId);
      this.store.authorize(current, actor);
      if (current.status === 'CANCELLED') return current;
      if (!['PENDING_PAYMENT', 'PAID', 'PREPARING'].includes(current.status))
        throw new BadRequestException(
          'Chỉ hủy trước khi GHN nhận hàng. Đơn đang giao cần yêu cầu trả hàng.',
        );
      if (current.dispute || (current.afterSales && current.afterSales.kind !== 'CANCEL'))
        throw new ConflictException('Đơn đang có yêu cầu khiếu nại/trả hàng.');
      if (
        current.afterSales?.requestedBy === current.buyerId &&
        ['REQUESTED', 'APPROVING'].includes(current.afterSales.status) &&
        current.status === 'PREPARING' &&
        actor.id !== current.buyerId &&
        actor.role !== 'ADMIN'
      )
        throw new ForbiddenException('Yêu cầu hủy của người mua cần Admin xác nhận.');
      const state = objectValue(current.shipment?.metadata).dispatchState;
      if (!current.shipment?.waybillCode && state && state !== 'REJECTED')
        throw new ConflictException('Cần đối soát yêu cầu tạo vận đơn đang xử lý trước khi hủy.');
      await tx.afterSalesRequest.upsert({
        where: { orderId },
        update:
          current.afterSales?.status === 'REJECTED'
            ? {
                status: 'REQUESTED',
                requestedBy: actor.id,
                reason: dto.reason,
                refundToWallet: actor.id === current.buyerId && dto.refundToWallet === true,
                reviewedBy: null,
                decisionReason: null,
              }
            : {},
        create: {
          orderId,
          kind: 'CANCEL',
          requestedBy: actor.id,
          reason: dto.reason,
          refundToWallet: actor.id === current.buyerId && dto.refundToWallet === true,
        },
      });
      await this.store.audit(tx, current, actor, 'cancellation-requested', { reason: dto.reason });
      return current;
    });
    if (order.status === 'CANCELLED')
      return this.prisma.afterSalesRequest.findUniqueOrThrow({ where: { orderId } });
    // Recording a request also blocks seller confirmation/dispatch while Admin reviews it.
    if (actor.id === order.buyerId && order.status === 'PREPARING')
      return this.prisma.afterSalesRequest.findUniqueOrThrow({ where: { orderId } });
    const shipment = order.shipment;
    if (shipment?.waybillCode) {
      try {
        const context = shipmentGhnContext(shipment.metadata);
        const detail = await this.ghn.detail(
          shipment.waybillCode,
          context.shopId,
          context.environment,
        );
        if (detail.status !== 'cancel') {
          if (!['ready_to_pick', 'picking', 'money_collect_picking'].includes(detail.status))
            throw new GhnActionRejectedException('GHN đã nhận hàng; cần dùng yêu cầu trả hàng.');
          await this.actions.change('cancel', shipment, dto.reason);
        }
      } catch (error) {
        if (error instanceof GhnActionRejectedException)
          await this.prisma.$transaction(async (tx) => {
            await this.store.lock(tx, orderId);
            await tx.afterSalesRequest.updateMany({
              where: { orderId, status: { in: ['REQUESTED', 'APPROVING'] } },
              data: { status: 'REJECTED', decisionReason: error.message },
            });
          });
        throw error;
      }
    }
    return this.prisma.$transaction(async (tx) => {
      const current = await this.store.lock(tx, orderId);
      if (current.status === 'CANCELLED')
        return tx.afterSalesRequest.findUniqueOrThrow({ where: { orderId } });
      if (!['PENDING_PAYMENT', 'PAID', 'PREPARING'].includes(current.status))
        throw new ConflictException(
          'Trạng thái đơn đã thay đổi; cần đối soát trước khi hoàn tiền.',
        );
      await tx.afterSalesRequest.update({ where: { orderId }, data: { status: 'APPROVED' } });
      if (current.escrowRecord)
        await this.refunds.issue(tx, current, current.afterSales?.refundToWallet === true);
      await this.inventory.releaseReservation(tx, orderId);
      await this.inventory.restoreCommitted(tx, orderId, 'ORDER_CANCELLED');
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancellationActor:
            actor.id === current.sellerId
              ? 'SELLER'
              : actor.id === current.buyerId
                ? 'BUYER'
                : 'ADMIN',
        },
      });
      if (shipment)
        await tx.shipment.update({
          where: { orderId },
          data: {
            status: 'FAILED',
            metadata: {
              ...objectValue(current.shipment?.metadata),
              tracking: { status: 'cancel', terminal: true, updatedAt: new Date().toISOString() },
            },
          },
        });
      await tx.afterSalesRequest.update({
        where: { orderId },
        data: {
          status:
            current.escrowRecord &&
            (await tx.orderRefund.count({ where: { orderId, status: 'PENDING' } })) > 0
              ? 'APPROVED'
              : 'COMPLETED',
        },
      });
      if (
        (actor.id === current.sellerId || ['ADMIN', 'SUPPORT_STAFF'].includes(actor.role)) &&
        ['STOCKOUT', 'SELLER_FAULT'].includes(dto.reasonCode ?? '')
      )
        await this.store.penalizeSeller(tx, current.sellerId, orderId);
      await this.store.audit(tx, current, actor, 'cancelled', {
        reasonCode: dto.reasonCode ?? 'OTHER',
      });
      return tx.afterSalesRequest.findUniqueOrThrow({ where: { orderId } });
    });
  }

  async review(
    orderId: string,
    actor: ShipmentActor,
    dto: ReviewReturnDto,
  ): Promise<AfterSalesRequest> {
    if (actor.role !== 'ADMIN')
      throw new ForbiddenException('Chỉ Admin được duyệt yêu cầu hủy đơn.');
    const request = await this.prisma.$transaction(async (tx) => {
      const current = await this.store.lock(tx, orderId);
      const pending = current.afterSales;
      if (!pending || pending.kind !== 'CANCEL' || pending.requestedBy !== current.buyerId)
        throw new BadRequestException('Không có yêu cầu hủy của người mua để duyệt.');
      if (current.status === 'CANCELLED' && dto.decision === 'APPROVE') return pending;
      if (!['REQUESTED', 'APPROVING'].includes(pending.status))
        throw new ConflictException('Yêu cầu hủy đã được xử lý.');
      if (pending.status === 'APPROVING' && dto.decision === 'REJECT')
        throw new ConflictException('Yêu cầu đang được hủy và đối soát GHN.');
      if (!['PENDING_PAYMENT', 'PAID', 'PREPARING'].includes(current.status))
        throw new ConflictException('Đơn đã chuyển trạng thái; cần đối soát trước khi hủy.');
      const updated = await tx.afterSalesRequest.update({
        where: { orderId },
        data: {
          status: dto.decision === 'APPROVE' ? 'APPROVING' : 'REJECTED',
          reviewedBy: actor.id,
          decisionReason: dto.reason,
        },
      });
      await this.store.audit(tx, current, actor, 'cancellation-reviewed', {
        decision: dto.decision,
        reason: dto.reason,
      });
      return updated;
    });
    if (dto.decision === 'REJECT' || ['APPROVED', 'COMPLETED'].includes(request.status))
      return request;
    // Consent belongs to the original buyer request, not the reviewing administrator.
    return this.cancel(orderId, actor, { reason: request.reason });
  }
}
