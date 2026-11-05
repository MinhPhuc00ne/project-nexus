import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { CommerceChatQueryService } from './services/commerce-chat-query.service';

/** Exposes Commerce-owned read operations without importing payment workflows. */
@Module({
  imports: [PrismaModule],
  providers: [CommerceChatQueryService],
  exports: [CommerceChatQueryService],
})
export class CommerceQueryModule {}
