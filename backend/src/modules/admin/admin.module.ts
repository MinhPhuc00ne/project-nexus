import { Module, forwardRef } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminUsersService } from './services/admin-users.service';
import { AdminProductsService } from './services/admin-products.service';
import { AdminShopsService } from './services/admin-shops.service';
import { AdminSettingsService } from './services/admin-settings.service';
import { AdminFinanceService } from './services/admin-finance.service';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [forwardRef(() => AuthModule), CatalogModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminUsersService,
    AdminProductsService,
    AdminShopsService,
    AdminSettingsService,
    AdminFinanceService,
  ],
  exports: [
    AdminService,
    AdminUsersService,
    AdminProductsService,
    AdminShopsService,
    AdminSettingsService,
    AdminFinanceService,
  ],
})
export class AdminModule {}
