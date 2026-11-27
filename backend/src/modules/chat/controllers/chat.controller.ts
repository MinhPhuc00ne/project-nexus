import { UuidParamSchema } from '@nexus/contracts';
import {
  Controller,
  Get,
  Patch,
  Post,
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
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ZodBody, ZodQuery, ZodParam } from '@nexus/contracts/nest';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { CurrentUser } from '../../../core/security/roles.decorator';
import {
  CreateConversationInput,
  CreateConversationSchema,
  QueryConversationsInput,
  QueryConversationsSchema,
  QueryMessagesInput,
  QueryMessagesSchema,
  QueryQueueInput,
  QueryQueueSchema,
  RequestSupportInput,
  RequestSupportSchema,
  SendMessageInput,
  SendMessageSchema,
  UpdateConversationStatusInput,
  UpdateConversationStatusSchema,
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
    summary: 'Tạo hoặc mở cuộc trò chuyện trực tiếp (Buyer - Seller)',
    description:
      'Chặn Staff tự ý tạo chat trực tiếp với người dùng. Chặn người dùng chat trực tiếp với Admin. Đảm bảo mỗi tranh chấp chỉ tạo đúng 1 hội thoại.',
  })
  @ApiResponse({ status: 201, description: 'Khởi tạo hoặc trả về cuộc trò chuyện hiện có.' })
  @ApiResponse({
    status: 400,
    description: 'Không thể tự chat hoặc không thể nhắn tin trực tiếp cho Admin.',
  })
  @ApiResponse({
    status: 403,
    description: 'Nhân viên chỉ có thể phản hồi yêu cầu do người dùng gửi lên.',
  })
  async createConversation(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @ZodBody(CreateConversationSchema) dto: CreateConversationInput,
  ) {
    const data = await this.chatService.createOrGetConversation(userId, role, dto);
    return { message: 'Khởi tạo cuộc trò chuyện thành công.', data };
  }

  @Post('request-support')
  @ApiOperation({
    summary: 'Buyer / Seller gửi yêu cầu hỗ trợ lên Nhân viên CSKH (Đưa vào Hàng đợi FIFO)',
    description:
      'Tạo yêu cầu hỗ trợ với trạng thái OPEN. Hệ thống tự động ưu tiên gán cho Staff nào đang Online trước nhất. Đảm bảo mỗi tranh chấp chỉ có 1 cuộc trò chuyện.',
  })
  @ApiResponse({ status: 201, description: 'Yêu cầu hỗ trợ đã được tạo và đưa vào hàng đợi.' })
  async requestSupport(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @ZodBody(RequestSupportSchema) dto: RequestSupportInput,
  ) {
    const data = await this.chatService.requestSupport(userId, role, dto);
    return { message: 'Yêu cầu hỗ trợ đã được gửi thành công.', data };
  }

  @Post('support/request')
  @ApiOperation({
    summary: 'Alias gửi yêu cầu hỗ trợ (tương thích format đường dẫn RESTful)',
  })
  async requestSupportAlias(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @ZodBody(RequestSupportSchema) dto: RequestSupportInput,
  ) {
    const data = await this.chatService.requestSupport(userId, role, dto);
    return { message: 'Yêu cầu hỗ trợ đã được gửi thành công.', data };
  }

  @Post('disputes/:disputeId/conversation')
  @ApiOperation({
    summary: 'Tạo hoặc lấy duy nhất 1 cuộc trò chuyện hỗ trợ cho Khiếu nại / Tranh chấp',
    description:
      'Đảm bảo mỗi tranh chấp chỉ tạo DUY NHẤT một hội thoại. Trả về ngay hội thoại hiện có nếu đã tồn tại.',
  })
  @ApiParam({ name: 'disputeId', description: 'ID của khiếu nại tranh chấp' })
  @ApiResponse({ status: 200, description: 'Hội thoại tranh chấp duy nhất.' })
  async getDisputeConversation(
    @ZodParam('disputeId', UuidParamSchema) disputeId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const data = await this.chatService.getOrCreateDisputeConversation(disputeId, userId, role);
    return { message: 'Truy xuất hội thoại khiếu nại thành công.', data };
  }

  @Get('queue')
  @ApiOperation({
    summary: '[STAFF / ADMIN] Xem danh sách Hàng đợi yêu cầu hỗ trợ (FIFO Queue)',
    description:
      'Lấy danh sách các ticket đang chờ (status = OPEN, chưa có staff nhận), xếp theo thứ tự thời gian ai gửi trước đứng trước (FIFO) kèm thời gian chờ tính bằng giây.',
  })
  @ApiResponse({ status: 200, description: 'Danh sách hàng đợi hỗ trợ kèm phân trang.' })
  async getQueue(
    @CurrentUser('role') role: string,
    @ZodQuery(QueryQueueSchema) query: QueryQueueInput,
  ) {
    return this.chatService.getQueue(role, query);
  }

  @Post('conversations/:id/claim')
  @ApiOperation({
    summary: '[STAFF / ADMIN] Tiếp nhận (Claim) cuộc trò chuyện từ hàng đợi',
    description:
      'Nhân viên chủ động tiếp nhận xử lý ticket đang OPEN. Trạng thái chuyển thành IN_PROGRESS và gán assignedStaffId cho nhân viên này.',
  })
  @ApiParam({ name: 'id', description: 'ID cuộc trò chuyện cần tiếp nhận' })
  async claimConversation(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser('id') staffId: string,
    @CurrentUser('role') role: string,
  ) {
    const data = await this.chatService.claimConversation(id, staffId, role);
    return { message: 'Tiếp nhận cuộc trò chuyện thành công.', data };
  }

  @Patch('conversations/:id/status')
  @ApiOperation({
    summary: 'Cập nhật trạng thái cuộc trò chuyện (OPEN, IN_PROGRESS, RESOLVED, CLOSED)',
    description:
      'Staff phụ trách hoặc Admin có quyền cập nhật trạng thái. Khi chuyển thành RESOLVED/CLOSED, giải phóng slot của Staff và tự động kéo ticket tiếp theo trong hàng đợi về cho Staff đó.',
  })
  @ApiParam({ name: 'id', description: 'ID cuộc trò chuyện' })
  async updateStatus(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @ZodBody(UpdateConversationStatusSchema) dto: UpdateConversationStatusInput,
  ) {
    const data = await this.chatService.updateConversationStatus(id, userId, role, dto);
    return { message: 'Cập nhật trạng thái cuộc trò chuyện thành công.', data };
  }

  @Get('conversations')
  @ApiOperation({
    summary: 'Lấy danh sách các cuộc trò chuyện của người dùng hiện tại',
    description:
      'BỎ HOÀN TOÀN CHAT CHUNG: Nhân viên chỉ thấy các cuộc trò chuyện mà chính mình phụ trách. Khách hàng chỉ thấy hội thoại của mình.',
  })
  async listConversations(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @ZodQuery(QueryConversationsSchema) query: QueryConversationsInput,
  ) {
    return this.chatService.listUserConversations(userId, role, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Lấy tổng số tin nhắn chưa đọc của người dùng' })
  async getTotalUnreadCount(@CurrentUser('id') userId: string) {
    return this.chatService.getTotalUnreadCount(userId);
  }

  @Get('conversations/:id')
  @ApiOperation({
    summary: 'Xem chi tiết một cuộc trò chuyện theo ID',
    description:
      'Ẩn danh thông tin nhân viên hỗ trợ với khách hàng. Chỉ Admin mới thấy thông tin thực.',
  })
  async getConversation(
    @ZodParam('id', UuidParamSchema) id: string,
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
      'Tin nhắn từ nhân viên hỗ trợ được ẩn danh thành "Nhân viên Hỗ trợ" đối với khách hàng. Chỉ Admin mới thấy ID và tên thật nhân viên.',
  })
  async listMessages(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @ZodQuery(QueryMessagesSchema) query: QueryMessagesInput,
  ) {
    const data = await this.chatService.listMessages(id, userId, role, query);
    return { data };
  }

  @Post('conversations/:id/messages')
  @ApiOperation({
    summary: 'Gửi tin nhắn mới vào cuộc trò chuyện',
    description:
      'Tự động kiểm duyệt từ cấm/nhạy cảm. Nếu Staff phản hồi một hội thoại đang OPEN, hệ thống sẽ tự động gán và chuyển trạng thái sang IN_PROGRESS.',
  })
  async sendMessage(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @ZodBody(SendMessageSchema) dto: SendMessageInput,
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
    @ZodBody(SendMessageSchema) dto: SendMessageInput,
  ) {
    const data = await this.chatService.sendMessage(userId, role, dto);
    return { message: 'Gửi tin nhắn thành công.', data };
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Đánh dấu đã đọc toàn bộ tin nhắn trong cuộc trò chuyện' })
  async markAsRead(
    @ZodParam('id', UuidParamSchema) id: string,
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
