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
  @ApiOperation({ summary: 'List public auction sessions with pagination and filters' })
  getAuctions(@ZodQuery(AuctionQuerySchema) query: AuctionQueryInput) {
    return this.auctionService.getAuctions(query);
  }

  @Get('my-bids')
  @ApiOperation({ summary: 'Get my bid history and auction award statuses' })
  getMyBids(@CurrentUser('id') userId: string) {
    return this.auctionService.getMyBids(userId);
  }

  @Roles(Role.SELLER, Role.ADMIN)
  @Get('seller/my-items')
  @ApiOperation({ summary: 'List consigned auction items for the authenticated seller' })
  getSellerConsignments(@CurrentUser('id') sellerId: string) {
    return this.auctionService.getSellerConsignments(sellerId);
  }

  @Roles(Role.SUPPORT_STAFF, Role.ADMIN)
  @Get('staff/overview')
  @ApiOperation({ summary: 'Get 3D auction support overview (Support Staff & Admin)' })
  getStaffOverview() {
    return this.auctionService.getStaffOverview();
  }

  @Roles(Role.SUPPORT_STAFF, Role.ADMIN)
  @Patch('staff/items/:itemId/note')
  @ApiOperation({
    summary: 'Update inspection or support note on an auction lot (Support Staff & Admin)',
  })
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
    summary: 'List auction complaints (Admin and Staff see all; users see their own)',
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
  @ApiOperation({ summary: 'Approve or reject an auction complaint (Admin)' })
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
    summary: 'Create a multi-lot auction room and notify sellers for consignment (Admin)',
  })
  adminCreateAuction(
    @CurrentUser('id') adminId: string,
    @ZodBody(AdminCreateAuctionSchema) dto: AdminCreateAuctionInput,
  ) {
    return this.auctionService.adminCreateAuction(adminId, dto);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/:id')
  @ApiOperation({ summary: 'Update auction session details before start (Admin)' })
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
    summary:
      'Lock item consignment registration early for an auction session (Admin & Support Staff)',
  })
  adminLockConsignment(@ZodParam('id', UuidParamSchema) id: string) {
    return this.auctionService.adminLockConsignment(id);
  }

  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @Post('admin/:id/start')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Manually start an auction session and notify buyers (Admin & Support Staff)',
  })
  adminStartAuction(@ZodParam('id', UuidParamSchema) id: string) {
    return this.auctionService.adminStartAuction(id);
  }

  @Roles(Role.ADMIN)
  @Delete('admin/:id')
  @ApiOperation({ summary: 'Delete an unstarted auction room with no bids (Admin)' })
  adminDeleteAuction(@ZodParam('id', UuidParamSchema) id: string) {
    return this.auctionService.adminDeleteAuction(id);
  }

  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @Get('admin/:id/items')
  @ApiOperation({
    summary: 'List all consigned items in an auction session (Admin & Support Staff)',
  })
  adminGetAuctionItems(@ZodParam('id', UuidParamSchema) id: string) {
    return this.auctionService.adminGetAuctionItems(id);
  }

  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @Post('admin/items/:itemId/review')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Approve or reject a seller consigned item (Admin & Support Staff)',
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
    summary: 'End an individual auction lot (Admin & Support Staff)',
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
  @ApiOperation({ summary: 'List post-auction awards (Admin & Support Staff)' })
  listAdminAwards(@ZodQuery(OptionalAuctionIdQuerySchema) query: OptionalAuctionIdQuery) {
    return this.checkoutService!.listAwardsForAdmin(query.auctionId);
  }

  @Roles(Role.ADMIN)
  @Post('admin/awards/:awardId/payment-default')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Confirm 24-hour payment default: forfeit 30% deposit, deduct 10 reputation, and offer second chance (Admin)',
  })
  confirmPaymentDefault(
    @ZodParam('awardId', UuidParamSchema) awardId: string,
    @CurrentUser('id') adminId: string,
    @ZodBody(AdminAwardActionSchema) dto: AdminAwardActionInput,
  ) {
    if (!dto.confirmed) {
      throw new BadRequestException(
        'Explicit confirmation is required before marking payment default.',
      );
    }
    return this.checkoutService!.markPaymentDefault(awardId, adminId, dto.note);
  }

  @Roles(Role.ADMIN)
  @Post('admin/awards/:awardId/not-buying')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Confirm second-chance buyer withdrawal, refund 30% deposit if paid, and close the lot (Admin)',
  })
  confirmSecondChanceNotBuying(
    @ZodParam('awardId', UuidParamSchema) awardId: string,
    @CurrentUser('id') adminId: string,
    @ZodBody(AdminAwardActionSchema) dto: AdminAwardActionInput,
  ) {
    if (!dto.confirmed) {
      throw new BadRequestException(
        'Explicit confirmation is required before marking buyer withdrawal.',
      );
    }
    return this.checkoutService!.withdrawSecondChanceByAdmin(awardId, adminId, dto.note);
  }

  @Get(':id/eligibility')
  @ApiOperation({
    summary: 'Check buyer reputation, wallet balance, and buyer mode before bidding',
  })
  checkBuyerEligibility(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser('id') buyerId: string,
  ) {
    return this.auctionService.checkBuyerEligibility(id, buyerId);
  }

  @Public()
  @Get(':id/intro-showcase')
  @ApiOperation({ summary: 'Get 3D intro showcase synchronization data for an auction room' })
  @ApiOkResponse({ standardSchema: AuctionIntroShowcaseResponseSchema })
  getAuctionIntroShowcase(@ZodParam('id', UuidParamSchema) id: string) {
    return this.auctionService.getAuctionIntroShowcase(id);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get multi-lot auction room details with lots and bid history' })
  getAuctionDetail(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser() user?: AuthenticatedUserPayload,
  ) {
    return this.auctionService.getAuctionDetail(id, user?.id);
  }

  @Roles(Role.SELLER, Role.ADMIN)
  @Post(':id/register-item')
  @ApiOperation({
    summary:
      'Consign an auction item with GHN shipping dimensions and appraisal certificate (Seller)',
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
    summary: 'Place a bid on an auction lot (Seller mode is read-only)',
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
  @ApiOperation({ summary: 'Place a bid directly on a specific auction lot ID' })
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
    summary: 'Submit an auction complaint (Buyer or Seller)',
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
    summary: 'Open a live support chat with Support Staff for an auction room',
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
