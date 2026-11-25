import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
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
import { ReputationModule } from '../users/reputation.module';
import { AdminReputationController } from './controllers/admin-reputation.controller';
import { AdminShopsModerationHelper } from './services/admin-shops-moderation.helper';

@Module({
  imports: [AuthModule, CatalogModule, ReputationModule],
  controllers: [
    AdminController,
    BackofficeDisputesController,
    AdminOrdersController,
    AdminReputationController,
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
