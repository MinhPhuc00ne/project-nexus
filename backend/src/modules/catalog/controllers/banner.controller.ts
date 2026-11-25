import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@nexus/types';
import { CurrentUser, Public, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { BannerDto } from '../dtos/banner.dto';
import { ReorderBannersDto } from '../dtos/reorder-banners.dto';
import { BannerDisabledDto, BannerResponseDto } from '../dtos/banner-response.dto';
import { BannerHistoryPageDto, QueryBannerHistoryDto } from '../dtos/banner-history.dto';
import { BannerService } from '../services/banner.service';
import { BannerHistoryService } from '../services/banner-history.service';

/** Exposes public banner destinations and immediate, audited administrator/staff management. */
@Controller()
@ApiTags('Event banners')
export class BannerController {
  constructor(
    private readonly banners: BannerService,
    private readonly history: BannerHistoryService,
  ) {}

  /** Returns currently published banners. @returns Priority order with creator and date tie breakers. */
  @Get('catalog/banners')
  @Public()
  @ApiOperation({
    summary: 'Published banners',
    description:
      'Higher priorities appear first, then admin-created banners before staff-created banners, newest first within tied groups. Linked auctions use auctionId and targetUrl=/auction/:id. Expired or inactive banners are excluded.',
  })
  @ApiOkResponse({ type: [BannerResponseDto] })
  listPublic(): Promise<BannerResponseDto[]> {
    return this.banners.list(true);
  }

  /** Returns all banners to managers. @returns Active and inactive banner content and attribution. */
  @Get('staff/banners')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPORT_STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'Manage all banners',
    description:
      'Uses the same priority ordering as the public list. Includes creator identity and inactive banners.',
  })
  @ApiOkResponse({ type: [BannerResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'ADMIN or SUPPORT_STAFF only' })
  listAll(): Promise<BannerResponseDto[]> {
    return this.banners.list(false);
  }

  /** Reorders published and inactive banners. @returns Atomic ordering confirmation. */
  @Patch('staff/banners/order')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPORT_STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'Set banner display order',
    description:
      'Selected IDs appear first in the supplied order. Omitted banners follow with priority zero.',
  })
  @ApiOkResponse({ type: BannerDisabledDto })
  reorder(
    @CurrentUser('id') actorId: string,
    @Body() dto: ReorderBannersDto,
  ): Promise<{ success: true }> {
    return this.banners.reorder(actorId, dto.bannerIds);
  }

  /** Creates attributed content. @returns Banner with server-owned creator group and optional auction route. */
  @Post('staff/banners')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPORT_STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'Create a banner',
    description:
      'Set auctionId to link an existing public auction. The server derives targetUrl. Role at creation is immutable; higher priority displays first.',
  })
  @ApiCreatedResponse({ type: BannerResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid content, dates, or nonpublic auction' })
  @ApiNotFoundResponse({ description: 'Linked auction not found' })
  create(@CurrentUser('id') id: string, @Body() dto: BannerDto): ReturnType<BannerService['save']> {
    return this.banners.save(id, dto);
  }

  /**
   * Creates a banner directly from an existing auction without reentering its content.
   * @param actorId Authenticated administrator or staff identifier.
   * @param auctionId Source auction identifier.
   * @returns Published banner with the auction title, image and canonical destination.
   * @throws BadRequestException when the auction is nonpublic or has no image.
   * @throws NotFoundException when the auction does not exist.
   */
  @Post('staff/banners/from-auction/:auctionId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPORT_STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'Create a banner directly from an auction',
    description:
      'Copies the auction title and image, derives /auction/:id and publishes immediately. No request body is required. Add an auction image first; draft and cancelled auctions cannot be promoted.',
  })
  @ApiCreatedResponse({ type: BannerResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid UUID, nonpublic auction or missing auction image',
  })
  @ApiNotFoundResponse({ description: 'Auction not found' })
  createFromAuction(
    @CurrentUser('id') actorId: string,
    @Param('auctionId', new ParseUUIDPipe()) auctionId: string,
  ): Promise<BannerResponseDto> {
    return this.banners.createFromAuction(actorId, auctionId);
  }

  /** Updates content without changing creator attribution. @returns Persisted content after any audited deactivation. */
  @Put('staff/banners/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPORT_STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'Update or deactivate a banner',
    description:
      'isActive=false immediately disables a currently active banner and records its prior content and operator. Staff actions notify every admin without an approval request. Repeated disables do not duplicate history. Omit auctionId to retain the existing association, or set null to unlink.',
  })
  @ApiOkResponse({ type: BannerResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid payload or dates' })
  @ApiNotFoundResponse({ description: 'Banner or auction not found' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: BannerDto,
  ): ReturnType<BannerService['save']> {
    return this.banners.save(userId, dto, id);
  }

  /** Soft-deletes any creator's banner immediately. @returns Idempotent success with transactional history. */
  @Delete('staff/banners/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPORT_STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'Soft-delete a banner with audit history',
    description:
      'Staff may disable their own, another staff member, or an admin banner. No approval is required. Every real transition is audited; staff actions notify admins.',
  })
  @ApiOkResponse({ type: BannerDisabledDto })
  @ApiNotFoundResponse({ description: 'Banner not found' })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') actorId: string,
  ): Promise<BannerDisabledDto> {
    return this.banners.remove(id, actorId);
  }

  /** Disables a banner without requiring its full content payload. @returns Idempotent success. */
  @Patch('staff/banners/:id/disable')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPORT_STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'Deactivate a banner immediately',
    description:
      'Equivalent to soft deletion, with source=DISABLE in history. No body or approval request is required.',
  })
  @ApiOkResponse({ type: BannerDisabledDto })
  @ApiNotFoundResponse({ description: 'Banner not found' })
  disable(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('id') actorId: string,
  ): Promise<BannerDisabledDto> {
    return this.banners.remove(id, actorId, 'DISABLE');
  }

  /** Reads shared immutable audit history. @returns Paginated snapshots visible to every admin and staff account. */
  @Get('staff/banner-disable-history')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPORT_STAFF, Role.ADMIN)
  @ApiOperation({
    summary: 'Read shared banner disable history',
    description:
      'Read-only history, including who disabled whose banner and the prior/next state. Any staff account may view another staff member actions. Filter by bannerId, actorId, from and to. No history edit/delete endpoints exist.',
  })
  @ApiOkResponse({ type: BannerHistoryPageDto })
  @ApiBadRequestResponse({ description: 'Invalid filters or reversed date range' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'ADMIN or SUPPORT_STAFF only' })
  listHistory(@Query() query: QueryBannerHistoryDto): Promise<BannerHistoryPageDto> {
    return this.history.list(query);
  }
}
