import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { ChatModule } from '../chat/chat.module';
import { AuctionController } from './controllers/auction.controller';
import { AuctionComplaintService } from './services/auction-complaint.service';
import { AuctionService } from './services/auction.service';
import { AuctionGateway } from './gateways/auction.gateway';
import { CatalogModule } from '../catalog/catalog.module';
import { TreasuryModule } from '../treasury/treasury.module';
import { OrdersModule } from '../orders/orders.module';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';
import { UsersModule } from '../users/users.module';
import { AuctionLifecycleService } from './services/auction-lifecycle.service';
import { AuctionImageController } from './controllers/auction-image.controller';
import { AuctionImageService } from './services/auction-image.service';
import { AuctionAdminHelper } from './services/auction-admin.helper';
import { AuctionBiddingHelper } from './services/auction-bidding.helper';
import { AuctionConsignmentHelper } from './services/auction-consignment.helper';
import { AuctionCheckoutController } from './controllers/auction-checkout.controller';
import { AuctionCheckoutService } from './services/auction-checkout.service';
import { AuctionSecondChanceHelper } from './services/auction-second-chance.helper';

/**
 * AuctionModule encapsulates the live 3D multi-lot bidding lifecycle, anti-sniping protection,
 * 100%/30% wallet escrow flows, complaints, and Support Staff assistance.
 */
@Module({
  imports: [
    PrismaModule,
    CatalogModule,
    OrdersModule,
    ChatModule,
    FulfillmentModule,
    TreasuryModule,
    UsersModule,
  ],
  controllers: [AuctionController, AuctionImageController, AuctionCheckoutController],
  providers: [
    AuctionCheckoutService,
    AuctionSecondChanceHelper,
    AuctionAdminHelper,
    AuctionBiddingHelper,
    AuctionConsignmentHelper,
    AuctionService,
    AuctionComplaintService,
    AuctionGateway,
    AuctionLifecycleService,
    AuctionImageService,
  ],
  exports: [AuctionService, AuctionComplaintService, AuctionGateway, AuctionCheckoutService],
})
export class AuctionModule {}
