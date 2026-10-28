import { Module } from '@nestjs/common';
import { ChatController } from './controllers/chat.controller';
import { ChatService } from './services/chat.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { CloudinaryStorageService } from '../../core/storage/cloudinary.service';
@Module({
  imports: [PrismaModule],
  controllers: [ChatController],
  providers: [ChatService, CloudinaryStorageService],
  exports: [ChatService],
})
export class ChatModule {}
