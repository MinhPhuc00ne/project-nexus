import { UuidParamSchema } from '@nexus/contracts';
import { Controller, Get, Req } from '@nestjs/common';

import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodQuery, ZodParam } from '@nexus/contracts/nest';

import type { Request } from 'express';
import { TokenAuthService } from '../../../core/security/token-auth.service';
import { Public } from '../../../core/security/roles.decorator';

import { FeedbackPageInput, FeedbackPageSchema } from '../dtos/feedback.dto';
import { ReviewsService } from '../services/reviews.service';

/**
 * The review lists anybody can read, signed in or not.
 *
 * A guest sees the same list as a buyer, minus whose reviews are their own,
 * which is why these routes alone resolve an optional viewer from a bearer
 * token that may be absent or unusable.
 */
@ApiTags('Reviews (public)')
@Controller()
export class PublicReviewsController {
  constructor(
    private readonly reviews: ReviewsService,
    private readonly tokenAuth: TokenAuthService,
  ) {}

  /**
   * Resolves the signed-in reader of a publicly readable review list.
   *
   * @param req - The incoming request, which may carry no credentials at all.
   * @returns The viewer’s id, or undefined for a guest or an unusable token.
   */
  private async extractOptionalViewerId(req?: Request): Promise<string | undefined> {
    const authHeader = req?.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return undefined;
    const viewer = await this.tokenAuth.authenticateOptional(authHeader.substring(7));
    return viewer?.id;
  }

  @Get('catalog/shops/:id/reviews')
  @Public()
  @ApiOperation({
    summary:
      'Danh sách đánh giá gian hàng kèm averageRating và phân bố sao 1-5 (ẩn review tiêu cực đã bị admin ẩn)',
  })
  async shopReviews(
    @ZodParam('id', UuidParamSchema) id: string,
    @ZodQuery(FeedbackPageSchema) query: FeedbackPageInput,
    @Req() req?: Request,
  ): Promise<unknown> {
    return this.reviews.list(id, 'shop', query, await this.extractOptionalViewerId(req));
  }

  @Get('catalog/products/:id/reviews')
  @Public()
  async productReviews(
    @ZodParam('id', UuidParamSchema) id: string,
    @ZodQuery(FeedbackPageSchema) query: FeedbackPageInput,
    @Req() req?: Request,
  ): Promise<unknown> {
    return this.reviews.list(id, 'product', query, await this.extractOptionalViewerId(req));
  }

  @Get('catalog/product-reviews/:reviewId/replies')
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách phản hồi 2 chiều (có phân trang) cho đánh giá sản phẩm' })
  async listProductReviewReplies(
    @ZodParam('reviewId', UuidParamSchema) reviewId: string,
    @ZodQuery(FeedbackPageSchema) query: FeedbackPageInput,
    @Req() req?: Request,
  ): Promise<unknown> {
    return this.reviews.listReviewReplies(
      'product',
      reviewId,
      query,
      await this.extractOptionalViewerId(req),
    );
  }

  @Get('catalog/shop-reviews/:reviewId/replies')
  @Public()
  @ApiOperation({
    summary: 'Lấy danh sách phản hồi 2 chiều (có phân trang) cho đánh giá gian hàng',
  })
  async listShopReviewReplies(
    @ZodParam('reviewId', UuidParamSchema) reviewId: string,
    @ZodQuery(FeedbackPageSchema) query: FeedbackPageInput,
    @Req() req?: Request,
  ): Promise<unknown> {
    return this.reviews.listReviewReplies(
      'shop',
      reviewId,
      query,
      await this.extractOptionalViewerId(req),
    );
  }
}
