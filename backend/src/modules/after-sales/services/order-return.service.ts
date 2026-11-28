import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppErrorCode } from '@nexus/contracts';
import { AfterSalesRequest, NotificationType } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ProviderConfigService } from '../../../core/providers/provider-config.service';
import { notifyAllAdmins } from '../../../core/notifications/admin-notification.util';
import { NotificationPublisher } from '../../../core/notifications/notification-publisher.service';
import { ShipmentActor } from '../../fulfillment/services/shipment-tracking.service';
import { GhnOrderApiService } from '../../fulfillment/services/ghn-order-api.service';
import {
  GhnActionRejectedException,
  GhnOrderActionService,
} from '../../fulfillment/services/ghn-order-action.service';
import { shipmentGhnContext } from '../../fulfillment/services/ghn-context';
import { objectValue } from '../../fulfillment/services/shipment-state';
import { InventoryService } from '../../catalog/services/inventory.service';
import {
  AfterSalesRequestInput,
  ReceiveReturnInput,
  ReviewReturnInput,
} from '../dtos/after-sales.dto';
import { AfterSalesStoreService, isStaff } from './after-sales-store.service';
import { RefundService } from './refund.service';

@Injectable()
export class OrderReturnService {
  private readonly logger = new Logger(OrderReturnService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly store: AfterSalesStoreService,
    private readonly ghn: GhnOrderApiService,
    private readonly actions: GhnOrderActionService,
    private readonly inventory: InventoryService,
    private readonly refunds: RefundService,
    private readonly providers: ProviderConfigService,
    @Optional() private readonly notifications?: NotificationPublisher,
  ) {}

  async request(
    orderId: string,
    actor: ShipmentActor,
    dto: AfterSalesRequestInput,
  ): Promise<AfterSalesRequest> {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.store.lock(tx, orderId);
      if (order.buyerId !== actor.id)
        throw new ForbiddenException('Only the buyer may request a return.');
      if (order.afterSales) {
        if (order.afterSales.kind !== 'RETURN')
          throw new ConflictException({
            message: 'Order already has a cancellation request.',
            errorCode: AppErrorCode.CONFLICT,
          });
        return order.afterSales;
      }
      if (
        !['SHIPPING', 'DELIVERED', 'CONFIRMED', 'PREPARING'].includes(order.status) ||
        !order.escrowRecord ||
        order.escrowRecord.status === 'REFUNDED'
      )
        throw new BadRequestException('Order is not eligible for a return.');
      if (order.dispute)
        throw new ConflictException({
          message: 'Order already has an open dispute; continue handling it on that dispute.',
          errorCode: AppErrorCode.DISPUTE_ALREADY_EXISTS,
        });
      if (
        order.status === 'PREPARING' &&
        !['FAILED', 'RETURNED'].includes(order.shipment?.status ?? '')
      )
        throw new BadRequestException(
          'Order is still preparing; please use cancellation before GHN pickup.',
        );
      if (['DELIVERED', 'CONFIRMED'].includes(order.status)) {
        const delivered = Date.parse(String(objectValue(order.shipment?.metadata).deliveredAt));
        if (
          !Number.isFinite(delivered) ||
          delivered > Date.now() ||
          Date.now() - delivered > 3 * 86400000
        )
          throw new BadRequestException(
            'The 3-day inspection/return window has expired or delivery confirmation is missing.',
          );
      } else if (!order.shipment?.waybillCode)
        throw new BadRequestException('No waybill exists to initiate a return.');
      const request = await tx.afterSalesRequest.create({
        data: {
          orderId,
          kind: 'RETURN',
          requestedBy: actor.id,
          reason: dto.reason,
          evidenceUrls: dto.evidenceUrls ?? [],
          refundToWallet: dto.refundToWallet ?? false,
        },
      });
      if (order.escrowRecord.status === 'HELD')
        await tx.escrowRecord.update({ where: { orderId }, data: { status: 'DISPUTED' } });
      await this.store.audit(tx, order, actor, 'return-requested');
      await notifyAllAdmins(
        tx,
        {
          title: 'New return / refund request',
          content: `Order #${orderId.slice(0, 8)} has a return request from the buyer: ${dto.reason}.`,
          type: NotificationType.ORDER,
          targetUrl: '/admin/refunds',
        },
        this.notifications,
      );
      return request;
    });
  }

  async review(
    orderId: string,
    actor: ShipmentActor,
    dto: ReviewReturnInput,
  ): Promise<AfterSalesRequest> {
    const order = await this.prisma.$transaction(async (tx) => {
      const current = await this.store.lock(tx, orderId);
      if (actor.id !== current.sellerId && !isStaff(actor))
        throw new ForbiddenException('Only the shop or support staff may review return requests.');
      if (!current.afterSales || current.afterSales.kind !== 'RETURN')
        throw new BadRequestException('No return request found.');
      if (dto.decision === 'REJECT' && current.afterSales.status === 'APPROVING')
        throw new ConflictException({
          message: 'GHN is currently processing the return. Reconciliation required first.',
          errorCode: AppErrorCode.CONFLICT,
        });
      if (dto.decision === 'APPROVE' && current.afterSales.status === 'REQUESTED') {
        await tx.afterSalesRequest.update({
          where: { orderId },
          data: { status: 'APPROVING', reviewedBy: actor.id, decisionReason: dto.reason },
        });
      }
      return current;
    });
    if (!['REQUESTED', 'APPROVING'].includes(order.afterSales?.status ?? ''))
      return this.prisma.afterSalesRequest.findUniqueOrThrow({ where: { orderId } });
    if (
      dto.decision === 'APPROVE' &&
      !['DELIVERED', 'CONFIRMED'].includes(order.status) &&
      ['REQUESTED', 'APPROVING'].includes(order.afterSales?.status ?? '')
    ) {
      if (!order.shipment?.waybillCode) throw new BadRequestException('Missing GHN waybill.');
      const context = shipmentGhnContext(order.shipment.metadata);
      const detail = await this.ghn.detail(
        order.shipment.waybillCode,
        context.shopId,
        context.environment,
      );
      if (
        !['returned', 'return', 'returning', 'return_transporting', 'return_sorting'].includes(
          detail.status,
        )
      ) {
        try {
          await this.actions.change('return', order.shipment);
        } catch (error) {
          // A definitive refusal permits review again; a timeout keeps APPROVING for reconciliation.
          if (error instanceof GhnActionRejectedException)
            await this.prisma.$transaction(async (tx) => {
              await this.store.lock(tx, orderId);
              await tx.afterSalesRequest.updateMany({
                where: { orderId, status: 'APPROVING' },
                data: { status: 'REQUESTED' },
              });
            });
          throw error;
        }
      }
    }
    return this.prisma.$transaction(async (tx) => {
      const current = await this.store.lock(tx, orderId);
      if (!current.afterSales || !['REQUESTED', 'APPROVING'].includes(current.afterSales.status))
        return tx.afterSalesRequest.findUniqueOrThrow({ where: { orderId } });
      const result = await tx.afterSalesRequest.update({
        where: { orderId },
        data: {
          status: dto.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          decisionReason: dto.reason,
          reviewedBy: actor.id,
        },
      });
      if (
        dto.decision === 'REJECT' &&
        current.escrowRecord?.status === 'DISPUTED' &&
        !current.dispute
      )
        await tx.escrowRecord.update({ where: { orderId }, data: { status: 'HELD' } });
      await this.store.audit(tx, current, actor, `return-${dto.decision.toLowerCase()}`, {
        reason: dto.reason,
      });
      return result;
    });
  }

  async attachWaybill(
    orderId: string,
    actor: ShipmentActor,
    waybillCode: string,
  ): Promise<AfterSalesRequest> {
    const order = await this.store.view(orderId, actor);
    if (actor.id !== order.sellerId && !isStaff(actor))
      throw new ForbiddenException('Only the shop or support staff may attach a return waybill.');
    const context = shipmentGhnContext(order.shipment?.metadata);
    const detail = await this.ghn.detail(waybillCode, context.shopId, context.environment);
    if (detail.client_order_code !== `NX-RETURN-${orderId}`)
      throw new BadRequestException('Return waybill does not match this order.');
    return this.prisma.$transaction(async (tx) => {
      const current = await this.store.lock(tx, orderId);
      if (current.afterSales?.kind !== 'RETURN' || current.afterSales.status !== 'APPROVED')
        throw new BadRequestException('Return request has not been approved.');
      if (
        current.afterSales.returnWaybillCode &&
        current.afterSales.returnWaybillCode !== waybillCode
      )
        throw new ConflictException({
          message: 'A different return waybill is already attached.',
          errorCode: AppErrorCode.CONFLICT,
        });
      await this.store.audit(tx, current, actor, 'return-waybill-attached', { waybillCode });
      return tx.afterSalesRequest.update({
        where: { orderId },
        data: { returnWaybillCode: waybillCode },
      });
    });
  }

  async receive(
    orderId: string,
    actor: ShipmentActor,
    dto: ReceiveReturnInput,
  ): Promise<AfterSalesRequest> {
    const order = await this.store.view(orderId, actor);
    if (actor.id !== order.sellerId && !isStaff(actor))
      throw new ForbiddenException(
        'Only the shop or support staff may confirm returned goods receipt.',
      );
    const request = order.afterSales;
    if (!request || request.kind !== 'RETURN')
      throw new BadRequestException('No return request found.');
    if (request.status === 'COMPLETED' || request.status === 'RECEIVED') return request;
    if (request.status !== 'APPROVED')
      throw new BadRequestException('Return request has not been approved.');
    const code = request.returnWaybillCode || order.shipment?.waybillCode;
    if (!code) throw new BadRequestException('Missing return waybill.');
    const context = shipmentGhnContext(order.shipment?.metadata);
    const metadata = objectValue(order.shipment?.metadata);
    const tracking = objectValue(metadata.tracking);
    const simulatedReturned =
      this.providers.isShippingSandbox() &&
      (order.shipment?.status === 'RETURNED' || tracking.status === 'returned');

    let detailStatus: string;
    if (simulatedReturned) {
      detailStatus = request.returnWaybillCode ? 'delivered' : 'returned';
    } else {
      const detail = await this.ghn.detail(code, context.shopId, context.environment);
      detailStatus = detail.status;
      if (request.returnWaybillCode && detail.client_order_code !== `NX-RETURN-${orderId}`)
        throw new BadRequestException('Return waybill does not match.');
    }
    if (detailStatus !== (request.returnWaybillCode ? 'delivered' : 'returned'))
      throw new BadRequestException(
        'GHN has not confirmed that the return parcel arrived at the shop.',
      );
    return this.prisma.$transaction(async (tx) => {
      const current = await this.store.lock(tx, orderId);
      if (current.afterSales?.status !== 'APPROVED')
        return tx.afterSalesRequest.findUniqueOrThrow({ where: { orderId } });
      if (current.afterSales.returnWaybillCode !== request.returnWaybillCode)
        throw new ConflictException({
          message: 'Return waybill has changed.',
          errorCode: AppErrorCode.CONFLICT,
        });
      await tx.afterSalesRequest.update({
        where: { orderId },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date(),
          restockedAt: dto.restock ? new Date() : null,
        },
      });
      if (dto.restock) await this.inventory.restoreCommitted(tx, orderId, 'ORDER_RETURNED');
      await this.refunds.issue(tx, current, request.refundToWallet);
      await this.store.audit(tx, current, actor, 'return-received', {
        restock: dto.restock,
        reason: dto.reason,
      });
      return tx.afterSalesRequest.findUniqueOrThrow({ where: { orderId } });
    });
  }

  @OnEvent('return.shipment.delivered')
  async handleReturnDelivered(payload: {
    orderId: string;
    returnWaybillCode: string;
    sellerId: string;
  }): Promise<void> {
    try {
      await this.receive(
        payload.orderId,
        { id: payload.sellerId, role: 'SELLER' },
        { restock: true, reason: `GHN confirmed parcel return (${payload.returnWaybillCode})` },
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Skip auto-receive return for order ${payload.orderId}: ${message}`);
    }
  }
}
