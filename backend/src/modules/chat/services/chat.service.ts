import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CloudinaryStorageService } from '../../../core/storage/cloudinary.service';
import { assertCleanContent } from '../../../core/moderation/content-moderation.util';
import {
  CreateConversationDto,
  QueryConversationsDto,
  QueryMessagesDto,
  SendMessageDto,
} from '../dtos';
import { ChatAutoReplyService } from './chat-auto-reply.service';
import { ensureChatDatabaseTables } from './chat-table.init';
import { maskStaffSender, SUPPORT_STAFF_MASK } from './chat-mask.util';

export interface ChatSocketBroadcaster {
  broadcastMessage(conversationId: string, message: unknown): void;
  broadcastRead(conversationId: string, userId: string): void;
}

@Injectable()
export class ChatService implements OnModuleInit {
  private readonly logger = new Logger(ChatService.name);
  private socketBroadcaster: ChatSocketBroadcaster | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryStorageService,
    private readonly autoReplyService: ChatAutoReplyService,
  ) {}

  setBroadcaster(broadcaster: ChatSocketBroadcaster): void {
    this.socketBroadcaster = broadcaster;
  }

  async onModuleInit(): Promise<void> {
    await ensureChatDatabaseTables(this.prisma, this.logger);
  }

  async createOrGetConversation(
    currentUserId: string,
    currentUserRole: string,
    dto: CreateConversationDto,
  ) {
    const recipientId = (dto.participantId || dto.targetUserId || '').trim();
    if (!recipientId) {
      throw new BadRequestException('Vui lòng cung cấp ID đối tác trò chuyện.');
    }
    if (currentUserId === recipientId) {
      throw new BadRequestException('Không thể tự tạo cuộc trò chuyện với chính mình.');
    }

    const partner = await this.prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, fullName: true, email: true, avatarUrl: true, role: true },
    });
    if (!partner)
      throw new NotFoundException('Không tìm thấy người dùng tham gia cuộc trò chuyện.');

    if (partner.role === 'ADMIN') {
      throw new BadRequestException(
        'Không thể nhắn tin trực tiếp cho Quản trị viên. Mọi khiếu nại hoặc hỗ trợ vui lòng gửi qua Trung tâm Trợ giúp.',
      );
    }

    let convType = dto.type || 'BUYER_SELLER';
    if (!dto.type) {
      const isStaffInvolved =
        currentUserRole === 'SUPPORT_STAFF' || partner.role === 'SUPPORT_STAFF';
      if (isStaffInvolved) {
        convType =
          currentUserRole === 'SELLER' || partner.role === 'SELLER'
            ? 'STAFF_SELLER'
            : 'STAFF_BUYER';
      }
    }

    let existing = await this.prisma.chatConversation.findFirst({
      where: {
        OR: [
          { participant1Id: currentUserId, participant2Id: recipientId },
          { participant1Id: recipientId, participant2Id: currentUserId },
        ],
        ...(dto.contextId ? { contextId: dto.contextId } : {}),
      },
      include: {
        participant1: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
        participant2: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
      },
    });

    if (!existing) {
      existing = await this.prisma.chatConversation.create({
        data: {
          type: convType,
          participant1Id: currentUserId,
          participant2Id: recipientId,
          title: dto.title || null,
          contextId: dto.contextId || null,
          contextType: dto.contextType || null,
        },
        include: {
          participant1: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
          participant2: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
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

  async listUserConversations(userId: string, role: string, query: QueryConversationsDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const isStaff = role === 'SUPPORT_STAFF' || role === 'ADMIN';
    const where = isStaff
      ? {
          OR: [
            { type: { in: ['STAFF_BUYER', 'STAFF_SELLER', 'SUPPORT_TICKET'] } },
            { participant1Id: userId },
            { participant2Id: userId },
          ],
        }
      : { OR: [{ participant1Id: userId }, { participant2Id: userId }] };

    const [items, total] = await Promise.all([
      this.prisma.chatConversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          participant1: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
          participant2: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
          messages: { take: 1, orderBy: { createdAt: 'desc' } },
        },
      }),
      this.prisma.chatConversation.count({ where }),
    ]);

    return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getConversationById(id: string, userId: string, role: string) {
    const conv = await this.prisma.chatConversation.findUnique({
      where: { id },
      include: {
        participant1: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
        participant2: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
      },
    });
    if (!conv) throw new NotFoundException('Không tìm thấy cuộc trò chuyện.');

    const isStaff = role === 'SUPPORT_STAFF' || role === 'ADMIN';
    const isSupportConv = ['STAFF_BUYER', 'STAFF_SELLER', 'SUPPORT_TICKET'].includes(conv.type);
    const isParticipant = conv.participant1Id === userId || conv.participant2Id === userId;

    if (!isParticipant && !(isStaff && isSupportConv)) {
      throw new ForbiddenException('Bạn không có quyền truy cập vào cuộc trò chuyện này.');
    }
    return conv;
  }

  async listMessages(convId: string, userId: string, role: string, query: QueryMessagesDto) {
    await this.getConversationById(convId, userId, role);
    const limit = Number(query.limit) || 50;
    const where: Record<string, unknown> = { conversationId: convId };
    if (query.before) where.createdAt = { lt: new Date(query.before) };

    const messages = await this.prisma.chatMessage.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, fullName: true, avatarUrl: true, role: true, email: true } },
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

  async sendMessage(senderId: string, senderRole: string, dto: SendMessageDto) {
    const text = (dto.content || dto.body || '').trim();
    const attachments = dto.attachments || [];
    if (!text && attachments.length === 0) {
      throw new BadRequestException('Nội dung tin nhắn hoặc tệp đính kèm không được để trống.');
    }
    if (text) assertCleanContent(text, 'Nội dung tin nhắn');

    const convId = dto.conversationId;
    if (!convId) throw new BadRequestException('Thiếu mã cuộc trò chuyện conversationId.');
    const conv = await this.getConversationById(convId, senderId, senderRole);

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
    this.socketBroadcaster?.broadcastMessage(convId, clientPayload);

    await this.triggerAutoReply(conv, senderId, senderRole, text);
    return message;
  }

  private async triggerAutoReply(
    conv: { id: string; type: string; participant1Id: string; participant2Id: string },
    senderId: string,
    senderRole: string,
    text: string,
  ): Promise<void> {
    try {
      if (conv.type === 'BUYER_SELLER' && senderRole !== 'SELLER') {
        const partnerId =
          conv.participant1Id === senderId ? conv.participant2Id : conv.participant1Id;
        const reply = await this.autoReplyService.findMatchingReply(partnerId, 'SHOP', text);
        if (reply) {
          const autoMsg = await this.prisma.chatMessage.create({
            data: { conversationId: conv.id, senderId: partnerId, body: reply, attachments: [] },
            include: {
              sender: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
            },
          });
          this.socketBroadcaster?.broadcastMessage(conv.id, autoMsg);
        }
      } else if (
        (conv.type === 'STAFF_BUYER' || conv.type === 'STAFF_SELLER') &&
        senderRole !== 'SUPPORT_STAFF'
      ) {
        const reply = await this.autoReplyService.findMatchingReply(null, 'SYSTEM', text);
        if (reply) {
          const staffUser = await this.prisma.user.findFirst({
            where: { role: 'SUPPORT_STAFF' },
            select: { id: true },
          });
          const botId = staffUser?.id || senderId;
          const autoMsg = await this.prisma.chatMessage.create({
            data: { conversationId: conv.id, senderId: botId, body: reply, attachments: [] },
          });
          this.socketBroadcaster?.broadcastMessage(conv.id, {
            ...autoMsg,
            sender: SUPPORT_STAFF_MASK,
          });
        }
      }
    } catch {
      // Auto-reply failures must not block the main conversation flow
    }
  }

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

    this.socketBroadcaster?.broadcastRead(convId, userId);
    return {
      success: true,
      conversationId: convId,
      message: 'Đã đánh dấu toàn bộ tin nhắn là đã đọc.',
    };
  }

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
