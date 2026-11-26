import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { MediaModule } from '../media/media.module';
import { UsersModule } from '../users/users.module';
import { PublicReviewsController } from './controllers/public-reviews.controller';
import { ReportsController } from './controllers/reports.controller';
import { ReviewsController } from './controllers/reviews.controller';
import { SellerReviewsController } from './controllers/seller-reviews.controller';
import { SellerEngagementController } from './controllers/seller-engagement.controller';
import { ReportModerationService } from './services/report-moderation.service';
import { ReportsService } from './services/reports.service';
import { ReviewsModerationHelper } from './services/reviews-moderation.helper';
import { ReviewsRepliesHelper } from './services/reviews-replies.helper';
import { ReviewsService } from './services/reviews.service';
import { SellerEngagementService } from './services/seller-engagement.service';

/**
 * Reviews, replies and the reports raised against them.
 */
@Module({
  imports: [PrismaModule, MediaModule, UsersModule],
  controllers: [
    ReviewsController,
    PublicReviewsController,
    SellerReviewsController,
    ReportsController,
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
  exports: [ReviewsService, ReportModerationService],
})
export class ReviewsModule {}
