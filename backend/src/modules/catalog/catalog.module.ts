import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { CategoryService } from './services/category.service';
import { ProductService } from './services/product.service';
import { InventoryService } from './services/inventory.service';
import { CategoryController } from './controllers/category.controller';
import { ProductController } from './controllers/product.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CategoryController, ProductController],
  providers: [CategoryService, ProductService, InventoryService],
  exports: [CategoryService, ProductService, InventoryService],
})
export class CatalogModule {}
