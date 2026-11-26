import { ShopsService } from './services/shops.service';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../../core/storage/storage.module';
import { UsersController } from './controllers/users.controller';
import { BuyerController } from './controllers/buyer.controller';
import { SellerController } from './controllers/seller.controller';
import { UsersService } from './services/users.service';
import { AddressService } from './services/address.service';
import { WishlistService } from './services/wishlist.service';
import { ReputationService } from './services/reputation.service';
import { UsersChatFacade } from './services/users-chat.facade';

@Module({
  imports: [AuthModule, StorageModule, FulfillmentModule, NotificationsModule],
  controllers: [UsersController, BuyerController, SellerController],
  providers: [
    ShopsService,
    UsersService,
    AddressService,
    WishlistService,
    ReputationService,
    UsersChatFacade,
  ],
  exports: [
    ShopsService,
    UsersService,
    AddressService,
    WishlistService,
    ReputationService,
    UsersChatFacade,
  ],
})
export class UsersModule {}
