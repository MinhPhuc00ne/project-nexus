import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { CurrentUser } from '../../../core/security/roles.decorator';
import { CreateConversationDto } from '../dtos/create-conversation.dto';
import { QueryConversationsDto, QueryMessagesDto } from '../dtos/query-chat.dto';
import { SendMessageDto } from '../dtos/send-message.dto';
import { ChatGateway } from '../gateways/chat.gateway';
import { ChatService } from '../services/chat.service';

@ApiTags('Chat Box')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post('conversations')
  @ApiOperation({
    summary: 'Tạo hoặc mở cuộc trò chuyện (Buyer - Seller, Staff - Seller, Staff - Buyer)',
  })
  async createOrGetConversation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    const result = await this.chatService.createOrGetConversation(userId, dto);
    return {
      message: 'Khởi tạo cuộc trò chuyện thành công.',
      data: result,
    };
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Lấy danh sách các cuộc trò chuyện của người dùng hiện tại' })
  async listConversations(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: QueryConversationsDto,
  ) {
    const result = await this.chatService.listUserConversations(userId, role, query);
    return result;
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Xem chi tiết một cuộc trò chuyện' })
  async getConversation(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const result = await this.chatService.getConversationById(id, userId, role);
    return {
      data: result,
    };
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Lấy lịch sử tin nhắn của cuộc trò chuyện' })
  async listMessages(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: QueryMessagesDto,
  ) {
    const result = await this.chatService.listMessages(id, userId, role, query);
    return {
      data: result,
    };
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Gửi tin nhắn mới vào cuộc trò chuyện' })
  async sendMessage(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: SendMessageDto,
  ) {
    const message = await this.chatService.sendMessage(id, userId, role, dto);

    // Đồng thời phát realtime qua WebSocket đến room tương ứng
    try {
      this.chatGateway.server?.to(`conversation:${id}`).emit('new_message', message);
    } catch {
      // Gateway emission optional in case socket server isn't bound yet
    }

    return {
      message: 'Gửi tin nhắn thành công.',
      data: message,
    };
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Đánh dấu đã đọc toàn bộ tin nhắn trong cuộc trò chuyện' })
  async markAsRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const result = await this.chatService.markAsRead(id, userId);

    try {
      this.chatGateway.server?.to(`conversation:${id}`).emit('messages_read', {
        conversationId: id,
        readBy: userId,
      });
    } catch {
      // Silently continue
    }

    return result;
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Lấy tổng số tin nhắn chưa đọc của người dùng' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const totalUnread = await this.chatService.getTotalUnreadCount(userId);
    return {
      unreadCount: totalUnread,
    };
  }
}
