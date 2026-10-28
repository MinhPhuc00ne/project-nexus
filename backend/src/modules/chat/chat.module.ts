import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { CloudinaryStorageService } from '../../core/storage/cloudinary.service';
import { StorageModule } from '../../core/storage/storage.module';
import { AdminChatController } from './controllers/admin-chat.controller';
import { ChatController } from './controllers/chat.controller';
import { SellerAutoReplyController } from './controllers/seller-auto-reply.controller';
import { ChatGateway } from './gateways/chat.gateway';
import { ChatAutoReplyService } from './services/chat-auto-reply.service';
import { ChatService } from './services/chat.service';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [ChatController, SellerAutoReplyController, AdminChatController],
  providers: [ChatService, ChatAutoReplyService, ChatGateway, CloudinaryStorageService],
  exports: [ChatService, ChatAutoReplyService, ChatGateway],
})
export class ChatModule {}
