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
    summary: 'Create or open a direct conversation (Buyer - Seller)',
    description:
      'Prevents staff from initiating direct chats with users and blocks direct messaging to Admin. Ensures a single conversation per dispute.',
  })
  @ApiResponse({ status: 201, description: 'Created or returned existing conversation.' })
  @ApiResponse({
    status: 400,
    description: 'Self-chat or direct Admin messaging is not allowed.',
  })
  @ApiResponse({
    status: 403,
    description: 'Staff may only respond to user-submitted support requests.',
  })
  async createConversation(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @ZodBody(CreateConversationSchema) dto: CreateConversationInput,
  ) {
    const data = await this.chatService.createOrGetConversation(userId, role, dto);
    return { message: 'Conversation initialized successfully.', data };
  }

  @Post('request-support')
  @ApiOperation({
    summary: 'Submit a support request to the Support Staff FIFO queue (Buyer / Seller)',
    description:
      'Creates an OPEN support conversation, prioritizing online staff assignment and enforcing one conversation per dispute.',
  })
  @ApiResponse({ status: 201, description: 'Support request created and queued.' })
  async requestSupport(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @ZodBody(RequestSupportSchema) dto: RequestSupportInput,
  ) {
    const data = await this.chatService.requestSupport(userId, role, dto);
    return { message: 'Support request submitted successfully.', data };
  }

  @Post('support/request')
  @ApiOperation({
    summary: 'Alias for submitting a support request',
  })
  async requestSupportAlias(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @ZodBody(RequestSupportSchema) dto: RequestSupportInput,
  ) {
    const data = await this.chatService.requestSupport(userId, role, dto);
    return { message: 'Support request submitted successfully.', data };
  }

  @Post('disputes/:disputeId/conversation')
  @ApiOperation({
    summary: 'Get or create the single support conversation for a dispute',
    description:
      'Ensures each dispute maps to a single conversation, returning the existing one if present.',
  })
  @ApiParam({ name: 'disputeId', description: 'Dispute ID' })
  @ApiResponse({ status: 200, description: 'Dispute conversation retrieved.' })
  async getDisputeConversation(
    @ZodParam('disputeId', UuidParamSchema) disputeId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const data = await this.chatService.getOrCreateDisputeConversation(disputeId, userId, role);
    return { message: 'Dispute conversation retrieved successfully.', data };
  }

  @Get('queue')
  @ApiOperation({
    summary: '[STAFF / ADMIN] List the support request FIFO queue',
    description: 'Lists unassigned OPEN support tickets ordered FIFO with wait time in seconds.',
  })
  @ApiResponse({ status: 200, description: 'Paginated support queue.' })
  async getQueue(
    @CurrentUser('role') role: string,
    @ZodQuery(QueryQueueSchema) query: QueryQueueInput,
  ) {
    return this.chatService.getQueue(role, query);
  }

  @Post('conversations/:id/claim')
  @ApiOperation({
    summary: '[STAFF / ADMIN] Claim an OPEN conversation from the support queue',
    description:
      'Assigns the ticket to the claiming staff member and transitions status to IN_PROGRESS.',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID to claim' })
  async claimConversation(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser('id') staffId: string,
    @CurrentUser('role') role: string,
  ) {
    const data = await this.chatService.claimConversation(id, staffId, role);
    return { message: 'Conversation claimed successfully.', data };
  }

  @Patch('conversations/:id/status')
  @ApiOperation({
    summary: 'Update conversation status (OPEN, IN_PROGRESS, RESOLVED, CLOSED)',
    description:
      'Assigned Staff or Admin may update status. Transitioning to RESOLVED or CLOSED frees the staff slot and assigns the next queued ticket.',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  async updateStatus(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @ZodBody(UpdateConversationStatusSchema) dto: UpdateConversationStatusInput,
  ) {
    const data = await this.chatService.updateConversationStatus(id, userId, role, dto);
    return { message: 'Conversation status updated successfully.', data };
  }

  @Get('conversations')
  @ApiOperation({
    summary: 'List conversations for the authenticated user',
    description:
      'Staff see only their assigned conversations; customers see only their own conversations.',
  })
  async listConversations(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @ZodQuery(QueryConversationsSchema) query: QueryConversationsInput,
  ) {
    return this.chatService.listUserConversations(userId, role, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread message count for the authenticated user' })
  async getTotalUnreadCount(@CurrentUser('id') userId: string) {
    return this.chatService.getTotalUnreadCount(userId);
  }

  @Get('conversations/:id')
  @ApiOperation({
    summary: 'Get conversation details by ID',
    description: 'Anonymizes Support Staff identity for customers; only Admin sees real identity.',
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
    summary: 'List conversation message history',
    description:
      'Support Staff messages are anonymized to customers; only Admin sees staff ID and real name.',
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
    summary: 'Send a new message in a conversation',
    description:
      'Applies content moderation automatically. When Staff replies to an OPEN conversation, it is assigned and moved to IN_PROGRESS.',
  })
  async sendMessage(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @ZodBody(SendMessageSchema) dto: SendMessageInput,
  ) {
    const data = await this.chatService.sendMessage(userId, role, { ...dto, conversationId: id });
    return { message: 'Message sent successfully.', data };
  }

  @Post('messages')
  @ApiOperation({
    summary: 'Send a new message (alias accepting conversationId in body)',
  })
  async sendMessageDirect(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @ZodBody(SendMessageSchema) dto: SendMessageInput,
  ) {
    const data = await this.chatService.sendMessage(userId, role, dto);
    return { message: 'Message sent successfully.', data };
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Mark all messages in a conversation as read' })
  async markAsRead(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.chatService.markAsRead(id, userId, role);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload chat image attachments to Cloudinary (max 5 images)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Up to 5 image files',
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
