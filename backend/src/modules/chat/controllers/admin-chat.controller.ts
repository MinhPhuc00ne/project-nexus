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
    summary: 'List marketplace auto-replies (Admin)',
    description:
      'Supports filtering by scope (SYSTEM or SHOP), status (ACTIVE or CANCELLED_BY_ADMIN), or specific shop.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of auto-replies.' })
  async listAutoReplies(@ZodQuery(QueryAutoRepliesSchema) query: QueryAutoRepliesInput) {
    return this.autoReplyService.listAutoRepliesForAdmin(query);
  }

  @Post('auto-replies/system')
  @ApiOperation({
    summary: 'Create a system-wide auto-reply for Support Staff',
    description: 'Automatically sends a greeting when a Buyer or Seller initiates a support chat.',
  })
  async createSystemAutoReply(
    @CurrentUser('id') adminId: string,
    @ZodBody(CreateAutoReplySchema) dto: CreateAutoReplyInput,
  ) {
    const data = await this.autoReplyService.createSystemAutoReply(adminId, dto);
    return { message: 'System auto-reply created successfully.', data };
  }

  @Patch('auto-replies/:id/cancel')
  @ApiOperation({
    summary: 'Cancel or lock a seller auto-reply with violation reason (Admin)',
    description:
      'Transitions status to CANCELLED_BY_ADMIN and records actor, timestamp, and reason.',
  })
  async cancelSellerAutoReply(
    @CurrentUser('id') adminId: string,
    @ZodParam('id', UuidParamSchema) id: string,
    @ZodBody(CancelAutoReplySchema) dto: CancelAutoReplyInput,
  ) {
    const data = await this.autoReplyService.cancelSellerAutoReply(adminId, id, dto);
    return { message: 'Seller auto-reply canceled successfully.', data };
  }

  @Get('auto-replies/:id/history')
  @ApiOperation({ summary: 'Get cancellation history and violation reason for an auto-reply' })
  async getAutoReplyHistory(@ZodParam('id', UuidParamSchema) id: string) {
    const data = await this.autoReplyService.getAutoReplyHistory(id);
    return { data };
  }

  @Get('conversations/:id/audit')
  @ApiOperation({
    summary: 'Audit conversation messages with Support Staff identity (Admin)',
    description:
      'Allows Admin to inspect the exact staff account (ID, full name, email) for each message.',
  })
  async auditConversation(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser('id') adminId: string,
    @ZodQuery(QueryMessagesSchema) query: QueryMessagesInput,
  ) {
    const data = await this.chatService.listMessages(id, adminId, Role.ADMIN, query);
    return { message: 'Conversation audit log retrieved successfully.', data };
  }
}
