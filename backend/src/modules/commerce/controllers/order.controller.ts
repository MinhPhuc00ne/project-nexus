import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { OrderService } from '../services/order.service';
import { CheckoutDto } from '../dtos/checkout.dto';
import { PayOrderDto } from '../dtos/pay-order.dto';
import { CurrentUser, RequirePrivilege } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';

@ApiTags('8. COMMERCE - ORDERS & PAYMENTS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('commerce')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @RequirePrivilege('CHECKOUT.START')
  @ApiOperation({
    summary: '[BUYER] Đặt hàng từ giỏ hàng hiện tại (Checkout)',
    description:
      'Tạo đơn hàng từ giỏ hàng kèm kiểm tra tồn kho, giá cập nhật và chặn tự mua hàng của chính mình (Anti-Self-Purchase). Nếu chọn PayOS, hệ thống có thể tạo sẵn link thanh toán.',
  })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Khóa chống trùng lặp request khi bấm nhiều lần (UUID)',
  })
  @ApiResponse({ status: 201, description: 'Đặt hàng thành công' })
  @ApiResponse({ status: 400, description: 'Giỏ hàng trống hoặc vi phạm quy tắc đơn hàng' })
  async checkout(
    @CurrentUser('id') userId: string,
    @Body() dto: CheckoutDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.orderService.checkout(userId, dto, idempotencyKey);
  }

  @Post('orders/:id/pay')
  @HttpCode(HttpStatus.OK)
  @RequirePrivilege('CHECKOUT.START')
  @ApiOperation({
    summary: '[BUYER] Khởi tạo liên kết thanh toán PayOS VietQR cho đơn hàng',
    description:
      'Tạo giao dịch thanh toán trên PayOS và trả về URL thanh toán (checkoutUrl) kèm thông tin tài khoản và mã QR để khách quét trên ứng dụng ngân hàng.',
  })
  @ApiResponse({ status: 200, description: 'Tạo link thanh toán PayOS thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async payOrder(
    @Param('id') orderId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: PayOrderDto,
  ) {
    return this.orderService.initializePayment(orderId, userId, dto);
  }

  @Get('orders')
  @HttpCode(HttpStatus.OK)
  @RequirePrivilege('CHECKOUT.START')
  @ApiOperation({
    summary: '[BUYER] Xem danh sách đơn hàng đã đặt của người dùng',
    description: 'Trả về danh sách đơn hàng kèm chi tiết sản phẩm và trạng thái thanh toán.',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách đơn hàng thành công' })
  async getUserOrders(@CurrentUser('id') userId: string) {
    return this.orderService.getUserOrders(userId);
  }

  @Get('orders/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePrivilege('CHECKOUT.START')
  @ApiOperation({
    summary: '[BUYER / SELLER] Xem chi tiết một đơn hàng cụ thể',
    description: 'Xem chi tiết đơn hàng, lịch sử thanh toán và trạng thái giao hàng.',
  })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết đơn hàng thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async getOrderDetail(@Param('id') orderId: string, @CurrentUser('id') userId: string) {
    return this.orderService.getOrderById(orderId, userId);
  }
}
