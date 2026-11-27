import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Optional,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodParam, ZodQuery } from '@nexus/contracts/nest';
import { Role as PrismaRole } from '@prisma/client';
import { Role, UuidParamSchema } from '@nexus/contracts';
import {
  AuctionComplaintsQuery,
  AuctionComplaintsQuerySchema,
  OptionalAuctionIdQuery,
  OptionalAuctionIdQuerySchema,
} from '../../../core/validation/query-schemas';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import {
  AuthenticatedUserPayload,
  CurrentUser,
  Public,
  Roles,
} from '../../../core/security/roles.decorator';
import { RolesGuard } from '../../../core/security/roles.guard';
import { AuctionCheckoutService } from '../services/auction-checkout.service';
import { AdminAwardActionInput, AdminAwardActionSchema } from '../dtos/admin-award-action.dto';
import {
  AdminCreateAuctionInput,
  AdminCreateAuctionSchema,
} from '../dtos/admin-create-auction.dto';
import {
  AdminUpdateAuctionInput,
  AdminUpdateAuctionSchema,
} from '../dtos/admin-update-auction.dto';
import {
  CreateAuctionComplaintInput,
  CreateAuctionComplaintSchema,
  ResolveAuctionComplaintInput,
  ResolveAuctionComplaintSchema,
} from '../dtos/auction-complaint.dto';
import { AuctionQueryInput, AuctionQuerySchema } from '../dtos/auction-query.dto';
import { AuctionIntroShowcaseResponseSchema } from '../dtos/auction-showcase-response.dto';
import {
  AuctionSupportChatInput,
  AuctionSupportChatSchema,
} from '../dtos/auction-support-chat.dto';
import { PlaceBidInput, PlaceBidSchema } from '../dtos/place-bid.dto';
import {
  RegisterAuctionItemInput,
  RegisterAuctionItemSchema,
} from '../dtos/register-auction-item.dto';
import { ReviewAuctionItemInput, ReviewAuctionItemSchema } from '../dtos/review-auction-item.dto';
import { StaffAuctionNoteInput, StaffAuctionNoteSchema } from '../dtos/staff-auction-note.dto';
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
  getAuctions(@ZodQuery(AuctionQuerySchema) query: AuctionQueryInput) {
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
    @ZodParam('itemId', UuidParamSchema) itemId: string,
    @CurrentUser('id') staffId: string,
    @ZodBody(StaffAuctionNoteSchema) dto: StaffAuctionNoteInput,
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
    @ZodQuery(AuctionComplaintsQuerySchema) query: AuctionComplaintsQuery,
  ) {
    return this.complaintService!.listComplaints(user.id, user.role as unknown as PrismaRole, {
      auctionId: query.auctionId,
      status: query.status,
    });
  }

  @Roles(Role.ADMIN)
  @Patch('complaints/:complaintId/resolve')
  @ApiOperation({ summary: 'Admin tiếp nhận (chấp thuận) hoặc từ chối khiếu nại đấu giá' })
  resolveComplaint(
    @ZodParam('complaintId', UuidParamSchema) complaintId: string,
    @CurrentUser('id') adminId: string,
    @ZodBody(ResolveAuctionComplaintSchema) dto: ResolveAuctionComplaintInput,
  ) {
    return this.complaintService!.resolveComplaint(complaintId, adminId, dto);
  }

  @Roles(Role.ADMIN)
  @Post('admin')
  @ApiOperation({
    summary: 'Admin tạo mới phòng đấu giá đa lô (gửi thông báo tới Người bán để ký gửi)',
  })
  adminCreateAuction(
    @CurrentUser('id') adminId: string,
    @ZodBody(AdminCreateAuctionSchema) dto: AdminCreateAuctionInput,
  ) {
    return this.auctionService.adminCreateAuction(adminId, dto);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/:id')
  @ApiOperation({ summary: 'Admin cập nhật thông tin phiên đấu giá trước khi bắt đầu' })
  adminUpdateAuction(
    @ZodParam('id', UuidParamSchema) id: string,
    @ZodBody(AdminUpdateAuctionSchema) dto: AdminUpdateAuctionInput,
  ) {
    return this.auctionService.adminUpdateAuction(id, dto);
  }

  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @Post('admin/:id/lock-consignment')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Admin & Nhân viên hỗ trợ khóa đăng ký ký gửi vật phẩm sớm cho phiên đấu giá',
  })
  adminLockConsignment(@ZodParam('id', UuidParamSchema) id: string) {
    return this.auctionService.adminLockConsignment(id);
  }

  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @Post('admin/:id/start')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Admin & Nhân viên hỗ trợ bấm bắt đầu phiên đấu giá thủ công và gửi thông báo tới Người mua',
  })
  adminStartAuction(@ZodParam('id', UuidParamSchema) id: string) {
    return this.auctionService.adminStartAuction(id);
  }

  @Roles(Role.ADMIN)
  @Delete('admin/:id')
  @ApiOperation({ summary: 'Admin xóa phòng đấu giá chưa diễn ra và chưa có lượt đặt giá' })
  adminDeleteAuction(@ZodParam('id', UuidParamSchema) id: string) {
    return this.auctionService.adminDeleteAuction(id);
  }

  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @Get('admin/:id/items')
  @ApiOperation({
    summary: 'Admin & Nhân viên hỗ trợ xem danh sách toàn bộ vật phẩm ký gửi trong phiên',
  })
  adminGetAuctionItems(@ZodParam('id', UuidParamSchema) id: string) {
    return this.auctionService.adminGetAuctionItems(id);
  }

  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @Post('admin/items/:itemId/review')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Admin & Nhân viên hỗ trợ duyệt hoặc từ chối vật phẩm ký gửi của Người bán',
  })
  adminReviewAuctionItem(
    @ZodParam('itemId', UuidParamSchema) itemId: string,
    @CurrentUser('id') adminId: string,
    @ZodBody(ReviewAuctionItemSchema) dto: ReviewAuctionItemInput,
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
    @ZodParam('id', UuidParamSchema) auctionId: string,
    @ZodParam('itemId', UuidParamSchema) itemId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.auctionService.adminEndLot(auctionId, itemId, adminId);
  }

  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @Get('admin/awards')
  @ApiOperation({ summary: 'Danh sách quyền mua sau đấu giá cho Admin & Nhân viên hỗ trợ' })
  listAdminAwards(@ZodQuery(OptionalAuctionIdQuerySchema) query: OptionalAuctionIdQuery) {
    return this.checkoutService!.listAwardsForAdmin(query.auctionId);
  }

  @Roles(Role.ADMIN)
  @Post('admin/awards/:awardId/payment-default')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Admin xác nhận người mua quá hạn thanh toán 24h (mất 30% cọc, trừ 10đ uy tín, chuyển người thứ 2)',
  })
  confirmPaymentDefault(
    @ZodParam('awardId', UuidParamSchema) awardId: string,
    @CurrentUser('id') adminId: string,
    @ZodBody(AdminAwardActionSchema) dto: AdminAwardActionInput,
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
    @ZodParam('awardId', UuidParamSchema) awardId: string,
    @CurrentUser('id') adminId: string,
    @ZodBody(AdminAwardActionSchema) dto: AdminAwardActionInput,
  ) {
    if (!dto.confirmed) {
      throw new BadRequestException('Cần xác nhận chắc chắn trước khi chốt khách không mua nữa.');
    }
    return this.checkoutService!.withdrawSecondChanceByAdmin(awardId, adminId, dto.note);
  }

  @Get(':id/eligibility')
  @ApiOperation({ summary: 'Kiểm tra điều kiện uy tín, ví và chế độ Người mua trước khi đặt giá' })
  checkBuyerEligibility(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser('id') buyerId: string,
  ) {
    return this.auctionService.checkBuyerEligibility(id, buyerId);
  }

  @Public()
  @Get(':id/intro-showcase')
  @ApiOperation({ summary: 'Lấy dữ liệu đồng bộ màn giới thiệu 3D khi vào phòng đấu giá' })
  @ApiOkResponse({ standardSchema: AuctionIntroShowcaseResponseSchema })
  getAuctionIntroShowcase(@ZodParam('id', UuidParamSchema) id: string) {
    return this.auctionService.getAuctionIntroShowcase(id);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết phòng đấu giá đa lô theo từng lô hàng và lịch sử trả giá' })
  getAuctionDetail(
    @ZodParam('id', UuidParamSchema) id: string,
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
    @ZodParam('id', UuidParamSchema) auctionId: string,
    @CurrentUser('id') sellerId: string,
    @ZodBody(RegisterAuctionItemSchema) dto: RegisterAuctionItemInput,
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
    @ZodParam('id', UuidParamSchema) auctionId: string,
    @CurrentUser('id') userId: string,
    @ZodBody(PlaceBidSchema) dto: PlaceBidInput,
  ) {
    return this.auctionService.placeBid(auctionId, userId, dto);
  }

  @Roles(Role.BUYER, Role.SELLER)
  @Post(':id/items/:itemId/bids')
  @HttpCode(200)
  @ApiOperation({ summary: 'Người mua đặt giá trực tiếp theo ID lô hàng trong phòng đấu giá' })
  placeLotBid(
    @ZodParam('id', UuidParamSchema) auctionId: string,
    @ZodParam('itemId', UuidParamSchema) itemId: string,
    @CurrentUser('id') userId: string,
    @ZodBody(PlaceBidSchema) dto: PlaceBidInput,
  ) {
    return this.auctionService.placeBid(auctionId, userId, { ...dto, auctionItemId: itemId });
  }

  @Roles(Role.BUYER, Role.SELLER)
  @Post(':id/complaints')
  @ApiOperation({
    summary: 'Người bán hoặc Người mua gửi yêu cầu khiếu nại liên quan đến phiên đấu giá',
  })
  createComplaint(
    @ZodParam('id', UuidParamSchema) auctionId: string,
    @CurrentUser() user: AuthenticatedUserPayload,
    @ZodBody(CreateAuctionComplaintSchema) dto: CreateAuctionComplaintInput,
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
    @ZodParam('id', UuidParamSchema) auctionId: string,
    @CurrentUser() user: AuthenticatedUserPayload,
    @ZodBody(AuctionSupportChatSchema) dto: AuctionSupportChatInput,
  ) {
    return this.auctionService.requestAuctionSupportChat(
      auctionId,
      user.id,
      user.role as unknown as PrismaRole,
      dto.message,
    );
  }
}
