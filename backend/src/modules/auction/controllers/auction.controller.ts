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
import { BindAuctionProductDto } from '../dtos/bind-auction-product.dto';
import { AuctionIntroShowcaseResponseDto } from '../dtos/auction-showcase-response.dto';

/**
 * Controller exposing REST endpoints for central auction events, seller consignment
 * with online appraisal documentation, reputation checks, and live bidding lifecycle.
 */
@ApiTags('11. AUCTIONS')
@Controller('auctions')
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  /** Binds a fulfillable catalog item before the first bid. @returns Auction with reserved stock. */
  @Post('admin/:id/product')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: '[Admin] Bind catalog product and reserve inventory for an auction',
    description:
      'Binds a fulfillable catalog product to a scheduled auction room and holds inventory stock prior to receiving bids.',
  })
  @ApiResponse({
    status: 201,
    description: 'Product bound to auction and stock reserved successfully.',
  })
  bindProduct(
    @Param('id') id: string,
    @Body() dto: BindAuctionProductDto,
  ): ReturnType<AuctionService['bindProduct']> {
    return this.auctionService.bindProduct(id, dto.productId);
  }

  // ==========================================
  // PUBLIC & BUYER BROWSING ENDPOINTS
  // ==========================================

  /**
   * Retrieves public paginated auction listings.
   */
  @Public()
  @Get()
  @ApiOperation({
    summary: 'List public auction sessions',
    description:
      'Retrieves public paginated auction listings (SCHEDULED, ACTIVE, ENDED) with approved item counts and scheduled timeframes. Manual browsing uses this list and GET /auctions/:id. Each item includes targetUrl=/auction/:id, the same destination returned by linked banners and auction notifications.',
  })
  @ApiResponse({ status: 200, description: 'Paginated auction listings retrieved successfully.' })
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
    summary: 'Check buyer participation eligibility',
    description:
      'Evaluates the authenticated buyer reputation score and prior penalty/probation records against the session minBuyerReputation threshold.',
  })
  @ApiResponse({
    status: 200,
    description: 'Buyer participation eligibility assessment returned successfully.',
  })
  async checkBuyerEligibility(@Param('id') id: string, @CurrentUser('id') buyerId: string) {
    return this.auctionService.checkBuyerEligibility(id, buyerId);
  }

  /**
   * Retrieves bidding history for the current authenticated buyer.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my-bids')
  @ApiOperation({ summary: 'Retrieve current user bidding history' })
  @ApiResponse({ status: 200, description: 'User bidding history retrieved successfully.' })
  async getMyBids(@CurrentUser('id') userId: string) {
    return this.auctionService.getMyBids(userId);
  }

  /**
   * Retrieves synchronized live intro showcase telemetry for an auction session.
   */
  @Public()
  @Get(':id/intro-showcase')
  @ApiOperation({
    summary: 'Get synchronized live intro showcase data and playback offset (All Roles)',
    description:
      'Publicly accessible by Guest, Buyer, Seller, Support Staff, and Admin. Returns approved auction lots (with seller-submitted prices and appraisal certificate records) alongside serverTime, startedAt, introDurationMs, isIntroActive, and elapsedMs. Viewers joining mid-broadcast use elapsedMs to sync seamlessly into the ongoing live showcase, while real-time triggers arrive via WebSocket namespace /ws/auctions event "auction:started".',
  })
  @ApiResponse({
    status: 200,
    type: AuctionIntroShowcaseResponseDto,
    description:
      'Synchronized intro showcase payload including server clock offset and approved seller lots.',
  })
  async getAuctionIntroShowcase(@Param('id') id: string) {
    return this.auctionService.getAuctionIntroShowcase(id);
  }

  /**
   * Retrieves single auction details including product specifications, approved items, and bid logs.
   */
  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Get auction details and live intro synchronization telemetry by ID',
    description:
      'Retrieves comprehensive auction room details, approved consignment items with seller pricing and appraisal certificates, bid logs, plus serverTime, introDurationMs, elapsedMs, and isIntroActive for live intro playback synchronization.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Auction details retrieved successfully, including approved consignment items and live intro sync metadata.',
  })
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
    summary: '[Admin] Create a new auction session',
    description:
      'Admin creates and schedules a central auction event, configuring title, timeframe, and minimum reputation score thresholds for buyers and sellers.',
  })
  @ApiResponse({ status: 201, description: 'Auction session created successfully.' })
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
    summary: '[Admin] Update an upcoming auction session',
    description:
      'Allowed only when auction is in SCHEDULED or DRAFT state. Strictly prohibited when the session is currently ACTIVE or EXTENDED.',
  })
  @ApiResponse({ status: 200, description: 'Auction session updated successfully.' })
  async adminUpdateAuction(@Param('id') id: string, @Body() dto: AdminUpdateAuctionDto) {
    return this.auctionService.adminUpdateAuction(id, dto);
  }

  /**
   * Admin manually locks seller consignment registration for an auction session.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin/:id/lock-consignment')
  @ApiOperation({
    summary: '[Admin] Manually lock seller consignment registration',
    description:
      'Manually closes seller product consignment registration for an auction session before start. Blocks subsequent seller item submissions immediately and dispatches consignment closure notifications to all active sellers.',
  })
  @ApiResponse({
    status: 200,
    description: 'Auction consignment locked successfully and sellers notified.',
  })
  async adminLockConsignment(@Param('id') id: string) {
    return this.auctionService.adminLockConsignment(id);
  }

  /**
   * Admin starts a scheduled/draft auction session immediately and broadcasts the 3D intro showcase.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin/:id/start')
  @ApiOperation({
    summary: '[Admin] Start auction session and broadcast live intro showcase via WebSocket',
    description:
      'Transitions a DRAFT or SCHEDULED auction session into ACTIVE state, records startedAt, computes deterministic introDurationMs, emits WebSocket event "auction:started" on namespace /ws/auctions (carrying auctionId, title, startedAt, endTime, serverTime, introDurationMs, and full approved items), and returns the started session payload. Admin-only local replays never emit pause or skip socket events to viewer roles.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Auction session transitioned to ACTIVE, live intro showcase broadcast via WebSocket "auction:started", and full approved lots returned.',
  })
  async adminStartAuction(@Param('id') id: string) {
    return this.auctionService.adminStartAuction(id);
  }

  /**
   * Admin deletes or cancels an auction. Prohibits deletion when auction is ACTIVE or EXTENDED.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('admin/:id')
  @ApiOperation({
    summary: '[Admin] Delete or cancel an auction session',
    description:
      'Permits deletion only before the session begins. Deletes empty sessions or cancels sessions with existing consignments. Strictly prohibited when ACTIVE or EXTENDED.',
  })
  @ApiResponse({ status: 200, description: 'Auction session deleted or cancelled successfully.' })
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
    summary: '[Admin] List registered seller consignment items for an auction',
    description:
      'Lists all submitted consignment items, online appraisal certificate proofs, and warning flags if a seller has prior probation/penalty history.',
  })
  @ApiResponse({
    status: 200,
    description: 'Consigned items and appraisal documentation retrieved successfully.',
  })
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
    summary: '[Admin] Review (approve or reject) a consigned auction item',
    description:
      'Admin reviews online appraisal certificates: approves with assigned lot number and official starting price, or rejects with mandatory rationale.',
  })
  @ApiResponse({
    status: 200,
    description: 'Consignment review decision executed successfully.',
  })
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
    summary: '[Seller] Consign item for auction with online appraisal documents',
    description:
      'Seller submits product specifications, proposed pricing, and online appraisal certificate proofs. System validates seller reputation and flags prior probation/penalty history.',
  })
  @ApiResponse({
    status: 201,
    description: 'Consignment item registered successfully, pending admin review.',
  })
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
    summary: '[Seller] List my consigned auction items across all sessions',
    description:
      'Retrieves review status (PENDING_REVIEW, APPROVED, REJECTED) and rejection rationale if applicable.',
  })
  @ApiResponse({
    status: 200,
    description: 'Seller consignment items retrieved successfully.',
  })
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
  @ApiOperation({ summary: 'List auctions created by current seller (Legacy compatibility)' })
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
  @ApiOperation({ summary: 'Create auction listing from product (Legacy compatibility)' })
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
    summary: 'Submit competitive bid with wallet escrow lock',
    description:
      'Verifies bidder reputation requirements, locks bid deposit in NEXUS Pay wallet, refunds superseded bidders, and triggers anti-sniping extension.',
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
  @ApiOperation({ summary: 'Conclude and finalize auction session' })
  async endAuction(@Param('id') id: string, @CurrentUser() user: AuthenticatedUserPayload) {
    return this.auctionService.endAuction(id, user.id, user.role);
  }
}
