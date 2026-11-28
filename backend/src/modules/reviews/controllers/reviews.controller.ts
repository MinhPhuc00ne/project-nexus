import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodQuery, ZodParam } from '@nexus/contracts/nest';
import { Role, UuidParamSchema } from '@nexus/contracts';

import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import {
  CreateReviewReplyInput,
  CreateReviewReplySchema,
  FeedbackPageInput,
  FeedbackPageSchema,
  ReviewInput,
  ReviewSchema,
} from '../dtos/feedback.dto';
import { ReviewsService } from '../services/reviews.service';

const REVIEW_CONSUMES_TYPES = ['application/json', 'multipart/form-data'] as const;

/**
 * The reviews a buyer writes, edits and withdraws.
 *
 * These lived in one `FeedbackController` of twenty routes that answered
 * buyers, sellers, administrators and guests at once, so reading how a buyer
 * edits their own review meant reading past admin moderation and public
 * listings. The routes are unchanged; only who declares them.
 */
@ApiTags('Reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post('commerce/orders/:orderId/shop-review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiConsumes(...REVIEW_CONSUMES_TYPES)
  @UseInterceptors(AnyFilesInterceptor())
  @ApiOperation({
    summary:
      'Submit a shop review after purchasing at least 2 items (supports image/video attachments)',
  })
  shopReview(
    @CurrentUser('id') id: string,
    @ZodParam('orderId', UuidParamSchema) orderId: string,
    @ZodBody(ReviewSchema) dto: ReviewInput,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<unknown> {
    return this.reviews.create(id, orderId, dto, 'shop', undefined, files);
  }

  @Patch('commerce/orders/:orderId/shop-review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiOperation({ summary: 'Edit my shop review' })
  updateShopReview(
    @CurrentUser('id') id: string,
    @ZodParam('orderId', UuidParamSchema) orderId: string,
    @ZodBody(ReviewSchema) dto: ReviewInput,
  ): Promise<unknown> {
    return this.reviews.updateShopReview(id, orderId, dto);
  }

  @Delete('commerce/orders/:orderId/shop-review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiOperation({ summary: 'Delete my shop review' })
  deleteShopReview(
    @CurrentUser('id') id: string,
    @ZodParam('orderId', UuidParamSchema) orderId: string,
  ): Promise<unknown> {
    return this.reviews.deleteShopReview(id, orderId);
  }

  @Post('commerce/orders/:orderId/products/:productId/review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiConsumes(...REVIEW_CONSUMES_TYPES)
  @UseInterceptors(AnyFilesInterceptor())
  @ApiOperation({
    summary: 'Submit a product review for a purchased item (supports multipart/form-data media)',
  })
  productReview(
    @CurrentUser('id') id: string,
    @ZodParam('orderId', UuidParamSchema) orderId: string,
    @ZodParam('productId', UuidParamSchema) productId: string,
    @ZodBody(ReviewSchema) dto: ReviewInput,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<unknown> {
    return this.reviews.create(id, orderId, dto, 'product', productId, files);
  }

  @Patch('commerce/orders/:orderId/products/:productId/review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiOperation({ summary: 'Edit my product review' })
  updateProductReview(
    @CurrentUser('id') id: string,
    @ZodParam('orderId', UuidParamSchema) orderId: string,
    @ZodParam('productId', UuidParamSchema) productId: string,
    @ZodBody(ReviewSchema) dto: ReviewInput,
  ): Promise<unknown> {
    return this.reviews.updateProductReview(id, orderId, productId, dto);
  }

  @Delete('commerce/orders/:orderId/products/:productId/review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiOperation({ summary: 'Delete my product review' })
  deleteProductReview(
    @CurrentUser('id') id: string,
    @ZodParam('orderId', UuidParamSchema) orderId: string,
    @ZodParam('productId', UuidParamSchema) productId: string,
  ): Promise<unknown> {
    return this.reviews.deleteProductReview(id, orderId, productId);
  }

  @Post('catalog/product-reviews/:reviewId/helpful')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle helpful vote on a product review' })
  toggleHelpfulProductReview(
    @CurrentUser('id') userId: string,
    @ZodParam('reviewId', UuidParamSchema) reviewId: string,
  ): Promise<unknown> {
    return this.reviews.toggleHelpfulProductReview(userId, reviewId);
  }

  @Post('commerce/product-reviews/:reviewId/replies')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiConsumes(...REVIEW_CONSUMES_TYPES)
  @UseInterceptors(AnyFilesInterceptor())
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit a two-way reply on a product review (Buyer or Seller, supports media)',
  })
  createProductReviewReply(
    @CurrentUser('id') userId: string,
    @ZodParam('reviewId', UuidParamSchema) reviewId: string,
    @ZodBody(CreateReviewReplySchema) dto: CreateReviewReplyInput,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<unknown> {
    return this.reviews.createReviewReply(userId, 'product', reviewId, dto, files);
  }

  @Post('commerce/shop-reviews/:reviewId/replies')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiConsumes(...REVIEW_CONSUMES_TYPES)
  @UseInterceptors(AnyFilesInterceptor())
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit a two-way reply on a shop review (Buyer or Seller, supports media)',
  })
  createShopReviewReply(
    @CurrentUser('id') userId: string,
    @ZodParam('reviewId', UuidParamSchema) reviewId: string,
    @ZodBody(CreateReviewReplySchema) dto: CreateReviewReplyInput,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<unknown> {
    return this.reviews.createReviewReply(userId, 'shop', reviewId, dto, files);
  }

  @Get('buyer/customer-reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  customerReviews(
    @CurrentUser('id') id: string,
    @ZodQuery(FeedbackPageSchema) query: FeedbackPageInput,
  ): Promise<unknown> {
    return this.reviews.list(id, 'customer', query);
  }
}
