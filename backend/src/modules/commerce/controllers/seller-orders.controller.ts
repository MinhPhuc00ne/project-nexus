import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@nexus/types';
import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { DispatchGhnOrderDto, QuerySellerOrdersDto } from '../dtos/seller-order.dto';
import { SellerOrdersService } from '../services/seller-orders.service';

@ApiTags('8. COMMERCE - SELLER ORDERS & GHN')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SELLER, Role.ADMIN)
@Controller('seller/orders')
export class SellerOrdersController {
  constructor(private readonly sellerOrdersService: SellerOrdersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] Lấy danh sách đơn bán của người bán kèm phân trang và bộ đếm trạng thái',
    description:
      'Hỗ trợ lọc theo trạng thái đơn hàng (PAID, PREPARING, SHIPPING, DELIVERED, CONFIRMED, CANCELLED, REFUNDED), tìm kiếm theo mã đơn hoặc tên/SĐT khách hàng, đồng thời trả về counters số lượng đơn theo từng trạng thái.',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách đơn bán thành công' })
  async listOrders(@CurrentUser('id') sellerId: string, @Query() query: QuerySellerOrdersDto) {
    return this.sellerOrdersService.listOrders(sellerId, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] Xem chi tiết thông tin 1 đơn bán',
    description:
      'Trả về thông tin chi tiết sản phẩm, khối lượng, thông tin người mua, địa chỉ nhận hàng, trạng thái thanh toán và thông tin vận chuyển GHN.',
  })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết đơn hàng thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập đơn hàng này' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async getOrderDetail(@CurrentUser('id') sellerId: string, @Param('id') orderId: string) {
    return this.sellerOrdersService.getOrderDetail(sellerId, orderId);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] Xác nhận đơn hàng (Chuyển trạng thái PAID -> PREPARING)',
    description:
      'Người bán xác nhận đã tiếp nhận đơn và đang chuẩn bị đóng gói hàng hóa, đồng thời gửi thông báo trạng thái tới người mua.',
  })
  @ApiResponse({ status: 200, description: 'Xác nhận đơn hàng thành công' })
  @ApiResponse({ status: 400, description: 'Đơn hàng không ở trạng thái hợp lệ để xác nhận' })
  async confirmOrder(@CurrentUser('id') sellerId: string, @Param('id') orderId: string) {
    return this.sellerOrdersService.confirmOrder(sellerId, orderId);
  }

  @Post(':id/dispatch-ghn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      '[SELLER] Tạo vận đơn GHN Express và bàn giao hàng (Chuyển trạng thái PREPARING -> SHIPPING)',
    description:
      'Người bán gọi API kết nối GHN để sinh mã vận đơn, tạo bản ghi Shipment trên sàn, cập nhật trạng thái đơn hàng sang SHIPPING và bắn thông báo tới người mua.',
  })
  @ApiResponse({ status: 200, description: 'Bàn giao vận đơn GHN thành công' })
  @ApiResponse({ status: 400, description: 'Đơn hàng chưa ở trạng thái chuẩn bị hàng' })
  async dispatchGhn(
    @CurrentUser('id') sellerId: string,
    @Param('id') orderId: string,
    @Body() dto: DispatchGhnOrderDto,
  ) {
    return this.sellerOrdersService.dispatchGhn(sellerId, orderId, dto);
  }

  @Get(':id/print-waybill')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] In phiếu giao hàng / Vận đơn GHN (Print Waybill)',
    description:
      'Lấy dữ liệu phiếu gửi hàng chuẩn hóa (thông tin người gửi, người nhận, danh sách kiện hàng, barcode GHN) để người bán in dán lên bưu kiện.',
  })
  @ApiResponse({ status: 200, description: 'Lấy dữ liệu in vận đơn thành công' })
  async printWaybill(@CurrentUser('id') sellerId: string, @Param('id') orderId: string) {
    return this.sellerOrdersService.printWaybill(sellerId, orderId);
  }
}
