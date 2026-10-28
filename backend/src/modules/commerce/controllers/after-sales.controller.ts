import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AfterSalesRequest, OrderRefund, Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { AuthenticatedUserPayload, CurrentUser } from '../../../core/security/roles.decorator';
import {
  AfterSalesRequestDto,
  CancelOrderDto,
  CompleteRefundDto,
  ReceiveReturnDto,
  ReturnWaybillDto,
  ReviewReturnDto,
  QueryAfterSalesDto,
  QueryRefundsDto,
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
    @Query() query: QueryAfterSalesDto,
  ): ReturnType<AfterSalesStoreService['listRequests']> {
    return this.store.listRequests(actor, query);
  }

  @Get('refunds')
  pendingRefunds(
    @CurrentUser() actor: AuthenticatedUserPayload,
    @Query() query: QueryRefundsDto,
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
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUserPayload,
  ): Promise<AfterSalesOrder> {
    return this.store.view(id, actor);
  }

  @Post('orders/:id/cancel')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Hủy toàn bộ đơn trước khi GHN lấy hàng; hoàn tiền và hoàn kho chống lặp',
  })
  cancel(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUserPayload,
    @Body() dto: CancelOrderDto,
  ): Promise<AfterSalesRequest> {
    return this.cancellations.cancel(id, actor, dto);
  }

  @Post('orders/:id/returns')
  @ApiOperation({
    summary: 'Yêu cầu trả toàn bộ đơn, trong 3 ngày sau giao hàng theo chính sách sàn',
  })
  request(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUserPayload,
    @Body() dto: AfterSalesRequestDto,
  ): Promise<AfterSalesRequest> {
    return this.returns.request(id, actor, dto);
  }

  @Post('orders/:id/returns/review')
  @HttpCode(200)
  review(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUserPayload,
    @Body() dto: ReviewReturnDto,
  ): Promise<AfterSalesRequest> {
    return this.returns.review(id, actor, dto);
  }

  @Post('orders/:id/returns/waybill')
  @HttpCode(200)
  waybill(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUserPayload,
    @Body() dto: ReturnWaybillDto,
  ): Promise<AfterSalesRequest> {
    return this.returns.attachWaybill(id, actor, dto.waybillCode);
  }

  @Post('orders/:id/returns/receive')
  @HttpCode(200)
  receive(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUserPayload,
    @Body() dto: ReceiveReturnDto,
  ): Promise<AfterSalesRequest> {
    return this.returns.receive(id, actor, dto);
  }

  @Post('refunds/:id/complete')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Admin xác nhận đã chuyển khoản hoàn tiền về nguồn, kèm mã đối soát duy nhất',
  })
  complete(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUserPayload,
    @Body() dto: CompleteRefundDto,
  ): Promise<OrderRefund> {
    return this.refunds.complete(id, actor, dto.externalReference);
  }
}
