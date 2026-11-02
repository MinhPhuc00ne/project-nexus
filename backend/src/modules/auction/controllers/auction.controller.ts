import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@nexus/types';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { CurrentUser, Public, Roles } from '../../../core/security/roles.decorator';
import { AuctionService } from '../services/auction.service';
import { AuctionQueryDto } from '../dtos/auction-query.dto';
import { CreateAuctionDto } from '../dtos/create-auction.dto';
import { PlaceBidDto } from '../dtos/place-bid.dto';

/**
 * Controller exposing REST endpoints for auction lifecycle, real-time bids and anti-sniping execution.
 */
@ApiTags('Auctions')
@Controller('auctions')
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  /**
   * Retrieves public paginated auction listings.
   *
   * @param query Filtering and pagination parameters
   * @returns List of active, scheduled or completed auctions
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách các phiên đấu giá công khai' })
  async getAuctions(@Query() query: AuctionQueryDto) {
    return this.auctionService.getAuctions(query);
  }

  /**
   * Retrieves auctions owned by the authenticated seller.
   *
   * @param sellerId Identifier of the authenticated seller
   * @param query Listing query criteria
   * @returns Seller specific auction listings
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @Get('my')
  @ApiOperation({ summary: 'Lấy danh sách các phiên đấu giá do người bán tạo' })
  async getMyAuctions(@CurrentUser('id') sellerId: string, @Query() query: AuctionQueryDto) {
    return this.auctionService.getMyAuctions(sellerId, query);
  }

  /**
   * Retrieves bidding history for the current authenticated buyer.
   *
   * @param userId Identifier of authenticated user
   * @returns History of placed bids and winning status
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my-bids')
  @ApiOperation({ summary: 'Lấy lịch sử trả giá của tài khoản hiện tại' })
  async getMyBids(@CurrentUser('id') userId: string) {
    return this.auctionService.getMyBids(userId);
  }

  /**
   * Retrieves single auction details including product specifications and bid logs.
   *
   * @param id Target auction unique identifier
   * @returns Comprehensive auction information
   */
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết phòng đấu giá theo mã định danh' })
  async getAuctionDetail(@Param('id') id: string) {
    return this.auctionService.getAuctionDetail(id);
  }

  /**
   * Initiates a new auction for an owned catalog product.
   *
   * @param sellerId Identifier of the seller creating the listing
   * @param dto Auction scheduling parameters
   * @returns Created auction entity
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Tạo và lên lịch phiên đấu giá mới cho sản phẩm' })
  async createAuction(@CurrentUser('id') sellerId: string, @Body() dto: CreateAuctionDto) {
    return this.auctionService.createAuction(sellerId, dto);
  }

  /**
   * Submits a competitive bid with wallet balance locking and automated anti-sniping extension.
   *
   * @param id Target auction unique identifier
   * @param userId Authenticated bidder identifier
   * @param dto Bid price specification
   * @returns Accepted bid record and updated room state
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/bids')
  @ApiOperation({ summary: 'Tham gia trả giá trong phòng đấu giá (Khóa cọc ví)' })
  async placeBid(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: PlaceBidDto,
  ) {
    return this.auctionService.placeBid(id, userId, dto);
  }

  /**
   * Finalizes an auction when scheduled duration concludes.
   *
   * @param id Target auction unique identifier
   * @returns Concluded auction state
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN, Role.SUPPORT_STAFF)
  @Post(':id/end')
  @ApiOperation({ summary: 'Kết thúc và chốt kết quả phiên đấu giá' })
  async endAuction(@Param('id') id: string) {
    return this.auctionService.endAuction(id);
  }
}
