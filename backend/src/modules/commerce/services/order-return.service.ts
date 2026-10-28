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
import { AfterSalesRequestDto, ReceiveReturnDto, ReviewReturnDto } from '../dtos/after-sales.dto';
import { AfterSalesStoreService, isStaff } from './after-sales-store.service';
import { RefundService } from './refund.service';

@Injectable()
export class OrderReturnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly store: AfterSalesStoreService,
    private readonly ghn: GhnOrderApiService,
    private readonly actions: GhnOrderActionService,
    private readonly inventory: InventoryService,
    private readonly refunds: RefundService,
  ) {}

  async request(
    orderId: string,
    actor: ShipmentActor,
    dto: AfterSalesRequestDto,
  ): Promise<AfterSalesRequest> {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.store.lock(tx, orderId);
      if (order.buyerId !== actor.id)
        throw new ForbiddenException('Chỉ người mua được yêu cầu trả hàng.');
      if (order.afterSales) {
        if (order.afterSales.kind !== 'RETURN')
          throw new ConflictException('Đơn đã có yêu cầu hủy.');
        return order.afterSales;
      }
      if (
        !['SHIPPING', 'DELIVERED', 'CONFIRMED', 'PREPARING'].includes(order.status) ||
        !order.escrowRecord ||
        order.escrowRecord.status === 'REFUNDED'
      )
        throw new BadRequestException('Đơn chưa đủ điều kiện trả hàng.');
      if (order.dispute)
        throw new ConflictException('Đơn đã có khiếu nại; tiếp tục xử lý trên hồ sơ đó.');
      if (
        order.status === 'PREPARING' &&
        !['FAILED', 'RETURNED'].includes(order.shipment?.status ?? '')
      )
        throw new BadRequestException(
          'Đơn đang chuẩn bị; hãy dùng chức năng hủy trước khi GHN nhận hàng.',
        );
      if (['DELIVERED', 'CONFIRMED'].includes(order.status)) {
        const delivered = Date.parse(String(objectValue(order.shipment?.metadata).deliveredAt));
        if (
          !Number.isFinite(delivered) ||
          delivered > Date.now() ||
          Date.now() - delivered > 3 * 86400000
        )
          throw new BadRequestException(
            'Đã hết thời gian kiểm tra/trả hàng 3 ngày hoặc thiếu xác nhận giao hàng.',
          );
      } else if (!order.shipment?.waybillCode)
        throw new BadRequestException('Chưa có vận đơn để chuyển hoàn.');
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
      return request;
    });
  }

  async review(
    orderId: string,
    actor: ShipmentActor,
    dto: ReviewReturnDto,
  ): Promise<AfterSalesRequest> {
    const order = await this.prisma.$transaction(async (tx) => {
      const current = await this.store.lock(tx, orderId);
      if (actor.id !== current.sellerId && !isStaff(actor))
        throw new ForbiddenException('Chỉ shop hoặc nhân viên được duyệt trả hàng.');
      if (!current.afterSales || current.afterSales.kind !== 'RETURN')
        throw new BadRequestException('Không có yêu cầu trả hàng.');
      if (dto.decision === 'REJECT' && current.afterSales.status === 'APPROVING')
        throw new ConflictException('GHN đang xử lý chuyển hoàn. Cần đối soát trước.');
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
      if (!order.shipment?.waybillCode) throw new BadRequestException('Thiếu vận đơn GHN.');
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
      throw new ForbiddenException('Chỉ shop hoặc nhân viên được gắn vận đơn hoàn.');
    const context = shipmentGhnContext(order.shipment?.metadata);
    const detail = await this.ghn.detail(waybillCode, context.shopId, context.environment);
    if (detail.client_order_code !== `NX-RETURN-${orderId}`)
      throw new BadRequestException('Vận đơn hoàn không khớp đơn hàng.');
    return this.prisma.$transaction(async (tx) => {
      const current = await this.store.lock(tx, orderId);
      if (current.afterSales?.kind !== 'RETURN' || current.afterSales.status !== 'APPROVED')
        throw new BadRequestException('Yêu cầu trả hàng chưa được duyệt.');
      if (
        current.afterSales.returnWaybillCode &&
        current.afterSales.returnWaybillCode !== waybillCode
      )
        throw new ConflictException('Đã gắn vận đơn hoàn khác.');
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
    dto: ReceiveReturnDto,
  ): Promise<AfterSalesRequest> {
    const order = await this.store.view(orderId, actor);
    if (actor.id !== order.sellerId && !isStaff(actor))
      throw new ForbiddenException('Chỉ shop hoặc nhân viên được xác nhận hàng hoàn.');
    const request = order.afterSales;
    if (!request || request.kind !== 'RETURN')
      throw new BadRequestException('Không có yêu cầu trả hàng.');
    if (request.status === 'COMPLETED' || request.status === 'RECEIVED') return request;
    if (request.status !== 'APPROVED') throw new BadRequestException('Yêu cầu chưa được duyệt.');
    const code = request.returnWaybillCode || order.shipment?.waybillCode;
    if (!code) throw new BadRequestException('Thiếu vận đơn hoàn hàng.');
    const context = shipmentGhnContext(order.shipment?.metadata);
    const detail = await this.ghn.detail(code, context.shopId, context.environment);
    if (detail.status !== (request.returnWaybillCode ? 'delivered' : 'returned'))
      throw new BadRequestException('GHN chưa xác nhận hàng đã về shop.');
    if (request.returnWaybillCode && detail.client_order_code !== `NX-RETURN-${orderId}`)
      throw new BadRequestException('Vận đơn hoàn không khớp.');
    return this.prisma.$transaction(async (tx) => {
      const current = await this.store.lock(tx, orderId);
      if (current.afterSales?.status !== 'APPROVED')
        return tx.afterSalesRequest.findUniqueOrThrow({ where: { orderId } });
      if (current.afterSales.returnWaybillCode !== request.returnWaybillCode)
        throw new ConflictException('Vận đơn hoàn đã thay đổi.');
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
}
