import { Module, forwardRef } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminUsersService } from './services/admin-users.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [AdminController],
  providers: [AdminService, AdminUsersService],
  exports: [AdminService, AdminUsersService],
})
export class AdminModule {}
