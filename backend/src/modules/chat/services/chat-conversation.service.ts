import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppErrorCode } from '@nexus/contracts';
import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  CreateConversationInput,
  QueryConversationsInput,
  RequestSupportInput,
  SendMessageInput,
} from '../dtos';
import { SUPPORT_STAFF_MASK } from './chat-mask.util';

export interface ConversationCreationDelegates {
  sendMessage?: (senderId: string, senderRole: string, dto: SendMessageInput) => Promise<unknown>;
  requestSupport?: (userId: string, role: string, dto: RequestSupportInput) => Promise<unknown>;
  getOrCreateDisputeConversation?: (
    disputeId: string,
    userId: string,
    role: string,
  ) => Promise<unknown>;
}

/**
 * Manages conversation lookup, participant access control, listing, and unread counters.
 */
@Injectable()
export class ChatConversationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Initializes or retrieves a direct conversation between participants.
   */
  async createOrGetConversation(
    currentUserId: string,
    currentUserRole: string,
    dto: CreateConversationInput,
    delegates?: ConversationCreationDelegates,
  ) {
    const recipientId = (dto.participantId || dto.targetUserId || '').trim();
    if (!recipientId && dto.contextType !== 'DISPUTE') {
      throw new BadRequestException({
        message: 'Vui lòng cung cấp ID đối tác trò chuyện.',
        errorCode: AppErrorCode.BAD_REQUEST,
      });
    }
    if (recipientId && currentUserId === recipientId) {
      throw new BadRequestException({
        message: 'Không thể tự tạo cuộc trò chuyện với chính mình.',
        errorCode: AppErrorCode.BAD_REQUEST,
      });
    }

    if (
      dto.contextType === 'DISPUTE' &&
      dto.contextId &&
      delegates?.getOrCreateDisputeConversation
    ) {
      return delegates.getOrCreateDisputeConversation(
        dto.contextId,
        currentUserId,
        currentUserRole,
      );
    }

    if (currentUserRole === 'SUPPORT_STAFF') {
      throw new ForbiddenException({
        message:
          'Nhân viên hỗ trợ chỉ có thể phản hồi yêu cầu hỗ trợ hoặc giải quyết tranh chấp do người dùng gửi lên.',
        errorCode: AppErrorCode.FORBIDDEN,
      });
    }

    const partner = await this.prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, fullName: true, email: true, avatarUrl: true, role: true },
    });
    if (!partner) {
      throw new NotFoundException({
        message: 'Không tìm thấy người dùng tham gia cuộc trò chuyện.',
        errorCode: AppErrorCode.NOT_FOUND,
      });
    }

    if (partner.role === 'ADMIN') {
      throw new BadRequestException({
        message:
          'Không thể nhắn tin trực tiếp cho Quản trị viên. Mọi khiếu nại hoặc hỗ trợ vui lòng gửi qua Trung tâm Trợ giúp.',
        errorCode: AppErrorCode.BAD_REQUEST,
      });
    }

    if (partner.role === 'SUPPORT_STAFF' && delegates?.requestSupport) {
      return delegates.requestSupport(currentUserId, currentUserRole, {
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

    if (dto.initialMessage?.trim() && delegates?.sendMessage) {
      await delegates.sendMessage(currentUserId, currentUserRole, {
        conversationId: existing.id,
        content: dto.initialMessage.trim(),
      });
    }

    return existing;
  }

  /**
   * Retrieves user conversations with role-based scoping and staff identity masking.
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

  async assertConversationAccess(
    conversationId: string,
    userId: string,
    role: string,
  ): Promise<void> {
    const conv = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        type: true,
        participant1Id: true,
        participant2Id: true,
        assignedStaffId: true,
        status: true,
      },
    });
    if (!conv) {
      throw new NotFoundException({
        message: 'Conversation not found.',
        errorCode: AppErrorCode.NOT_FOUND,
      });
    }

    const isAuditAdmin = role === 'ADMIN';
    const isAssignedStaff = conv.assignedStaffId === userId || conv.participant2Id === userId;
    const isParticipant = conv.participant1Id === userId || conv.participant2Id === userId;
    const isStaffAllowed =
      role === 'SUPPORT_STAFF' &&
      (isAssignedStaff || (conv.status === 'OPEN' && conv.type !== 'BUYER_SELLER'));

    if (!isParticipant && !isStaffAllowed && !isAuditAdmin) {
      throw new ForbiddenException({
        message: 'You do not have permission to access this conversation.',
        errorCode: AppErrorCode.FORBIDDEN,
      });
    }
  }

  /**
   * Retrieves conversation details with role-based masking and access validation.
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
    if (!conv) {
      throw new NotFoundException({
        message: 'Không tìm thấy cuộc trò chuyện.',
        errorCode: AppErrorCode.NOT_FOUND,
      });
    }

    const isAuditAdmin = role === 'ADMIN';
    const isAssignedStaff = conv.assignedStaffId === userId || conv.participant2Id === userId;
    const isParticipant = conv.participant1Id === userId || conv.participant2Id === userId;
    const isStaffAllowed =
      role === 'SUPPORT_STAFF' &&
      (isAssignedStaff || (conv.status === 'OPEN' && conv.type !== 'BUYER_SELLER'));

    if (!isParticipant && !isStaffAllowed && !isAuditAdmin) {
      throw new ForbiddenException({
        message: 'Bạn không có quyền truy cập vào cuộc trò chuyện này.',
        errorCode: AppErrorCode.FORBIDDEN,
      });
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
   * Aggregates total unread messages across all active user conversations.
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
}
