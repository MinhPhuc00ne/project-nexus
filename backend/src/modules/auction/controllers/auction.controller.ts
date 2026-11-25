import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Optional,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuctionComplaintStatus, Role as PrismaRole } from '@prisma/client';
import { Role } from '@nexus/types';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import {
  AuthenticatedUserPayload,
  CurrentUser,
  Public,
  Roles,
} from '../../../core/security/roles.decorator';
import { RolesGuard } from '../../../core/security/roles.guard';
import { AuctionCheckoutService } from '../services/auction-checkout.service';
import { AdminAwardActionDto } from '../dtos/admin-award-action.dto';
import { AdminCreateAuctionDto } from '../dtos/admin-create-auction.dto';
import { AdminUpdateAuctionDto } from '../dtos/admin-update-auction.dto';
import {
  CreateAuctionComplaintDto,
  ResolveAuctionComplaintDto,
} from '../dtos/auction-complaint.dto';
import { AuctionQueryDto } from '../dtos/auction-query.dto';
import { AuctionIntroShowcaseResponseDto } from '../dtos/auction-showcase-response.dto';
import { AuctionSupportChatDto } from '../dtos/auction-support-chat.dto';
import { PlaceBidDto } from '../dtos/place-bid.dto';
import { RegisterAuctionItemDto } from '../dtos/register-auction-item.dto';
import { ReviewAuctionItemDto } from '../dtos/review-auction-item.dto';
import { StaffAuctionNoteDto } from '../dtos/staff-auction-note.dto';
import { AuctionComplaintService } from '../services/auction-complaint.service';
import { AuctionService } from '../services/auction.service';

@ApiTags('Auctions')
@Controller('auctions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuctionController {
  constructor(
    private readonly auctionService: AuctionService,
    @Optional() private readonly complaintService?: AuctionComplaintService,
    @Optional() private readonly checkoutService?: AuctionCheckoutService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Danh sách phiên đấu giá công khai (hỗ trợ phân trang & lọc)' })
  getAuctions(@Query() query: AuctionQueryDto) {
    return this.auctionService.getAuctions(query);
  }

  @Get('my-bids')
  @ApiOperation({ summary: 'Lịch sử đặt giá và trạng thái quyền mua của tôi' })
  getMyBids(@CurrentUser('id') userId: string) {
    return this.auctionService.getMyBids(userId);
  }

  @Roles(Role.SELLER, Role.ADMIN)
  @Get('seller/my-items')
  @ApiOperation({ summary: 'Danh sách vật phẩm đã ký gửi vào các phiên đấu giá của Người bán' })
  getSellerConsignments(@CurrentUser('id') sellerId: string) {
    return this.auctionService.getSellerConsignments(sellerId);
  }

  @Roles(Role.SUPPORT_STAFF, Role.ADMIN)
  @Get('staff/overview')
  @ApiOperation({ summary: 'Bảng theo dõi hỗ trợ đấu giá 3D dành cho Nhân viên hỗ trợ & Admin' })
  getStaffOverview() {
    return this.auctionService.getStaffOverview();
  }

  @Roles(Role.SUPPORT_STAFF, Role.ADMIN)
  @Patch('staff/items/:itemId/note')
  @ApiOperation({ summary: 'Nhân viên hỗ trợ cập nhật ghi chú kiểm tra / hỗ trợ trên lô hàng' })
  staffAddItemNote(
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @CurrentUser('id') staffId: string,
    @Body() dto: StaffAuctionNoteDto,
  ) {
    return this.auctionService.staffAddItemNote(itemId, staffId, dto);
  }

  @Roles(Role.BUYER, Role.SELLER, Role.SUPPORT_STAFF, Role.ADMIN)
  @Get('complaints')
  @ApiOperation({
    summary: 'Danh sách khiếu nại đấu giá (Admin/Staff xem toàn bộ, người dùng xem đơn của mình)',
  })
  listComplaints(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Query('auctionId') auctionId?: string,
    @Query('status') status?: AuctionComplaintStatus,
  ) {
    return this.complaintService!.listComplaints(user.id, user.role as unknown as PrismaRole, {
      auctionId,
      status,
    });
  }

  @Roles(Role.ADMIN)
  @Patch('complaints/:complaintId/resolve')
  @ApiOperation({ summary: 'Admin tiếp nhận (chấp thuận) hoặc từ chối khiếu nại đấu giá' })
  resolveComplaint(
    @Param('complaintId', new ParseUUIDPipe()) complaintId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ResolveAuctionComplaintDto,
  ) {
    return this.complaintService!.resolveComplaint(complaintId, adminId, dto);
  }

  @Roles(Role.ADMIN)
  @Post('admin')
  @ApiOperation({
    summary: 'Admin tạo mới phòng đấu giá đa lô (gửi thông báo tới Người bán để ký gửi)',
  })
  adminCreateAuction(@CurrentUser('id') adminId: string, @Body() dto: AdminCreateAuctionDto) {
    return this.auctionService.adminCreateAuction(adminId, dto);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/:id')
  @ApiOperation({ summary: 'Admin cập nhật thông tin phiên đấu giá trước khi bắt đầu' })
  adminUpdateAuction(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AdminUpdateAuctionDto,
  ) {
    return this.auctionService.adminUpdateAuction(id, dto);
  }

  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @Post('admin/:id/lock-consignment')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Admin & Nhân viên hỗ trợ khóa đăng ký ký gửi vật phẩm sớm cho phiên đấu giá',
  })
  adminLockConsignment(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.auctionService.adminLockConsignment(id);
  }

  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @Post('admin/:id/start')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Admin & Nhân viên hỗ trợ bấm bắt đầu phiên đấu giá thủ công và gửi thông báo tới Người mua',
  })
  adminStartAuction(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.auctionService.adminStartAuction(id);
  }

  @Roles(Role.ADMIN)
  @Delete('admin/:id')
  @ApiOperation({ summary: 'Admin xóa phòng đấu giá chưa diễn ra và chưa có lượt đặt giá' })
  adminDeleteAuction(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.auctionService.adminDeleteAuction(id);
  }

  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @Get('admin/:id/items')
  @ApiOperation({
    summary: 'Admin & Nhân viên hỗ trợ xem danh sách toàn bộ vật phẩm ký gửi trong phiên',
  })
  adminGetAuctionItems(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.auctionService.adminGetAuctionItems(id);
  }

  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @Post('admin/items/:itemId/review')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Admin & Nhân viên hỗ trợ duyệt hoặc từ chối vật phẩm ký gửi của Người bán',
  })
  adminReviewAuctionItem(
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ReviewAuctionItemDto,
  ) {
    return this.auctionService.adminReviewAuctionItem(itemId, adminId, dto);
  }

  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @Post('admin/:id/items/:itemId/end')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Admin & Nhân viên hỗ trợ kết thúc riêng từng lô đấu giá',
  })
  adminEndLot(
    @Param('id', new ParseUUIDPipe()) auctionId: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.auctionService.adminEndLot(auctionId, itemId, adminId);
  }

  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @Get('admin/awards')
  @ApiOperation({ summary: 'Danh sách quyền mua sau đấu giá cho Admin & Nhân viên hỗ trợ' })
  listAdminAwards(@Query('auctionId') auctionId?: string) {
    return this.checkoutService!.listAwardsForAdmin(auctionId);
  }

  @Roles(Role.ADMIN)
  @Post('admin/awards/:awardId/payment-default')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Admin xác nhận người mua quá hạn thanh toán 24h (mất 30% cọc, trừ 10đ uy tín, chuyển người thứ 2)',
  })
  confirmPaymentDefault(
    @Param('awardId', new ParseUUIDPipe()) awardId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: AdminAwardActionDto,
  ) {
    if (!dto.confirmed) {
      throw new BadRequestException('Cần xác nhận chắc chắn trước khi chốt quá hạn thanh toán.');
    }
    return this.checkoutService!.markPaymentDefault(awardId, adminId, dto.note);
  }

  @Roles(Role.ADMIN)
  @Post('admin/awards/:awardId/not-buying')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Admin xác nhận khách hàng thứ hai không mua nữa (hoàn cọc 30% nếu đã đóng và đóng lô hàng)',
  })
  confirmSecondChanceNotBuying(
    @Param('awardId', new ParseUUIDPipe()) awardId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: AdminAwardActionDto,
  ) {
    if (!dto.confirmed) {
      throw new BadRequestException('Cần xác nhận chắc chắn trước khi chốt khách không mua nữa.');
    }
    return this.checkoutService!.withdrawSecondChanceByAdmin(awardId, adminId, dto.note);
  }

  @Get(':id/eligibility')
  @ApiOperation({ summary: 'Kiểm tra điều kiện uy tín, ví và chế độ Người mua trước khi đặt giá' })
  checkBuyerEligibility(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') buyerId: string,
  ) {
    return this.auctionService.checkBuyerEligibility(id, buyerId);
  }

  @Public()
  @Get(':id/intro-showcase')
  @ApiOperation({ summary: 'Lấy dữ liệu đồng bộ màn giới thiệu 3D khi vào phòng đấu giá' })
  @ApiResponse({ status: 200, type: AuctionIntroShowcaseResponseDto })
  getAuctionIntroShowcase(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.auctionService.getAuctionIntroShowcase(id);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết phòng đấu giá đa lô theo từng lô hàng và lịch sử trả giá' })
  getAuctionDetail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user?: AuthenticatedUserPayload,
  ) {
    return this.auctionService.getAuctionDetail(id, user?.id);
  }

  @Roles(Role.SELLER, Role.ADMIN)
  @Post(':id/register-item')
  @ApiOperation({
    summary: 'Người bán ký gửi vật phẩm đấu giá (kèm kích thước đóng gói GHN & chứng thư)',
  })
  registerAuctionItem(
    @Param('id', new ParseUUIDPipe()) auctionId: string,
    @CurrentUser('id') sellerId: string,
    @Body() dto: RegisterAuctionItemDto,
  ) {
    return this.auctionService.registerAuctionItem(auctionId, sellerId, dto);
  }

  @Roles(Role.BUYER, Role.SELLER)
  @Post(':id/bids')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Người mua đặt giá cho một lô hàng trong phòng đấu giá (chế độ Người bán chỉ xem)',
  })
  placeBid(
    @Param('id', new ParseUUIDPipe()) auctionId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: PlaceBidDto,
  ) {
    return this.auctionService.placeBid(auctionId, userId, dto);
  }

  @Roles(Role.BUYER, Role.SELLER)
  @Post(':id/items/:itemId/bids')
  @HttpCode(200)
  @ApiOperation({ summary: 'Người mua đặt giá trực tiếp theo ID lô hàng trong phòng đấu giá' })
  placeLotBid(
    @Param('id', new ParseUUIDPipe()) auctionId: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: PlaceBidDto,
  ) {
    return this.auctionService.placeBid(auctionId, userId, { ...dto, auctionItemId: itemId });
  }

  @Roles(Role.BUYER, Role.SELLER)
  @Post(':id/complaints')
  @ApiOperation({
    summary: 'Người bán hoặc Người mua gửi yêu cầu khiếu nại liên quan đến phiên đấu giá',
  })
  createComplaint(
    @Param('id', new ParseUUIDPipe()) auctionId: string,
    @CurrentUser() user: AuthenticatedUserPayload,
    @Body() dto: CreateAuctionComplaintDto,
  ) {
    return this.complaintService!.createComplaint(
      auctionId,
      user.id,
      user.role as unknown as PrismaRole,
      dto,
    );
  }

  @Roles(Role.BUYER, Role.SELLER)
  @Post(':id/support-chat')
  @ApiOperation({
    summary: 'Mở cuộc trò chuyện hỗ trợ trực tiếp với Nhân viên hỗ trợ cho phòng đấu giá',
  })
  requestSupportChat(
    @Param('id', new ParseUUIDPipe()) auctionId: string,
    @CurrentUser() user: AuthenticatedUserPayload,
    @Body() dto: AuctionSupportChatDto,
  ) {
    return this.auctionService.requestAuctionSupportChat(
      auctionId,
      user.id,
      user.role as unknown as PrismaRole,
      dto.message,
    );
  }
}
