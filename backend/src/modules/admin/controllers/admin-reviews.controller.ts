import { Controller, Delete, Get, HttpCode, HttpStatus, Patch, UseGuards } from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodQuery, ZodParam } from '@nexus/contracts/nest';
import { Role, UuidParamSchema } from '@nexus/contracts';

import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import {
  AdminDeleteReviewInput,
  AdminDeleteReviewSchema,
  AdminModerateReviewVisibilityInput,
  AdminModerateReviewVisibilitySchema,
  QueryAdminReviewsInput,
  QueryAdminReviewsSchema,
} from '../../reviews/dtos/feedback.dto';
import { ReviewsService } from '../../reviews/services/reviews.service';

/** Moderation of reviews and their replies. */
@ApiTags('Reviews (moderation)')
@Controller()
export class AdminReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('admin/reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @ApiOperation({
    summary: 'Admin/Staff tra cứu danh sách bình luận/đánh giá toàn sàn kèm điểm uy tín tác giả',
  })
  adminListReviews(
    @ZodQuery(QueryAdminReviewsSchema) query: QueryAdminReviewsInput,
  ): Promise<unknown> {
    return this.reviews.adminListReviews(query);
  }

  @Delete('admin/reviews/product/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin/Staff xóa bình luận sản phẩm vi phạm, trừ điểm uy tín tác giả và gửi thông báo',
  })
  adminDeleteProductReview(
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') actorRole: string,
    @ZodParam('id', UuidParamSchema) id: string,
    @ZodBody(AdminDeleteReviewSchema) dto: AdminDeleteReviewInput,
  ): Promise<unknown> {
    return this.reviews.adminDeleteReview(id, 'product', dto, actorRole, adminId);
  }

  @Delete('admin/reviews/product/:id/seller-reply')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Admin/Staff gỡ phản hồi (sellerReply) vi phạm trên đánh giá sản phẩm, trừ điểm uy tín Seller và gửi thông báo',
  })
  adminRemoveSellerReply(
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') actorRole: string,
    @ZodParam('id', UuidParamSchema) id: string,
    @ZodBody(AdminDeleteReviewSchema) dto: AdminDeleteReviewInput,
  ): Promise<unknown> {
    return this.reviews.adminRemoveSellerReply(id, dto, actorRole, adminId);
  }

  @Delete('admin/reviews/shop/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin/Staff xóa đánh giá gian hàng vi phạm, trừ điểm uy tín tác giả và gửi thông báo',
  })
  adminDeleteShopReview(
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') actorRole: string,
    @ZodParam('id', UuidParamSchema) id: string,
    @ZodBody(AdminDeleteReviewSchema) dto: AdminDeleteReviewInput,
  ): Promise<unknown> {
    return this.reviews.adminDeleteReview(id, 'shop', dto, actorRole, adminId);
  }

  @Patch('admin/reviews/product/:id/visibility')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Admin/Staff ẩn hoặc bỏ ẩn đánh giá sản phẩm tiêu cực (không xóa, tác giả vẫn xem được trạng thái bị ẩn)',
  })
  adminHideProductReview(
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') actorRole: string,
    @ZodParam('id', UuidParamSchema) id: string,
    @ZodBody(AdminModerateReviewVisibilitySchema) dto: AdminModerateReviewVisibilityInput,
  ): Promise<unknown> {
    return this.reviews.adminModerateReviewVisibility(adminId, 'product', id, dto, actorRole);
  }

  @Patch('admin/reviews/shop/:id/visibility')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin/Staff ẩn hoặc bỏ ẩn đánh giá gian hàng tiêu cực (không xóa)' })
  adminHideShopReview(
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') actorRole: string,
    @ZodParam('id', UuidParamSchema) id: string,
    @ZodBody(AdminModerateReviewVisibilitySchema) dto: AdminModerateReviewVisibilityInput,
  ): Promise<unknown> {
    return this.reviews.adminModerateReviewVisibility(adminId, 'shop', id, dto, actorRole);
  }

  @Patch('admin/reviews/replies/:replyId/visibility')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin/Staff ẩn hoặc bỏ ẩn tin nhắn phản hồi tiêu cực trong đánh giá (không xóa)',
  })
  adminHideReviewReply(
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') actorRole: string,
    @ZodParam('replyId', UuidParamSchema) replyId: string,
    @ZodBody(AdminModerateReviewVisibilitySchema) dto: AdminModerateReviewVisibilityInput,
  ): Promise<unknown> {
    return this.reviews.adminModerateReviewVisibility(adminId, 'reply', replyId, dto, actorRole);
  }
}
