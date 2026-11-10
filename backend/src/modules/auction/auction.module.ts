import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuctionController } from './controllers/auction.controller';
import { AuctionService } from './services/auction.service';
import { AuctionGateway } from './gateways/auction.gateway';
import { CatalogModule } from '../catalog/catalog.module';
import { CommerceModule } from '../commerce/commerce.module';
import { AuctionLifecycleService } from './services/auction-lifecycle.service';
import { AuctionImageController } from './controllers/auction-image.controller';
import { AuctionImageService } from './services/auction-image.service';

/**
 * AuctionModule encapsulates the live 3D bidding room lifecycle, anti-sniping protection,
 * and wallet escrow balance reservation for competitive bids.
 */
@Module({
  imports: [PrismaModule, CatalogModule, CommerceModule],
  controllers: [AuctionController, AuctionImageController],
  providers: [AuctionService, AuctionGateway, AuctionLifecycleService, AuctionImageService],
  exports: [AuctionService, AuctionGateway],
})
export class AuctionModule {}
