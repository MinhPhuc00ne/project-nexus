import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { ChatModule } from '../chat/chat.module';
import { AuctionController } from './controllers/auction.controller';
import { AuctionComplaintService } from './services/auction-complaint.service';
import { AuctionService } from './services/auction.service';
import { AuctionGateway } from './gateways/auction.gateway';
import { CatalogModule } from '../catalog/catalog.module';
import { CommerceModule } from '../commerce/commerce.module';
import { AuctionLifecycleService } from './services/auction-lifecycle.service';
import { AuctionImageController } from './controllers/auction-image.controller';
import { AuctionImageService } from './services/auction-image.service';

/**
 * AuctionModule encapsulates the live 3D multi-lot bidding lifecycle, anti-sniping protection,
 * 100%/30% wallet escrow flows, complaints, and Support Staff assistance.
 */
@Module({
  imports: [PrismaModule, CatalogModule, CommerceModule, ChatModule],
  controllers: [AuctionController, AuctionImageController],
  providers: [
    AuctionService,
    AuctionComplaintService,
    AuctionGateway,
    AuctionLifecycleService,
    AuctionImageService,
  ],
  exports: [AuctionService, AuctionComplaintService, AuctionGateway],
})
export class AuctionModule {}
