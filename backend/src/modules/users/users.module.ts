import { ShopsService } from './services/shops.service';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';
import { ReputationModule } from './reputation.module';
import { StorageModule } from '../../core/storage/storage.module';
import { UsersController } from './controllers/users.controller';
import { BuyerController } from './controllers/buyer.controller';
import { SellerController } from './controllers/seller.controller';
import { UsersService } from './services/users.service';
import { AddressService } from './services/address.service';
import { WishlistService } from './services/wishlist.service';

@Module({
  imports: [AuthModule, StorageModule, FulfillmentModule, ReputationModule],
  controllers: [UsersController, BuyerController, SellerController],
  providers: [ShopsService, UsersService, AddressService, WishlistService],
  exports: [ShopsService, UsersService, AddressService, WishlistService, ReputationModule],
})
export class UsersModule {}
