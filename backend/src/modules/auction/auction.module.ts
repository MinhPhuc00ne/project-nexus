import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuctionController } from './controllers/auction.controller';
import { AuctionService } from './services/auction.service';
import { AuctionGateway } from './gateways/auction.gateway';

/**
 * AuctionModule encapsulates the live 3D bidding room lifecycle, anti-sniping protection,
 * and wallet escrow balance reservation for competitive bids.
 */
@Module({
  imports: [PrismaModule],
  controllers: [AuctionController],
  providers: [AuctionService, AuctionGateway],
  exports: [AuctionService, AuctionGateway],
})
export class AuctionModule {}
