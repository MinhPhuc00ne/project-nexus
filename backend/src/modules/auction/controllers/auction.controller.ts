import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@nexus/types';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import {
  AuthenticatedUserPayload,
  CurrentUser,
  Public,
  Roles,
} from '../../../core/security/roles.decorator';
import { AuctionService } from '../services/auction.service';
import { AuctionQueryDto } from '../dtos/auction-query.dto';
import { CreateAuctionDto } from '../dtos/create-auction.dto';
import { PlaceBidDto } from '../dtos/place-bid.dto';
import { AdminCreateAuctionDto } from '../dtos/admin-create-auction.dto';
import { AdminUpdateAuctionDto } from '../dtos/admin-update-auction.dto';
import { RegisterAuctionItemDto } from '../dtos/register-auction-item.dto';
import { ReviewAuctionItemDto } from '../dtos/review-auction-item.dto';

/**
 * Controller exposing REST endpoints for central auction events, seller consignment
 * with online appraisals, reputation evaluations, and bidding lifecycle.
 */
@ApiTags('11. AUCTIONS - ĐẤU GIÁ TRỰC TUYẾN')
@Controller('auctions')
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  // ==========================================
  // PUBLIC & BUYER BROWSING ENDPOINTS
  // ==========================================

  /**
   * Retrieves public paginated auction listings.
   */
  @Public()
  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách các phiên đấu giá công khai',
    description:
      'Trả về danh sách các phiên đấu giá (SCHEDULED, ACTIVE, ENDED...) kèm số lượng món hàng đã duyệt.',
  })
  @ApiResponse({ status: 200, description: 'Danh sách phiên đấu giá phân trang thành công.' })
  async getAuctions(@Query() query: AuctionQueryDto) {
    return this.auctionService.getAuctions(query);
  }

  /**
   * Checks whether the current authenticated buyer is eligible to bid or view-only in an auction.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id/eligibility')
  @ApiOperation({
    summary: 'Kiểm tra quyền tham gia của Buyer (Đủ điểm uy tín hay chỉ được Xem/View-Only)',
    description:
      'Đánh giá điểm uy tín và tiền sử cảnh báo/phạt của Người mua so với yêu cầu minBuyerReputation của phiên.',
  })
  @ApiResponse({ status: 200, description: 'Kết quả kiểm tra tư cách tham gia của Buyer.' })
  async checkBuyerEligibility(@Param('id') id: string, @CurrentUser('id') buyerId: string) {
    return this.auctionService.checkBuyerEligibility(id, buyerId);
  }

  /**
   * Retrieves bidding history for the current authenticated buyer.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my-bids')
  @ApiOperation({ summary: 'Lấy lịch sử trả giá của tài khoản hiện tại' })
  @ApiResponse({ status: 200, description: 'Lịch sử tham gia đấu giá của Buyer.' })
  async getMyBids(@CurrentUser('id') userId: string) {
    return this.auctionService.getMyBids(userId);
  }

  /**
   * Retrieves single auction details including product specifications, approved items, and bid logs.
   */
  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Xem chi tiết phòng/phiên đấu giá theo mã định danh',
    description:
      'Hiển thị thông tin phiên, danh sách các món hàng đã duyệt kèm giấy tờ kiểm định online, lịch sử đặt giá.',
  })
  @ApiResponse({ status: 200, description: 'Chi tiết phiên đấu giá.' })
  async getAuctionDetail(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    return this.auctionService.getAuctionDetail(id, userId);
  }

  // ==========================================
  // ADMIN AUCTION LIFECYCLE MANAGEMENT
  // ==========================================

  /**
   * Admin creates and schedules a new central auction session/event.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin')
  @ApiOperation({
    summary: '[Admin] Tạo phiên đấu giá mới',
    description:
      'Admin thiết lập Tên phiên, Ngày giờ, Thể lệ và cấu hình Số điểm uy tín tối thiểu cho Buyer và Seller.',
  })
  @ApiResponse({ status: 201, description: 'Tạo phiên đấu giá thành công.' })
  async adminCreateAuction(@CurrentUser('id') adminId: string, @Body() dto: AdminCreateAuctionDto) {
    return this.auctionService.adminCreateAuction(adminId, dto);
  }

  /**
   * Admin updates an upcoming auction. Prohibits editing when auction is ACTIVE or EXTENDED.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/:id')
  @ApiOperation({
    summary: '[Admin] Sửa thông tin phiên đấu giá',
    description:
      'Chỉ được sửa khi phiên ở trạng thái SCHEDULED/DRAFT. Tuyệt đối chặn sửa khi phiên đang diễn ra (ACTIVE/EXTENDED).',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật phiên đấu giá thành công.' })
  async adminUpdateAuction(@Param('id') id: string, @Body() dto: AdminUpdateAuctionDto) {
    return this.auctionService.adminUpdateAuction(id, dto);
  }

  /**
   * Admin deletes or cancels an auction. Prohibits deletion when auction is ACTIVE or EXTENDED.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('admin/:id')
  @ApiOperation({
    summary: '[Admin] Xóa hoặc hủy phiên đấu giá',
    description:
      'Chỉ cho phép xóa khi phiên chưa diễn ra. Tuyệt đối không cho phép xóa khi phiên đang chạy (ACTIVE/EXTENDED).',
  })
  @ApiResponse({ status: 200, description: 'Xóa hoặc hủy phiên đấu giá thành công.' })
  async adminDeleteAuction(@Param('id') id: string) {
    return this.auctionService.adminDeleteAuction(id);
  }

  /**
   * Admin views all items submitted by sellers to a specific auction room.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @Get('admin/:id/items')
  @ApiOperation({
    summary: '[Admin] Xem danh sách Seller đăng ký gửi hàng vào phiên',
    description:
      'Hiển thị toàn bộ các món hàng ký gửi, ảnh chụp giấy tờ kiểm định online, cờ cảnh báo (Flag) nếu Seller từng có tiền sử bị phạt.',
  })
  @ApiResponse({ status: 200, description: 'Danh sách hàng ký gửi và hồ sơ kiểm định.' })
  async adminGetAuctionItems(@Param('id') id: string) {
    return this.auctionService.adminGetAuctionItems(id);
  }

  /**
   * Admin approves or rejects a consigned auction item.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @Post('admin/items/:itemId/review')
  @ApiOperation({
    summary: '[Admin] Phê duyệt hoặc Từ chối món hàng ký gửi',
    description:
      'Admin xem xét giấy tờ kiểm định: Phê duyệt (gán số thứ tự Lô) hoặc Từ chối kèm lý do cụ thể.',
  })
  @ApiResponse({ status: 200, description: 'Kết quả xử lý thẩm định món hàng.' })
  async adminReviewAuctionItem(
    @Param('itemId') itemId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ReviewAuctionItemDto,
  ) {
    return this.auctionService.adminReviewAuctionItem(itemId, adminId, dto);
  }

  // ==========================================
  // SELLER CONSIGNMENT ENDPOINTS
  // ==========================================

  /**
   * Seller submits an item with online appraisal certificates into an auction.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @Post(':id/register-item')
  @ApiOperation({
    summary: '[Seller] Đăng ký gửi đồ đấu giá kèm giấy tờ kiểm định online',
    description:
      'Người bán nộp thông tin món hàng, mức giá đề xuất và đính kèm ảnh giấy chứng nhận kiểm định online. Hệ thống tự động kiểm tra điểm uy tín và gắn cờ nếu có tiền sử cảnh báo.',
  })
  @ApiResponse({ status: 201, description: 'Nộp hồ sơ gửi hàng thành công, chờ Admin duyệt.' })
  async registerAuctionItem(
    @Param('id') id: string,
    @CurrentUser('id') sellerId: string,
    @Body() dto: RegisterAuctionItemDto,
  ) {
    return this.auctionService.registerAuctionItem(id, sellerId, dto);
  }

  /**
   * Seller retrieves all items they have consigned across all auctions.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @Get('seller/my-items')
  @ApiOperation({
    summary: '[Seller] Xem danh sách các món đồ mình đã gửi đi đấu giá',
    description:
      'Hiển thị trạng thái duyệt (PENDING_REVIEW, APPROVED, REJECTED) và lý do từ chối (nếu có).',
  })
  @ApiResponse({ status: 200, description: 'Danh sách đồ ký gửi của người bán.' })
  async getSellerConsignments(@CurrentUser('id') sellerId: string) {
    return this.auctionService.getSellerConsignments(sellerId);
  }

  /**
   * Retrieves auctions owned by the authenticated seller (legacy compatibility).
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @Get('my')
  @ApiOperation({ summary: 'Lấy danh sách các phiên đấu giá do người bán tạo (Tương thích cũ)' })
  async getMyAuctions(@CurrentUser('id') sellerId: string, @Query() query: AuctionQueryDto) {
    return this.auctionService.getMyAuctions(sellerId, query);
  }

  /**
   * Initiates a new auction for an owned catalog product (legacy compatibility).
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Tạo phiên đấu giá trực tiếp từ sản phẩm (Tương thích cũ)' })
  async createAuction(@CurrentUser('id') sellerId: string, @Body() dto: CreateAuctionDto) {
    return this.auctionService.createAuction(sellerId, dto);
  }

  // ==========================================
  // BIDDING & FINALIZATION ENDPOINTS
  // ==========================================

  /**
   * Submits a competitive bid with wallet balance locking and automated anti-sniping extension.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/bids')
  @ApiOperation({
    summary: 'Tham gia trả giá trong phòng đấu giá (Khóa cọc ví NEXUS Pay)',
    description: 'Kiểm tra điểm uy tín của Buyer trước khi cho phép đặt cọc và đẩy giá.',
  })
  async placeBid(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: PlaceBidDto,
  ) {
    return this.auctionService.placeBid(id, userId, dto);
  }

  /**
   * Finalizes an auction when scheduled duration concludes.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN, Role.SUPPORT_STAFF)
  @Post(':id/end')
  @ApiOperation({ summary: 'Kết thúc và chốt kết quả phiên đấu giá' })
  async endAuction(@Param('id') id: string, @CurrentUser() user: AuthenticatedUserPayload) {
    return this.auctionService.endAuction(id, user.id, user.role);
  }
}
