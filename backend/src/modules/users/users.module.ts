import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersService as ModularUsersService } from './services/users.service';
import { BuyerController } from './controllers/buyer.controller';
import { SellerController } from './controllers/seller.controller';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../../core/storage/storage.module';

@Module({
  imports: [forwardRef(() => AuthModule), StorageModule],
  controllers: [UsersController, BuyerController, SellerController],
  providers: [UsersService, ModularUsersService],
  exports: [UsersService, ModularUsersService],
})
export class UsersModule {}
