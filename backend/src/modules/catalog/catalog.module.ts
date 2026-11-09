import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { CategoryService } from './services/category.service';
import { ProductService } from './services/product.service';
import { InventoryService } from './services/inventory.service';
import { ShopService } from './services/shop.service';
import { ProductSaleService } from './services/product-sale.service';
import { ProductSearchService } from './services/product-search.service';
import { CategoryController } from './controllers/category.controller';
import { ProductController } from './controllers/product.controller';
import { ShopController } from './controllers/shop.controller';
import { BannerController } from './controllers/banner.controller';
import { RecommendationsController } from './controllers/recommendations.controller';
import { BannerService } from './services/banner.service';
import { BannerHistoryService } from './services/banner-history.service';
import { RecommendationsService } from './services/recommendations.service';
import { AuctionStockService } from './services/auction-stock.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    CategoryController,
    ProductController,
    ShopController,
    BannerController,
    RecommendationsController,
  ],
  providers: [
    AuctionStockService,
    CategoryService,
    ProductService,
    InventoryService,
    ShopService,
    ProductSaleService,
    ProductSearchService,
    BannerService,
    BannerHistoryService,
    RecommendationsService,
  ],
  exports: [CategoryService, ProductService, InventoryService, ShopService, AuctionStockService],
})
export class CatalogModule {}
