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
    summary: 'List marketplace reviews with author reputation scores (Admin & Support Staff)',
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
    summary:
      'Delete a violating product review, deduct author reputation, and notify (Admin & Support Staff)',
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
      'Remove a violating seller reply on a product review, deduct seller reputation, and notify (Admin & Support Staff)',
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
    summary:
      'Delete a violating shop review, deduct author reputation, and notify (Admin & Support Staff)',
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
      'Hide or unhide a negative product review without deletion; the author can still view its hidden status (Admin & Support Staff)',
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
  @ApiOperation({
    summary: 'Hide or unhide a negative shop review without deletion (Admin & Support Staff)',
  })
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
    summary: 'Hide or unhide a negative review reply without deletion (Admin & Support Staff)',
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
