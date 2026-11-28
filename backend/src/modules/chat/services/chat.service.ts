import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CloudinaryStorageService } from '../../../core/storage/cloudinary.service';
import {
  CreateConversationInput,
  QueryConversationsInput,
  QueryMessagesInput,
  QueryQueueInput,
  RequestSupportInput,
  SendMessageInput,
  UpdateConversationStatusInput,
} from '../dtos';
import { ChatAutoReplyService } from './chat-auto-reply.service';
import { ChatConversationService } from './chat-conversation.service';
import { ChatMessageService } from './chat-message.service';
import { ChatRealtimePublisher } from './chat-realtime.publisher';
import { ChatSupportService } from './chat-support.service';
import { StaffQueueService } from './staff-queue.service';

export interface ChatSocketBroadcaster {
  isUserOnline?(userId: string): Promise<boolean | null>;
  isSupportOnline?(): Promise<boolean | null>;
  broadcastMessage(conversationId: string, message: unknown): void;
  broadcastRead(conversationId: string, userId: string): void;
  broadcastToUser(userId: string, event: string, payload: unknown): void;
  broadcastToStaff(event: string, payload: unknown): void;
  broadcastStatusChange(
    conversationId: string,
    status: string,
    assignedStaffId?: string | null,
  ): void;
}

@Injectable()
export class ChatService {
  private readonly fallbackSupportService: ChatSupportService;
  private readonly fallbackConversationService: ChatConversationService;
  private readonly fallbackMessageService: ChatMessageService;

  constructor(
    prisma: PrismaService,
    cloudinary: CloudinaryStorageService,
    autoReplyService: ChatAutoReplyService,
    staffQueueService: StaffQueueService,
    realtime: ChatRealtimePublisher,
    @Optional() private readonly supportService?: ChatSupportService,
    @Optional() private readonly conversationService?: ChatConversationService,
    @Optional() private readonly messageService?: ChatMessageService,
  ) {
    this.fallbackSupportService =
      supportService ?? new ChatSupportService(prisma, staffQueueService, realtime);
    this.fallbackConversationService = conversationService ?? new ChatConversationService(prisma);
    this.fallbackMessageService =
      messageService ??
      new ChatMessageService(
        prisma,
        cloudinary,
        autoReplyService,
        staffQueueService,
        realtime,
        this.fallbackConversationService,
      );
  }

  private get support(): ChatSupportService {
    return this.supportService ?? this.fallbackSupportService;
  }

  private get conversations(): ChatConversationService {
    return this.conversationService ?? this.fallbackConversationService;
  }

  private get messages(): ChatMessageService {
    return this.messageService ?? this.fallbackMessageService;
  }

  async createOrGetConversation(
    currentUserId: string,
    currentUserRole: string,
    dto: CreateConversationInput,
  ) {
    return this.conversations.createOrGetConversation(currentUserId, currentUserRole, dto, {
      sendMessage: (senderId, senderRole, msgDto) => this.sendMessage(senderId, senderRole, msgDto),
      requestSupport: (userId, role, reqDto) => this.requestSupport(userId, role, reqDto),
      getOrCreateDisputeConversation: (disputeId, userId, role) =>
        this.getOrCreateDisputeConversation(disputeId, userId, role),
    });
  }

  async requestSupport(userId: string, role: string, dto: RequestSupportInput) {
    return this.support.requestSupport(
      userId,
      role,
      dto,
      (senderId, senderRole, msgDto) => this.sendMessage(senderId, senderRole, msgDto),
      (conv, senderId, senderRole, text) =>
        this.messages.triggerAutoReply(conv, senderId, senderRole, text),
    );
  }

  async getOrCreateDisputeConversation(disputeId: string, userId: string, role: string) {
    return this.support.getOrCreateDisputeConversation(
      disputeId,
      userId,
      role,
      (senderId, senderRole, msgDto) => this.sendMessage(senderId, senderRole, msgDto),
      (conv, senderId, senderRole, text) =>
        this.messages.triggerAutoReply(conv, senderId, senderRole, text),
    );
  }

  async getQueue(role: string, query: QueryQueueInput) {
    return this.support.getQueue(role, query);
  }

  async claimConversation(convId: string, staffId: string, role: string) {
    return this.support.claimConversation(convId, staffId, role);
  }

  async updateConversationStatus(
    convId: string,
    userId: string,
    role: string,
    dto: UpdateConversationStatusInput,
  ) {
    return this.support.updateConversationStatus(convId, userId, role, dto, (sId, sRole, msgDto) =>
      this.sendMessage(sId, sRole, msgDto),
    );
  }

  async processQueueForStaff(staffId: string): Promise<void> {
    return this.support.processQueueForStaff(staffId);
  }

  async listUserConversations(userId: string, role: string, query: QueryConversationsInput) {
    return this.conversations.listUserConversations(userId, role, query);
  }

  async assertConversationAccess(
    conversationId: string,
    userId: string,
    role: string,
  ): Promise<void> {
    return this.conversations.assertConversationAccess(conversationId, userId, role);
  }

  async getConversationById(id: string, userId: string, role: string) {
    return this.conversations.getConversationById(id, userId, role);
  }

  async listMessages(convId: string, userId: string, role: string, query: QueryMessagesInput) {
    return this.messages.listMessages(convId, userId, role, query);
  }

  async sendMessage(senderId: string, senderRole: string, dto: SendMessageInput) {
    return this.messages.sendMessage(senderId, senderRole, dto);
  }

  async markAsRead(convId: string, userId: string, role: string) {
    return this.messages.markAsRead(convId, userId, role);
  }

  async getTotalUnreadCount(userId: string) {
    return this.conversations.getTotalUnreadCount(userId);
  }

  async uploadAttachments(files: Express.Multer.File[]): Promise<string[]> {
    return this.messages.uploadAttachments(files);
  }

  async triggerAutoReply(
    conv: {
      id: string;
      type: string;
      participant1Id: string;
      participant2Id: string | null;
      status?: string;
      assignedStaffId?: string | null;
    },
    senderId: string,
    senderRole: string,
    text: string,
  ): Promise<void> {
    return this.messages.triggerAutoReply(conv, senderId, senderRole, text);
  }

  async saveAutoReply(
    conv: { id: string; participant1Id: string },
    senderId: string,
    reply: string,
  ) {
    return this.messages.saveAutoReply(conv, senderId, reply);
  }
}
