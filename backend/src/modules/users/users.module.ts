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
import { ReputationService } from './services/reputation.service';

@Module({
  imports: [AuthModule, StorageModule, FulfillmentModule, NotificationsModule],
  controllers: [UsersController, BuyerController, SellerController],
  providers: [UsersService, AddressService, ReputationService],
  exports: [UsersService, AddressService, ReputationService],
})
export class UsersModule {}
