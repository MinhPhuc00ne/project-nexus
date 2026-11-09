import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReputationService } from './services/reputation.service';

/** Exposes reputation independently of profile, shipping, or authentication controllers. */
@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [ReputationService],
  exports: [ReputationService],
})
export class ReputationModule {}
