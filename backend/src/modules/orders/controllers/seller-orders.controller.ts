import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodQuery, ZodParam } from '@nexus/contracts/nest';
import { Role, UuidParamSchema } from '@nexus/contracts';
import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';

import {
  DispatchGhnOrderInput,
  DispatchGhnOrderSchema,
} from '../../fulfillment/dtos/dispatch-ghn-order.dto';
import { SellerOrdersService } from '../services/seller-orders.service';
import { GhnDispatchService } from '../../fulfillment/services/ghn-dispatch.service';
import { ShipmentTrackingService } from '../../fulfillment/services/shipment-tracking.service';
import { QuerySellerOrdersInput, QuerySellerOrdersSchema } from '../dtos/seller-order.dto';

@ApiTags('8. COMMERCE - SELLER ORDERS & GHN')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SELLER, Role.ADMIN)
@Controller('seller/orders')
export class SellerOrdersController {
  constructor(
    private readonly sellerOrdersService: SellerOrdersService,
    private readonly dispatch: GhnDispatchService,
    private readonly tracking: ShipmentTrackingService,
  ) {}

  @Get(':id/ghn-label')
  @ApiOperation({ summary: '[SELLER] Get official GHN shipping label URL (A5, 80x80, 52x70)' })
  ghnLabel(
    @CurrentUser('id') sellerId: string,
    @ZodParam('id', UuidParamSchema) id: string,
  ): ReturnType<GhnDispatchService['label']> {
    return this.dispatch.label(sellerId, id);
  }

  @Post(':id/shipping-quote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] Preview GHN fee for actual package dimensions and seller fee delta',
  })
  shippingQuote(
    @CurrentUser('id') sellerId: string,
    @ZodParam('id', UuidParamSchema) id: string,
    @ZodBody(DispatchGhnOrderSchema) dto: DispatchGhnOrderInput,
  ) {
    return this.dispatch.preview(sellerId, id, dto);
  }

  @Post(':id/reconcile-ghn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] Reconcile an interrupted GHN waybill request without recreating it',
  })
  async reconcile(
    @CurrentUser('id') sellerId: string,
    @ZodParam('id', UuidParamSchema) id: string,
  ) {
    await this.dispatch.reconcile(sellerId, id);
    return this.tracking.refresh(id, { id: sellerId, role: 'SELLER' });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] List seller orders with pagination and status counters',
    description:
      'Supports filtering by status (PAID, PREPARING, SHIPPING, DELIVERED, CONFIRMED, CANCELLED, REFUNDED), searching by order code or customer name/phone, and returns per-status counters.',
  })
  @ApiResponse({ status: 200, description: 'Seller orders retrieved successfully' })
  async listOrders(
    @CurrentUser('id') sellerId: string,
    @ZodQuery(QuerySellerOrdersSchema) query: QuerySellerOrdersInput,
  ) {
    return this.sellerOrdersService.listOrders(sellerId, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] Get seller order details',
    description:
      'Returns item details, weight, buyer information, shipping address, payment status, and GHN tracking details.',
  })
  @ApiResponse({ status: 200, description: 'Order details retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden to access this order' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderDetail(
    @CurrentUser('id') sellerId: string,
    @ZodParam('id', UuidParamSchema) orderId: string,
  ) {
    return this.sellerOrdersService.getOrderDetail(sellerId, orderId);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] Confirm an order (PAID -> PREPARING)',
    description:
      'Marks the order as accepted for packaging and sends a status notification to the buyer.',
  })
  @ApiResponse({ status: 200, description: 'Order confirmed successfully' })
  @ApiResponse({ status: 400, description: 'Order is not in a confirmable status' })
  async confirmOrder(
    @CurrentUser('id') sellerId: string,
    @ZodParam('id', UuidParamSchema) orderId: string,
  ) {
    return this.sellerOrdersService.confirmOrder(sellerId, orderId);
  }

  @Post(':id/dispatch-ghn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] Create a GHN waybill and await carrier pickup',
    description:
      'Records an idempotent dispatch request and creates the waybill. Order stays PREPARING with shipment CREATED until GHN confirms pickup. Ambiguous failures must be reconciled rather than retried.',
  })
  @ApiResponse({ status: 200, description: 'GHN waybill created successfully' })
  @ApiResponse({ status: 400, description: 'Order is not in PREPARING status' })
  async dispatchGhn(
    @CurrentUser('id') sellerId: string,
    @ZodParam('id', UuidParamSchema) orderId: string,
    @ZodBody(DispatchGhnOrderSchema) dto: DispatchGhnOrderInput,
  ) {
    return this.sellerOrdersService.dispatchGhn(sellerId, orderId, dto);
  }

  @Get(':id/print-waybill')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] Get printable GHN waybill data',
    description:
      'Returns standardized sender, recipient, parcel item list, and GHN barcode data for printing.',
  })
  @ApiResponse({ status: 200, description: 'Waybill data retrieved successfully' })
  async printWaybill(
    @CurrentUser('id') sellerId: string,
    @ZodParam('id', UuidParamSchema) orderId: string,
  ) {
    return this.sellerOrdersService.printWaybill(sellerId, orderId);
  }
}
