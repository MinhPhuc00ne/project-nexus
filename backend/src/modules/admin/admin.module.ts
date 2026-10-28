import { Module, forwardRef } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { BackofficeDisputesController } from './controllers/backoffice-disputes.controller';
import { AdminService } from './admin.service';
import { AdminUsersService } from './services/admin-users.service';
import { AdminProductsService } from './services/admin-products.service';
import { AdminShopsService } from './services/admin-shops.service';
import { AdminSettingsService } from './services/admin-settings.service';
import { AdminFinanceService } from './services/admin-finance.service';
import { AdminDisputesService } from './services/admin-disputes.service';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [forwardRef(() => AuthModule), CatalogModule],
  controllers: [AdminController, BackofficeDisputesController],
  providers: [
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
