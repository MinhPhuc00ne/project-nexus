import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodQuery, ZodParam } from '@nexus/contracts/nest';
import { Role, UuidParamSchema } from '@nexus/contracts';
import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import {
  QuerySellerDisputesInput,
  QuerySellerDisputesSchema,
  QuerySellerReviewsInput,
  QuerySellerReviewsSchema,
  RespondDisputeInput,
  RespondDisputeSchema,
} from '../dtos/seller-engagement.dto';
import { SellerEngagementService } from '../services/seller-engagement.service';

@ApiTags('8. COMMERCE - SELLER REVIEWS & DISPUTES')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SELLER, Role.ADMIN)
@Controller('seller')
export class SellerEngagementController {
  constructor(private readonly sellerEngagementService: SellerEngagementService) {}

  @Get('reviews')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] List customer reviews and star rating breakdown',
    description:
      'Retrieves buyer reviews for shop orders along with average rating and 1-to-5 star distribution.',
  })
  @ApiResponse({ status: 200, description: 'Reviews retrieved successfully' })
  async getReviews(
    @CurrentUser('id') sellerId: string,
    @ZodQuery(QuerySellerReviewsSchema) query: QuerySellerReviewsInput,
  ) {
    return this.sellerEngagementService.getReviews(sellerId, query);
  }

  @Get('disputes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] List disputes on shop orders',
    description:
      'Retrieves buyer-opened disputes with reason, evidence URLs, resolution status, and status counters.',
  })
  @ApiResponse({ status: 200, description: 'Disputes retrieved successfully' })
  async getDisputes(
    @CurrentUser('id') sellerId: string,
    @ZodQuery(QuerySellerDisputesSchema) query: QuerySellerDisputesInput,
  ) {
    return this.sellerEngagementService.getDisputes(sellerId, query);
  }

  @Post('disputes/:id/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] Submit dispute explanation and supporting evidence',
    description:
      'Allows the seller to respond to a buyer dispute with packaging image or video evidence for Admin review.',
  })
  @ApiResponse({ status: 200, description: 'Dispute response submitted successfully' })
  @ApiResponse({ status: 400, description: 'Dispute already closed or invalid input' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async respondToDispute(
    @CurrentUser('id') sellerId: string,
    @ZodParam('id', UuidParamSchema) disputeId: string,
    @ZodBody(RespondDisputeSchema) dto: RespondDisputeInput,
  ) {
    return this.sellerEngagementService.respondToDispute(sellerId, disputeId, dto);
  }
}
