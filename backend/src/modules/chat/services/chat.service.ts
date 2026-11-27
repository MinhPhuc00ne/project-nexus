import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ChatMessage } from '@prisma/client';
import { CloudinaryStorageService } from '../../../core/storage/cloudinary.service';
import { assertCleanContent } from '../../../core/moderation/content-moderation.util';
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
import { SUPPORT_STAFF_MASK, maskStaffSender } from './chat-mask.util';
import { StaffQueueService } from './staff-queue.service';
import { ChatRealtimePublisher } from './chat-realtime.publisher';
import { ChatSupportService } from './chat-support.service';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryStorageService,
    private readonly autoReplyService: ChatAutoReplyService,
    private readonly staffQueueService: StaffQueueService,
    private readonly realtime: ChatRealtimePublisher,
    @Optional() private readonly supportService?: ChatSupportService,
  ) {
    this.fallbackSupportService =
      supportService ?? new ChatSupportService(prisma, staffQueueService, realtime);
  }

  private get support(): ChatSupportService {
    return this.supportService ?? this.fallbackSupportService;
  }

  /**
   * Initializes or retrieves a direct conversation between participants.
   *
   * @param currentUserId - Initiator user identifier
   * @param currentUserRole - Initiator role
   * @param dto - Conversation creation parameters
   * @returns Established Conversation entity
   * @throws BadRequestException when partner ID is missing, self-chat is attempted, or target is Admin
   * @throws ForbiddenException when Support Staff attempts unrequested outreach
   */
  async createOrGetConversation(
    currentUserId: string,
    currentUserRole: string,
    dto: CreateConversationInput,
  ) {
    const recipientId = (dto.participantId || dto.targetUserId || '').trim();
    if (!recipientId && dto.contextType !== 'DISPUTE') {
      throw new BadRequestException('Vui lòng cung cấp ID đối tác trò chuyện.');
    }
    if (recipientId && currentUserId === recipientId) {
      throw new BadRequestException('Không thể tự tạo cuộc trò chuyện với chính mình.');
    }

    if (dto.contextType === 'DISPUTE' && dto.contextId) {
      return this.getOrCreateDisputeConversation(dto.contextId, currentUserId, currentUserRole);
    }

    if (currentUserRole === 'SUPPORT_STAFF') {
      throw new ForbiddenException(
        'Nhân viên hỗ trợ chỉ có thể phản hồi yêu cầu hỗ trợ hoặc giải quyết tranh chấp do người dùng gửi lên.',
      );
    }

    const partner = await this.prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, fullName: true, email: true, avatarUrl: true, role: true },
    });
    if (!partner) {
      throw new NotFoundException('Không tìm thấy người dùng tham gia cuộc trò chuyện.');
    }

    if (partner.role === 'ADMIN') {
      throw new BadRequestException(
        'Không thể nhắn tin trực tiếp cho Quản trị viên. Mọi khiếu nại hoặc hỗ trợ vui lòng gửi qua Trung tâm Trợ giúp.',
      );
    }

    if (partner.role === 'SUPPORT_STAFF') {
      return this.requestSupport(currentUserId, currentUserRole, {
        subject: dto.title,
        message: dto.initialMessage || 'Tôi cần hỗ trợ từ nhân viên CSKH.',
        contextId: dto.contextId,
        contextType: dto.contextType || 'GENERAL',
      });
    }

    let existing = await this.prisma.chatConversation.findFirst({
      where: {
        type: 'BUYER_SELLER',
        OR: [
          { participant1Id: currentUserId, participant2Id: recipientId },
          { participant1Id: recipientId, participant2Id: currentUserId },
        ],
        ...(dto.contextId ? { contextId: dto.contextId } : {}),
      },
      include: {
        participant1: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
        participant2: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
        assignedStaff: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
      },
    });

    if (!existing) {
      existing = await this.prisma.chatConversation.create({
        data: {
          type: 'BUYER_SELLER',
          participant1Id: currentUserId,
          participant2Id: recipientId,
          title: dto.title || null,
          contextId: dto.contextId || null,
          contextType: dto.contextType || null,
          status: 'IN_PROGRESS',
        },
        include: {
          participant1: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
          participant2: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
          assignedStaff: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
        },
      });
    }

    if (dto.initialMessage?.trim()) {
      await this.sendMessage(currentUserId, currentUserRole, {
        conversationId: existing.id,
        content: dto.initialMessage.trim(),
      });
    }

    return existing;
  }

  /**
   * Submits a customer support request, allocating it to the next available staff or the FIFO queue.
   *
   * @param userId - Requesting user identifier
   * @param role - Requesting user role
   * @param dto - Support request payload
   * @returns Created support Conversation entity
   */
  async requestSupport(userId: string, role: string, dto: RequestSupportInput) {
    return this.support.requestSupport(
      userId,
      role,
      dto,
      (senderId, senderRole, msgDto) => this.sendMessage(senderId, senderRole, msgDto),
      (conv, senderId, senderRole, text) => this.triggerAutoReply(conv, senderId, senderRole, text),
    );
  }

  /**
   * Retrieves or initializes a unique support conversation bound to a dispute.
   */
  async getOrCreateDisputeConversation(disputeId: string, userId: string, role: string) {
    return this.support.getOrCreateDisputeConversation(
      disputeId,
      userId,
      role,
      (senderId, senderRole, msgDto) => this.sendMessage(senderId, senderRole, msgDto),
      (conv, senderId, senderRole, text) => this.triggerAutoReply(conv, senderId, senderRole, text),
    );
  }

  /**
   * Retrieves paginated support queue tickets adhering to FIFO ordering.
   */
  async getQueue(role: string, query: QueryQueueInput) {
    return this.support.getQueue(role, query);
  }

  /**
   * Allows support staff to claim an unassigned support ticket from the FIFO queue.
   */
  async claimConversation(convId: string, staffId: string, role: string) {
    return this.support.claimConversation(convId, staffId, role);
  }

  /**
   * Updates conversation lifecycle status (OPEN, IN_PROGRESS, RESOLVED, CLOSED).
   */
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

  /**
   * Automatically allocates the next FIFO queue ticket to an idle support staff member.
   */
  async processQueueForStaff(staffId: string): Promise<void> {
    return this.support.processQueueForStaff(staffId);
  }

  /**
   * Retrieves user conversations with role-based scoping and staff identity masking.
   *
   * @param userId - Requesting user identifier
   * @param role - Requesting user role
   * @param query - Query filter and pagination parameters
   * @returns Paginated conversation summaries
   */
  async listUserConversations(userId: string, role: string, query: QueryConversationsInput) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const isAuditAdmin = role === 'ADMIN';
    let where: Record<string, unknown>;

    if (isAuditAdmin) {
      where = {};
      if (query.type) where.type = query.type;
    } else if (role === 'SUPPORT_STAFF') {
      where = {
        OR: [{ assignedStaffId: userId }, { participant2Id: userId }],
      };
      if (query.type) where.type = query.type;
    } else {
      where = {
        OR: [{ participant1Id: userId }, { participant2Id: userId }],
      };
      if (query.type) where.type = query.type;
    }

    const [items, total] = await Promise.all([
      this.prisma.chatConversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          participant1: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
          participant2: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
          assignedStaff: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
          messages: { take: 1, orderBy: { createdAt: 'desc' } },
        },
      }),
      this.prisma.chatConversation.count({ where }),
    ]);

    const formatted = items.map((conv) => {
      const isStaffInvolved =
        conv.participant2?.role === 'SUPPORT_STAFF' || conv.assignedStaff?.role === 'SUPPORT_STAFF';

      if (isStaffInvolved && !isAuditAdmin) {
        return {
          ...conv,
          participant2:
            conv.participant2?.role === 'SUPPORT_STAFF' ? SUPPORT_STAFF_MASK : conv.participant2,
          assignedStaff: conv.assignedStaff ? SUPPORT_STAFF_MASK : null,
        };
      }
      return conv;
    });

    return {
      items: formatted,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Retrieves conversation details with role-based masking and access validation.
   *
   * @param id - Conversation identifier
   * @param userId - Requesting user identifier
   * @param role - Requesting user role
   * @returns Conversation details
   * @throws NotFoundException when conversation does not exist
   * @throws ForbiddenException when user lacks access permissions
   */
  async getConversationById(id: string, userId: string, role: string) {
    const conv = await this.prisma.chatConversation.findUnique({
      where: { id },
      include: {
        participant1: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
        participant2: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
        assignedStaff: {
          select: { id: true, fullName: true, avatarUrl: true, role: true, email: true },
        },
      },
    });
    if (!conv) throw new NotFoundException('Không tìm thấy cuộc trò chuyện.');

    const isAuditAdmin = role === 'ADMIN';
    const isAssignedStaff = conv.assignedStaffId === userId || conv.participant2Id === userId;
    const isParticipant = conv.participant1Id === userId || conv.participant2Id === userId;
    const isStaffAllowed = role === 'SUPPORT_STAFF' && (isAssignedStaff || conv.status === 'OPEN');

    if (!isParticipant && !isStaffAllowed && !isAuditAdmin) {
      throw new ForbiddenException('Bạn không có quyền truy cập vào cuộc trò chuyện này.');
    }

    const isMasked = !isAuditAdmin;
    return {
      ...conv,
      participant2:
        conv.participant2?.role === 'SUPPORT_STAFF' && isMasked
          ? SUPPORT_STAFF_MASK
          : conv.participant2,
      assignedStaff: isMasked && conv.assignedStaff ? SUPPORT_STAFF_MASK : conv.assignedStaff,
    };
  }

  /**
   * Retrieves paginated messages for a conversation with cursor pagination.
   *
   * @param convId - Target conversation identifier
   * @param userId - Requesting user identifier
   * @param role - Requesting user role
   * @param query - Cursor pagination parameters
   * @returns Paginated messages with masked identities
   */
  async listMessages(convId: string, userId: string, role: string, query: QueryMessagesInput) {
    await this.getConversationById(convId, userId, role);
    const limit = Number(query.limit) || 50;
    const where: Record<string, unknown> = { conversationId: convId };
    if (query.before) where.createdAt = { lt: new Date(query.before) };

    const messages = await this.prisma.chatMessage.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { id: true, fullName: true, avatarUrl: true, role: true, email: true },
        },
      },
    });

    const isAuditAdmin = role === 'ADMIN';
    const formatted = messages.map((m) => {
      const masked = maskStaffSender(m.sender, isAuditAdmin);
      const isMaskedStaff = m.sender?.role === 'SUPPORT_STAFF' && !isAuditAdmin;
      return {
        id: m.id,
        conversationId: m.conversationId,
        senderId: isMaskedStaff ? 'SUPPORT_STAFF_DESK' : m.senderId,
        sender: masked,
        body: m.body,
        attachments: m.attachments,
        isRead: m.isRead,
        readAt: m.readAt,
        createdAt: m.createdAt,
      };
    });

    return { conversationId: convId, count: formatted.length, messages: formatted };
  }

  /**
   * Sends a message in a conversation, performing moderation checks and status progression.
   *
   * @param senderId - Sender user identifier
   * @param senderRole - Sender user role
   * @param dto - Message payload and attachments
   * @returns Created ChatMessage entity
   * @throws BadRequestException when message body is missing or violates content rules
   */
  async sendMessage(senderId: string, senderRole: string, dto: SendMessageInput) {
    const text = (dto.content || dto.body || '').trim();
    const attachments = dto.attachments || [];
    if (!text && attachments.length === 0) {
      throw new BadRequestException('Nội dung tin nhắn hoặc tệp đính kèm không được để trống.');
    }
    if (text) assertCleanContent(text, 'Nội dung tin nhắn');

    const convId = dto.conversationId;
    if (!convId) throw new BadRequestException('Thiếu mã cuộc trò chuyện conversationId.');
    const conv = await this.getConversationById(convId, senderId, senderRole);

    if (conv.status === 'OPEN' && senderRole === 'SUPPORT_STAFF') {
      await this.prisma.chatConversation.update({
        where: { id: convId },
        data: {
          status: 'IN_PROGRESS',
          assignedStaffId: senderId,
          participant2Id: senderId,
        },
      });
      this.staffQueueService.trackAssignedTicket(senderId, convId);
      this.realtime.statusChange(convId, 'IN_PROGRESS', senderId);
    }

    const message = await this.prisma.chatMessage.create({
      data: { conversationId: convId, senderId, body: text, attachments },
      include: { sender: { select: { id: true, fullName: true, avatarUrl: true, role: true } } },
    });

    const isUser1 = conv.participant1Id === senderId;
    await this.prisma.chatConversation.update({
      where: { id: convId },
      data: {
        lastMessage: text || '[Tệp đính kèm]',
        lastMessageAt: new Date(),
        updatedAt: new Date(),
        ...(isUser1
          ? { unreadCountUser2: { increment: 1 } }
          : { unreadCountUser1: { increment: 1 } }),
      },
    });

    const clientPayload = {
      ...message,
      sender: maskStaffSender(message.sender, false),
    };
    this.realtime.message(convId, clientPayload);

    await this.triggerAutoReply(conv, senderId, senderRole, text);

    return message;
  }

  private async triggerAutoReply(
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
    try {
      if (!text || ['RESOLVED', 'CLOSED'].includes(conv.status ?? '')) return;
      const firstMessage =
        (await this.prisma.chatMessage.count({
          where: { conversationId: conv.id, senderId },
        })) === 1;
      if (conv.type === 'BUYER_SELLER') {
        const partnerId =
          conv.participant1Id === senderId ? conv.participant2Id : conv.participant1Id;
        if (!partnerId) return;
        const partner = await this.prisma.user.findUnique({
          where: { id: partnerId },
          select: { role: true, isShopSuspended: true },
        });
        if (partner?.role !== 'SELLER' || partner.isShopSuspended) return;
        const reply = await this.autoReplyService.findMatchingReply(partnerId, 'SHOP', text, {
          firstMessage,
          offline: !(await this.realtime.isUserOnline(partnerId)),
        });
        if (reply) {
          const autoMsg = await this.saveAutoReply(conv, partnerId, reply);
          this.realtime.message(conv.id, autoMsg);
        }
      } else if (
        (conv.type === 'STAFF_BUYER' || conv.type === 'STAFF_SELLER') &&
        senderRole !== 'SUPPORT_STAFF'
      ) {
        const reply = await this.autoReplyService.findMatchingReply(null, 'SYSTEM', text, {
          firstMessage,
          offline: conv.assignedStaffId
            ? !(await this.realtime.isUserOnline(conv.assignedStaffId))
            : !(await this.realtime.isSupportOnline()),
        });
        if (reply) {
          const staffUser = await this.prisma.user.findFirst({
            where: { role: 'SUPPORT_STAFF' },
            select: { id: true },
          });
          // Never store a system reply as if the customer had authored it.
          if (!staffUser) return;
          const autoMsg = await this.saveAutoReply(conv, staffUser.id, reply);
          this.realtime.message(conv.id, {
            ...autoMsg,
            senderId: SUPPORT_STAFF_MASK.id,
            sender: SUPPORT_STAFF_MASK,
          });
        }
      }
    } catch {
      // Auto-reply failures must not block the main conversation flow
    }
  }

  private async saveAutoReply(
    conv: { id: string; participant1Id: string },
    senderId: string,
    reply: string,
  ): Promise<ChatMessage> {
    return this.prisma.$transaction(async (tx) => {
      const body = `[Trả lời tự động] ${reply}`;
      const message = await tx.chatMessage.create({
        data: { conversationId: conv.id, senderId, body, attachments: [] },
        include: { sender: { select: { id: true, fullName: true, avatarUrl: true, role: true } } },
      });
      await tx.chatConversation.update({
        where: { id: conv.id },
        data: {
          lastMessage: body,
          lastMessageAt: message.createdAt,
          ...(senderId === conv.participant1Id
            ? { unreadCountUser2: { increment: 1 } }
            : { unreadCountUser1: { increment: 1 } }),
        },
      });
      return message;
    });
  }

  /**
   * Marks unread messages in a conversation as read for the current user.
   *
   * @param convId - Target conversation identifier
   * @param userId - Requesting user identifier
   * @param role - Requesting user role
   * @returns Read confirmation status
   */
  async markAsRead(convId: string, userId: string, role: string) {
    const conv = await this.getConversationById(convId, userId, role);
    await this.prisma.chatMessage.updateMany({
      where: { conversationId: convId, senderId: { not: userId }, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    const isUser1 = conv.participant1Id === userId;
    await this.prisma.chatConversation.update({
      where: { id: convId },
      data: isUser1 ? { unreadCountUser1: 0 } : { unreadCountUser2: 0 },
    });

    this.realtime.read(convId, userId);
    return {
      success: true,
      conversationId: convId,
      message: 'Đã đánh dấu toàn bộ tin nhắn là đã đọc.',
    };
  }

  /**
   * Aggregates total unread messages across all active user conversations.
   *
   * @param userId - Target user identifier
   * @returns Total unread count
   */
  async getTotalUnreadCount(userId: string) {
    const unreadCount = await this.prisma.chatMessage.count({
      where: {
        conversation: { OR: [{ participant1Id: userId }, { participant2Id: userId }] },
        senderId: { not: userId },
        isRead: false,
      },
    });
    return { unreadCount };
  }

  /**
   * Uploads multiple media attachments associated with chat messages.
   *
   * @param files - Uploaded Multer files
   * @returns Array of uploaded file URLs
   */
  async uploadAttachments(files: Express.Multer.File[]): Promise<string[]> {
    if (!files || files.length === 0) return [];
    const uploadPromises = files.map(async (f) => {
      const res = await this.cloudinary.uploadFile(
        f.buffer,
        f.originalname,
        'nexus/chat-attachments',
      );
      return res.url;
    });
    return Promise.all(uploadPromises);
  }
}
