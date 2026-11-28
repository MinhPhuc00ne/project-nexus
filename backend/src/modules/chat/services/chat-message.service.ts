import { BadRequestException, Injectable } from '@nestjs/common';
import { AppErrorCode } from '@nexus/contracts';
import { ChatMessage } from '@prisma/client';
import { assertCleanContent } from '../../../core/moderation/content-moderation.util';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CloudinaryStorageService } from '../../../core/storage/cloudinary.service';
import { QueryMessagesInput, SendMessageInput } from '../dtos';
import { ChatAutoReplyService } from './chat-auto-reply.service';
import { ChatConversationService } from './chat-conversation.service';
import { SUPPORT_STAFF_MASK, maskStaffSender } from './chat-mask.util';
import { ChatRealtimePublisher } from './chat-realtime.publisher';
import { StaffQueueService } from './staff-queue.service';

/**
 * Handles chat message retrieval, delivery, read receipts, auto-replies, and attachments.
 */
@Injectable()
export class ChatMessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryStorageService,
    private readonly autoReplyService: ChatAutoReplyService,
    private readonly staffQueueService: StaffQueueService,
    private readonly realtime: ChatRealtimePublisher,
    private readonly conversationService: ChatConversationService,
  ) {}

  /**
   * Retrieves paginated messages for a conversation with cursor pagination.
   */
  async listMessages(convId: string, userId: string, role: string, query: QueryMessagesInput) {
    await this.conversationService.getConversationById(convId, userId, role);
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
   */
  async sendMessage(senderId: string, senderRole: string, dto: SendMessageInput) {
    const text = (dto.content || dto.body || '').trim();
    const attachments = dto.attachments || [];
    if (!text && attachments.length === 0) {
      throw new BadRequestException({
        message: 'Nội dung tin nhắn hoặc tệp đính kèm không được để trống.',
        errorCode: AppErrorCode.BAD_REQUEST,
      });
    }
    if (text) assertCleanContent(text, 'Nội dung tin nhắn');

    const convId = dto.conversationId;
    if (!convId) {
      throw new BadRequestException({
        message: 'Thiếu mã cuộc trò chuyện conversationId.',
        errorCode: AppErrorCode.BAD_REQUEST,
      });
    }
    const conv = await this.conversationService.getConversationById(convId, senderId, senderRole);

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

  async saveAutoReply(
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
   */
  async markAsRead(convId: string, userId: string, role: string) {
    const conv = await this.conversationService.getConversationById(convId, userId, role);
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
   * Uploads multiple media attachments associated with chat messages.
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
