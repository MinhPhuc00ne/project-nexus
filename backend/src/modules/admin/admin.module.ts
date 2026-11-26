import { Module } from '@nestjs/common';
import { TreasuryModule } from '../treasury/treasury.module';
import { AdminStaffController } from './controllers/admin-staff.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminProductsController } from './controllers/admin-products.controller';
import { AdminCategoriesController } from './controllers/admin-categories.controller';
import { AdminShopsController } from './controllers/admin-shops.controller';
import { AdminFinanceController } from './controllers/admin-finance.controller';
import { AdminPlatformController } from './controllers/admin-platform.controller';
import { BackofficeDisputesController } from './controllers/backoffice-disputes.controller';
import { AdminService } from './services/admin.service';
import { AdminUsersService } from './services/admin-users.service';
import { AdminProductsService } from './services/admin-products.service';
import { AdminShopsService } from './services/admin-shops.service';
import { AdminSettingsService } from './services/admin-settings.service';
import { AdminFinanceService } from './services/admin-finance.service';
import { AdminDisputesService } from './services/admin-disputes.service';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import { AdminOrdersController } from './controllers/admin-orders.controller';
import { AdminOrdersService } from './services/admin-orders.service';
import { UsersModule } from '../users/users.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { AdminReputationController } from './controllers/admin-reputation.controller';
import { AdminReviewsController } from './controllers/admin-reviews.controller';
import { ReportModerationController } from './controllers/report-moderation.controller';
import { AdminShopsModerationHelper } from './services/admin-shops-moderation.helper';

@Module({
  imports: [TreasuryModule, AuthModule, CatalogModule, UsersModule, ReviewsModule],
  controllers: [
    AdminStaffController,
    AdminUsersController,
    AdminProductsController,
    AdminCategoriesController,
    AdminShopsController,
    AdminFinanceController,
    AdminPlatformController,
    BackofficeDisputesController,
    AdminOrdersController,
    AdminReputationController,
    AdminReviewsController,
    ReportModerationController,
  ],
  providers: [
    AdminShopsModerationHelper,
    AdminOrdersService,
    AdminService,
    AdminUsersService,
    AdminProductsService,
    AdminShopsService,
    AdminSettingsService,
    AdminFinanceService,
    AdminDisputesService,
  ],
  exports: [
    AdminService,
    AdminUsersService,
    AdminProductsService,
    AdminShopsService,
    AdminSettingsService,
    AdminFinanceService,
    AdminDisputesService,
  ],
})
export class AdminModule {}
