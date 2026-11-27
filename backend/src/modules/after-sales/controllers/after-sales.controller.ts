import { UuidParamSchema } from '@nexus/contracts';
import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodQuery, ZodParam } from '@nexus/contracts/nest';
import { AfterSalesRequest, OrderRefund, Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { AuthenticatedUserPayload, CurrentUser } from '../../../core/security/roles.decorator';
import {
  AfterSalesRequestInput,
  AfterSalesRequestSchema,
  CancelOrderInput,
  CancelOrderSchema,
  CompleteRefundInput,
  CompleteRefundSchema,
  QueryAfterSalesInput,
  QueryAfterSalesSchema,
  QueryRefundsInput,
  QueryRefundsSchema,
  ReceiveReturnInput,
  ReceiveReturnSchema,
  ReturnWaybillInput,
  ReturnWaybillSchema,
  ReviewReturnInput,
  ReviewReturnSchema,
} from '../dtos/after-sales.dto';
import { AfterSalesOrder, AfterSalesStoreService } from '../services/after-sales-store.service';
import { OrderCancellationService } from '../services/order-cancellation.service';
import { OrderReturnService } from '../services/order-return.service';
import { RefundService } from '../services/refund.service';

@ApiTags('8. COMMERCE - CANCELLATIONS & RETURNS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('commerce')
export class AfterSalesController {
  constructor(
    private readonly store: AfterSalesStoreService,
    private readonly cancellations: OrderCancellationService,
    private readonly returns: OrderReturnService,
    private readonly refunds: RefundService,
  ) {}

  @Get('after-sales')
  list(
    @CurrentUser() actor: AuthenticatedUserPayload,
    @ZodQuery(QueryAfterSalesSchema) query: QueryAfterSalesInput,
  ): ReturnType<AfterSalesStoreService['listRequests']> {
    return this.store.listRequests(actor, query);
  }

  @Get('refunds')
  pendingRefunds(
    @CurrentUser() actor: AuthenticatedUserPayload,
    @ZodQuery(QueryRefundsSchema) query: QueryRefundsInput,
  ): ReturnType<AfterSalesStoreService['listRefunds']> {
    return this.store.listRefunds(actor, query);
  }

  @Get('disputes')
  @ApiOperation({ summary: 'Danh sách khiếu nại thật của người mua' })
  disputes(
    @CurrentUser('id') buyerId: string,
  ): Promise<Prisma.DisputeGetPayload<{ include: { order: true } }>[]> {
    return this.store.listDisputes(buyerId);
  }

  @Get('orders/:id/after-sales')
  view(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<AfterSalesOrder> {
    return this.store.view(id, actor);
  }

  @Post('orders/:id/cancel')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Hủy trước khi GHN lấy hàng; buyer cần Admin duyệt nếu seller đã xác nhận',
  })
  cancel(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser() actor: AuthenticatedUserPayload,
    @ZodBody(CancelOrderSchema) dto: CancelOrderInput,
  ): Promise<AfterSalesRequest> {
    return this.cancellations.cancel(id, actor, dto);
  }

  @Post('orders/:id/cancel/review')
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin duyệt hoặc từ chối yêu cầu hủy của người mua' })
  reviewCancellation(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser() actor: AuthenticatedUserPayload,
    @ZodBody(ReviewReturnSchema) dto: ReviewReturnInput,
  ): Promise<AfterSalesRequest> {
    return this.cancellations.review(id, actor, dto);
  }

  @Post('orders/:id/returns')
  @ApiOperation({
    summary: 'Yêu cầu trả toàn bộ đơn, trong 3 ngày sau giao hàng theo chính sách sàn',
  })
  request(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser() actor: AuthenticatedUserPayload,
    @ZodBody(AfterSalesRequestSchema) dto: AfterSalesRequestInput,
  ): Promise<AfterSalesRequest> {
    return this.returns.request(id, actor, dto);
  }

  @Post('orders/:id/returns/review')
  @HttpCode(200)
  review(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser() actor: AuthenticatedUserPayload,
    @ZodBody(ReviewReturnSchema) dto: ReviewReturnInput,
  ): Promise<AfterSalesRequest> {
    return this.returns.review(id, actor, dto);
  }

  @Post('orders/:id/returns/waybill')
  @HttpCode(200)
  waybill(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser() actor: AuthenticatedUserPayload,
    @ZodBody(ReturnWaybillSchema) dto: ReturnWaybillInput,
  ): Promise<AfterSalesRequest> {
    return this.returns.attachWaybill(id, actor, dto.waybillCode);
  }

  @Post('orders/:id/returns/receive')
  @HttpCode(200)
  receive(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser() actor: AuthenticatedUserPayload,
    @ZodBody(ReceiveReturnSchema) dto: ReceiveReturnInput,
  ): Promise<AfterSalesRequest> {
    return this.returns.receive(id, actor, dto);
  }

  @Post('refunds/:id/complete')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Admin xác nhận đã chuyển khoản hoàn tiền về nguồn, kèm mã đối soát duy nhất',
  })
  complete(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser() actor: AuthenticatedUserPayload,
    @ZodBody(CompleteRefundSchema) dto: CompleteRefundInput,
  ): Promise<OrderRefund> {
    return this.refunds.complete(id, actor, dto.externalReference);
  }
}
