import { Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodQuery, ZodParam } from '@nexus/contracts/nest';
import { Role, UuidParamSchema } from '@nexus/contracts';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { RolesGuard } from '../../../core/security/roles.guard';
import {
  CancelAutoReplyInput,
  CancelAutoReplySchema,
  CreateAutoReplyInput,
  CreateAutoReplySchema,
  QueryAutoRepliesInput,
  QueryAutoRepliesSchema,
  QueryMessagesInput,
  QueryMessagesSchema,
} from '../dtos';
import { ChatAutoReplyService } from '../services/chat-auto-reply.service';
import { ChatService } from '../services/chat.service';

@ApiTags('Admin Chat Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/chat')
export class AdminChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly autoReplyService: ChatAutoReplyService,
  ) {}

  @Get('auto-replies')
  @ApiOperation({
    summary: 'Quản trị viên xem danh sách tin nhắn tự động toàn sàn',
    description:
      'Có thể lọc theo scope (SYSTEM/SHOP), trạng thái (ACTIVE/CANCELLED_BY_ADMIN), hoặc theo gian hàng cụ thể.',
  })
  @ApiResponse({ status: 200, description: 'Danh sách tin nhắn tự động kèm phân trang.' })
  async listAutoReplies(@ZodQuery(QueryAutoRepliesSchema) query: QueryAutoRepliesInput) {
    return this.autoReplyService.listAutoRepliesForAdmin(query);
  }

  @Post('auto-replies/system')
  @ApiOperation({
    summary: 'Tạo tin nhắn tự động chung của hệ thống (cho nhân viên CSKH)',
    description:
      'Tự động gửi lời chào khi người dùng (Buyer hoặc Seller) bắt đầu nhắn tin với đội ngũ hỗ trợ.',
  })
  async createSystemAutoReply(
    @CurrentUser('id') adminId: string,
    @ZodBody(CreateAutoReplySchema) dto: CreateAutoReplyInput,
  ) {
    const data = await this.autoReplyService.createSystemAutoReply(adminId, dto);
    return { message: 'Tạo tin nhắn tự động hệ thống thành công.', data };
  }

  @Patch('auto-replies/:id/cancel')
  @ApiOperation({
    summary: 'Hủy/Khóa tin nhắn tự động của Seller kèm lý do vi phạm',
    description:
      'Chuyển trạng thái thành CANCELLED_BY_ADMIN, ghi nhận người hủy, thời gian và lý do hủy.',
  })
  async cancelSellerAutoReply(
    @CurrentUser('id') adminId: string,
    @ZodParam('id', UuidParamSchema) id: string,
    @ZodBody(CancelAutoReplySchema) dto: CancelAutoReplyInput,
  ) {
    const data = await this.autoReplyService.cancelSellerAutoReply(adminId, id, dto);
    return { message: 'Đã hủy tin nhắn tự động của gian hàng thành công.', data };
  }

  @Get('auto-replies/:id/history')
  @ApiOperation({ summary: 'Xem lịch sử hủy và lý do vi phạm của tin nhắn tự động' })
  async getAutoReplyHistory(@ZodParam('id', UuidParamSchema) id: string) {
    const data = await this.autoReplyService.getAutoReplyHistory(id);
    return { data };
  }

  @Get('conversations/:id/audit')
  @ApiOperation({
    summary: 'Giám sát chi tiết cuộc trò chuyện (Hiển thị đích danh nhân viên CSKH)',
    description:
      'Admin có thể xem chính xác tài khoản nhân viên (ID, tên thật, email) nào đã gửi từng tin nhắn trong ca trực.',
  })
  async auditConversation(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser('id') adminId: string,
    @ZodQuery(QueryMessagesSchema) query: QueryMessagesInput,
  ) {
    const data = await this.chatService.listMessages(id, adminId, Role.ADMIN, query);
    return { message: 'Truy vấn nhật ký tin nhắn cuộc trò chuyện thành công.', data };
  }
}
