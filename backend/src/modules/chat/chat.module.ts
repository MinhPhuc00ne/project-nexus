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
import { StaffQueueService } from './services/staff-queue.service';
import { ChatbotController } from './controllers/chatbot.controller';
import { ChatbotService } from './services/chatbot.service';
import { ChatbotAiService } from './services/chatbot-ai.service';
import { ChatbotRateLimitService } from './services/chatbot-rate-limit.service';
import { CommerceQueryModule } from '../commerce/commerce-query.module';
import { ChatbotCommerceService } from './services/chatbot-commerce.service';

@Module({
  imports: [PrismaModule, StorageModule, CommerceQueryModule],
  controllers: [ChatController, SellerAutoReplyController, AdminChatController, ChatbotController],
  providers: [
    ChatbotCommerceService,
    ChatbotService,
    ChatbotAiService,
    ChatbotRateLimitService,
    ChatService,
    ChatAutoReplyService,
    StaffQueueService,
    ChatGateway,
    CloudinaryStorageService,
  ],
  exports: [ChatService, ChatAutoReplyService, StaffQueueService, ChatGateway],
})
export class ChatModule {}
