import { Module } from '@nestjs/common';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';
import { StorageModule } from '../../core/storage/storage.module';
import { UsersController } from './controllers/users.controller';
import { BuyerController } from './controllers/buyer.controller';
import { SellerController } from './controllers/seller.controller';
import { UsersService } from './services/users.service';
import { AddressService } from './services/address.service';

@Module({
  imports: [StorageModule, FulfillmentModule],
  controllers: [UsersController, BuyerController, SellerController],
  providers: [UsersService, AddressService],
  exports: [UsersService, AddressService],
})
export class UsersModule {}
