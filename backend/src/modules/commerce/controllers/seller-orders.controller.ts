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
import { GhnDispatchService } from '../../fulfillment/services/ghn-dispatch.service';
import { ShipmentTrackingService } from '../../fulfillment/services/shipment-tracking.service';

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
  @ApiOperation({ summary: '[SELLER] Lấy liên kết in phiếu chính thức GHN (A5, 80x80, 52x70)' })
  ghnLabel(
    @CurrentUser('id') sellerId: string,
    @Param('id') id: string,
  ): ReturnType<GhnDispatchService['label']> {
    return this.dispatch.label(sellerId, id);
  }

  @Post(':id/shipping-quote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] Xem phí GHN cho kiện đóng gói thực tế và khoản chênh lệch seller chịu',
  })
  shippingQuote(
    @CurrentUser('id') sellerId: string,
    @Param('id') id: string,
    @Body() dto: DispatchGhnOrderDto,
  ) {
    return this.dispatch.preview(sellerId, id, dto);
  }

  @Post(':id/reconcile-ghn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] Đối soát yêu cầu tạo vận đơn bị gián đoạn, không tạo lại vận đơn',
  })
  async reconcile(@CurrentUser('id') sellerId: string, @Param('id') id: string) {
    await this.dispatch.reconcile(sellerId, id);
    return this.tracking.refresh(id, { id: sellerId, role: 'SELLER' });
  }

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
    summary: '[SELLER] Tạo vận đơn GHN, chờ hãng xác nhận lấy hàng',
    description:
      'Lưu yêu cầu chống gửi trùng, tạo mã vận đơn thật. Đơn giữ PREPARING và shipment CREATED; chỉ chuyển SHIPPING khi đồng bộ GHN xác nhận đã lấy hàng. Kết quả không rõ phải đối soát, không gửi tạo lại.',
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
