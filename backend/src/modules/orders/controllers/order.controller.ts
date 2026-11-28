import { UuidParamSchema } from '@nexus/contracts';
import { Controller, Get, Headers, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodParam } from '@nexus/contracts/nest';
import { OrderService } from '../services/order.service';
import { CheckoutInput, CheckoutSchema } from '../dtos/checkout.dto';
import { PayOrderInput, PayOrderSchema } from '../dtos/pay-order.dto';
import { CurrentUser, RequirePrivilege } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';

@ApiTags('8. COMMERCE - ORDERS & PAYMENTS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('commerce')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('checkout/quote')
  @HttpCode(HttpStatus.OK)
  @RequirePrivilege('CHECKOUT.START')
  @ApiOperation({
    summary: '[BUYER] Quote cart by shop without creating orders or charging payment',
  })
  quoteCheckout(@CurrentUser('id') userId: string, @ZodBody(CheckoutSchema) dto: CheckoutInput) {
    return this.orderService.checkout(userId, dto, undefined, true);
  }

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @RequirePrivilege('CHECKOUT.START')
  @ApiOperation({
    summary: '[BUYER] Place orders from the current cart (Checkout)',
    description:
      'Creates orders from the cart with stock validation, price revalidation, and anti-self-purchase enforcement. Generates PayOS payment link when selected.',
  })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Idempotency UUID key to prevent duplicate submissions',
  })
  @ApiResponse({ status: 201, description: 'Orders created successfully' })
  @ApiResponse({ status: 400, description: 'Empty cart or order validation failure' })
  async checkout(
    @CurrentUser('id') userId: string,
    @ZodBody(CheckoutSchema) dto: CheckoutInput,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.orderService.checkout(userId, dto, idempotencyKey);
  }

  @Post('orders/:id/pay')
  @HttpCode(HttpStatus.OK)
  @RequirePrivilege('CHECKOUT.START')
  @ApiOperation({
    summary: '[BUYER] Pay an order (PayOS VietQR or NEXUS Pay Wallet)',
    description:
      'PAYOS creates a VietQR payment link; WALLET deducts buyer balance. Funds are held in escrow (HELD) until delivery confirmation or dispute resolution.',
  })
  @ApiResponse({ status: 200, description: 'Payment initialized or completed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Insufficient wallet balance or invalid order status',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async payOrder(
    @ZodParam('id', UuidParamSchema) orderId: string,
    @CurrentUser('id') userId: string,
    @ZodBody(PayOrderSchema) dto: PayOrderInput,
  ) {
    return this.orderService.initializePayment(orderId, userId, dto);
  }

  @Get('orders/:id/payment-status')
  @HttpCode(HttpStatus.OK)
  @RequirePrivilege('CHECKOUT.START')
  @ApiOperation({
    summary: '[BUYER] Check and synchronize PayOS payment status',
    description:
      'Reads order status from the database and queries PayOS directly when payment is pending.',
  })
  @ApiResponse({ status: 200, description: 'Payment status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getPaymentStatus(
    @ZodParam('id', UuidParamSchema) orderId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.orderService.checkPayosPaymentStatus(orderId, userId);
  }

  @Get('orders')
  @HttpCode(HttpStatus.OK)
  @RequirePrivilege('CHECKOUT.START')
  @ApiOperation({
    summary: '[BUYER] List placed orders for the authenticated user',
    description: 'Returns orders with item details and payment status.',
  })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async getUserOrders(@CurrentUser('id') userId: string) {
    return this.orderService.getUserOrders(userId);
  }

  @Get('orders/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePrivilege('CHECKOUT.START')
  @ApiOperation({
    summary: '[BUYER / SELLER] Get order details by ID',
    description: 'Returns order details, payment history, and shipment status.',
  })
  @ApiResponse({ status: 200, description: 'Order details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderDetail(
    @ZodParam('id', UuidParamSchema) orderId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.orderService.getOrderById(orderId, userId);
  }
}
