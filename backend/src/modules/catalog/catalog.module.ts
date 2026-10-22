import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { CategoryService } from './services/category.service';
import { ProductService } from './services/product.service';
import { InventoryService } from './services/inventory.service';
import { ShopService } from './services/shop.service';
import { CategoryController } from './controllers/category.controller';
import { ProductController } from './controllers/product.controller';
import { ShopController } from './controllers/shop.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CategoryController, ProductController, ShopController],
  providers: [CategoryService, ProductService, InventoryService, ShopService],
  exports: [CategoryService, ProductService, InventoryService, ShopService],
})
export class CatalogModule {}
