import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@nexus/types';

import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { CreateReviewReplyDto, FeedbackPageDto, ReviewDto } from '../dtos/feedback.dto';
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
    summary: 'Đánh giá gian hàng sau khi mua thành công từ 2 sản phẩm (hỗ trợ đính kèm ảnh/video)',
  })
  shopReview(
    @CurrentUser('id') id: string,
    @Param('orderId') orderId: string,
    @Body() dto: ReviewDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<unknown> {
    return this.reviews.create(id, orderId, dto, 'shop', undefined, files);
  }

  @Patch('commerce/orders/:orderId/shop-review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiOperation({ summary: 'Chỉnh sửa đánh giá gian hàng của chính mình' })
  updateShopReview(
    @CurrentUser('id') id: string,
    @Param('orderId') orderId: string,
    @Body() dto: ReviewDto,
  ): Promise<unknown> {
    return this.reviews.updateShopReview(id, orderId, dto);
  }

  @Delete('commerce/orders/:orderId/shop-review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiOperation({ summary: 'Xóa đánh giá gian hàng của chính mình' })
  deleteShopReview(
    @CurrentUser('id') id: string,
    @Param('orderId') orderId: string,
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
    summary: 'Đánh giá sản phẩm đã mua (hỗ trợ đính kèm ảnh/video multipart/form-data)',
  })
  productReview(
    @CurrentUser('id') id: string,
    @Param('orderId') orderId: string,
    @Param('productId') productId: string,
    @Body() dto: ReviewDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<unknown> {
    return this.reviews.create(id, orderId, dto, 'product', productId, files);
  }

  @Patch('commerce/orders/:orderId/products/:productId/review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiOperation({ summary: 'Chỉnh sửa đánh giá sản phẩm của chính mình' })
  updateProductReview(
    @CurrentUser('id') id: string,
    @Param('orderId') orderId: string,
    @Param('productId') productId: string,
    @Body() dto: ReviewDto,
  ): Promise<unknown> {
    return this.reviews.updateProductReview(id, orderId, productId, dto);
  }

  @Delete('commerce/orders/:orderId/products/:productId/review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiOperation({ summary: 'Xóa đánh giá sản phẩm của chính mình' })
  deleteProductReview(
    @CurrentUser('id') id: string,
    @Param('orderId') orderId: string,
    @Param('productId') productId: string,
  ): Promise<unknown> {
    return this.reviews.deleteProductReview(id, orderId, productId);
  }

  @Post('catalog/product-reviews/:reviewId/helpful')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bình chọn / bỏ bình chọn đánh giá sản phẩm hữu ích' })
  toggleHelpfulProductReview(
    @CurrentUser('id') userId: string,
    @Param('reviewId') reviewId: string,
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
    summary:
      'Buyer hoặc Seller gửi phản hồi 2 chiều trên đánh giá sản phẩm (hỗ trợ đính kèm ảnh/video)',
  })
  createProductReviewReply(
    @CurrentUser('id') userId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: CreateReviewReplyDto,
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
    summary:
      'Buyer hoặc Seller gửi phản hồi 2 chiều trên đánh giá gian hàng (hỗ trợ đính kèm ảnh/video)',
  })
  createShopReviewReply(
    @CurrentUser('id') userId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: CreateReviewReplyDto,
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
    @Query() query: FeedbackPageDto,
  ): Promise<unknown> {
    return this.reviews.list(id, 'customer', query);
  }
}
