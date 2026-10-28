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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { CurrentUser } from '../../../core/security/roles.decorator';
import {
  CreateConversationDto,
  QueryConversationsDto,
  QueryMessagesDto,
  SendMessageDto,
} from '../dtos';
import { ChatService } from '../services/chat.service';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  @ApiOperation({
    summary: 'Tạo hoặc mở cuộc trò chuyện (Buyer - Seller, Staff - Seller, Staff - Buyer)',
    description: 'Chặn hoàn toàn việc nhắn tin trực tiếp với Quản trị viên (Admin).',
  })
  @ApiResponse({ status: 201, description: 'Khởi tạo hoặc trả về cuộc trò chuyện hiện có.' })
  @ApiResponse({ status: 400, description: 'Không thể tự chat hoặc không thể chat với Admin.' })
  async createConversation(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CreateConversationDto,
  ) {
    const data = await this.chatService.createOrGetConversation(userId, role, dto);
    return { message: 'Khởi tạo cuộc trò chuyện thành công.', data };
  }

  @Get('conversations')
  @ApiOperation({
    summary: 'Lấy danh sách các cuộc trò chuyện của người dùng hiện tại',
    description: 'Nhân viên (SUPPORT_STAFF) sẽ thấy toàn bộ danh sách Hộp thư chung CSKH.',
  })
  async listConversations(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: QueryConversationsDto,
  ) {
    return this.chatService.listUserConversations(userId, role, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Lấy tổng số tin nhắn chưa đọc của người dùng' })
  async getTotalUnreadCount(@CurrentUser('id') userId: string) {
    return this.chatService.getTotalUnreadCount(userId);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Xem chi tiết một cuộc trò chuyện theo ID' })
  async getConversation(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const data = await this.chatService.getConversationById(id, userId, role);
    return { data };
  }

  @Get('conversations/:id/messages')
  @ApiOperation({
    summary: 'Lấy lịch sử tin nhắn của cuộc trò chuyện',
    description:
      'Tin nhắn từ nhân viên hỗ trợ được ẩn danh tên thành "Nhân viên Hỗ trợ Nexus" đối với khách hàng và các nhân viên khác.',
  })
  async listMessages(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: QueryMessagesDto,
  ) {
    const data = await this.chatService.listMessages(id, userId, role, query);
    return { data };
  }

  @Post('conversations/:id/messages')
  @ApiOperation({
    summary: 'Gửi tin nhắn mới vào cuộc trò chuyện (Chuẩn RESTful cho Frontend)',
    description: 'Tự động kiểm duyệt từ cấm/nhạy cảm và kích hoạt tin nhắn tự động (nếu có).',
  })
  async sendMessage(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: SendMessageDto,
  ) {
    const data = await this.chatService.sendMessage(userId, role, { ...dto, conversationId: id });
    return { message: 'Gửi tin nhắn thành công.', data };
  }

  @Post('messages')
  @ApiOperation({
    summary: 'Gửi tin nhắn mới (Alias hỗ trợ truyền conversationId trong Body)',
  })
  async sendMessageDirect(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: SendMessageDto,
  ) {
    const data = await this.chatService.sendMessage(userId, role, dto);
    return { message: 'Gửi tin nhắn thành công.', data };
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Đánh dấu đã đọc toàn bộ tin nhắn trong cuộc trò chuyện' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.chatService.markAsRead(id, userId, role);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload hình ảnh đính kèm chat lên Cloudinary (Tối đa 5 ảnh)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Danh sách tối đa 5 file ảnh tải lên',
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 5))
  async uploadAttachments(@UploadedFiles() files: Express.Multer.File[]) {
    const urls = await this.chatService.uploadAttachments(files);
    return { urls };
  }
}
