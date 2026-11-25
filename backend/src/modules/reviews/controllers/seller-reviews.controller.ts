import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@nexus/types';

import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { FeedbackPageDto, ReviewDto, SellerReplyReviewDto } from '../dtos/feedback.dto';
import { ReviewsService } from '../services/reviews.service';

/** What a seller can read of their reviews, and the replies they may leave. */
@ApiTags('Reviews (seller)')
@Controller()
export class SellerReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post('seller/orders/:orderId/customer-review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  customerReview(
    @CurrentUser('id') id: string,
    @Param('orderId') orderId: string,
    @Body() dto: ReviewDto,
  ): Promise<unknown> {
    return this.reviews.create(id, orderId, dto, 'customer');
  }

  @Get('seller/product-reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  sellerReviews(@CurrentUser('id') id: string, @Query() query: FeedbackPageDto): Promise<unknown> {
    return this.reviews.list(id, 'seller-products', query);
  }

  @Post('seller/product-reviews/:reviewId/reply')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seller phản hồi đánh giá sản phẩm của khách hàng' })
  replyProductReview(
    @CurrentUser('id') sellerId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: SellerReplyReviewDto,
  ): Promise<unknown> {
    return this.reviews.replyToProductReview(sellerId, reviewId, dto);
  }
}
