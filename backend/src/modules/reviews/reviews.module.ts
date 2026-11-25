import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { MediaModule } from '../media/media.module';
import { UsersModule } from '../users/users.module';
import { AdminReviewsController } from './controllers/admin-reviews.controller';
import { PublicReviewsController } from './controllers/public-reviews.controller';
import { ReportsController } from './controllers/reports.controller';
import { ReviewsController } from './controllers/reviews.controller';
import { SellerReviewsController } from './controllers/seller-reviews.controller';
import { ReportModerationController } from './controllers/report-moderation.controller';
import { SellerEngagementController } from './controllers/seller-engagement.controller';
import { ReportModerationService } from './services/report-moderation.service';
import { ReportsService } from './services/reports.service';
import { ReviewsModerationHelper } from './services/reviews-moderation.helper';
import { ReviewsRepliesHelper } from './services/reviews-replies.helper';
import { ReviewsService } from './services/reviews.service';
import { SellerEngagementService } from './services/seller-engagement.service';

/**
 * Reviews, replies and the reports raised against them.
 *
 * What a buyer says about a shop has nothing to do with settling an order, yet
 * it lived in the same module as escrow and refunds. Nothing outside reads
 * these services — the only reason they were bundled with commerce is that both
 * hang off an order — so the whole group moves out together, with the reports
 * that moderate it and the seller-facing views of both.
 */
@Module({
  imports: [PrismaModule, MediaModule, UsersModule],
  controllers: [
    ReviewsController,
    PublicReviewsController,
    SellerReviewsController,
    AdminReviewsController,
    ReportsController,
    ReportModerationController,
    SellerEngagementController,
  ],
  providers: [
    ReviewsService,
    ReviewsModerationHelper,
    ReviewsRepliesHelper,
    ReportsService,
    ReportModerationService,
    SellerEngagementService,
  ],
})
export class ReviewsModule {}
