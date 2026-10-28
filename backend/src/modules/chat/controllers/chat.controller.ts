import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ChatService, PaginationQuery } from '../services/chat.service';
import { CreateConversationDto, SendMessageDto } from '../dtos';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Tạo hoặc lấy cuộc trò chuyện' })
  public async createConversation(
    @CurrentUser() user: { id: string; role: Role },
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.createOrGetConversation(user.id, user.role, dto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Lấy danh sách cuộc trò chuyện của User' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  public async listUserConversations(
    @CurrentUser() user: { id: string; role: Role },
    @Query() query: PaginationQuery,
  ) {
    return this.chatService.listUserConversations(user.id, user.role, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Lấy tổng số tin nhắn chưa đọc' })
  public async getTotalUnreadCount(@CurrentUser() user: { id: string }) {
    return this.chatService.getTotalUnreadCount(user.id);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Lấy chi tiết cuộc trò chuyện theo ID' })
  public async getConversationById(
    @Param('id') conversationId: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.chatService.getConversationById(conversationId, user.id, user.role);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Lấy danh sách tin nhắn trong cuộc trò chuyện' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  public async listMessages(
    @Param('id') conversationId: string,
    @CurrentUser() user: { id: string; role: Role },
    @Query() query: PaginationQuery,
  ) {
    return this.chatService.listMessages(conversationId, user.id, user.role, query);
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Đánh dấu đã đọc cuộc trò chuyện' })
  public async markAsRead(
    @Param('id') conversationId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.chatService.markAsRead(conversationId, user.id);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Gửi tin nhắn mới' })
  public async sendMessage(
    @CurrentUser() user: { id: string; role: Role },
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(user.id, user.role, dto);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload hình ảnh chat lên Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 5))
  public async uploadAttachments(@UploadedFiles() files: Express.Multer.File[]) {
    const urls = await this.chatService.uploadAttachments(files);
    return { urls };
  }
}
