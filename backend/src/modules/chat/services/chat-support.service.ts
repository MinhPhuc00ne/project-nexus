import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { assertCleanContent } from '../../../core/moderation/content-moderation.util';
import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  QueryQueueInput,
  RequestSupportInput,
  SendMessageInput,
  UpdateConversationStatusInput,
} from '../dtos';
import { ChatRealtimePublisher } from './chat-realtime.publisher';
import { StaffQueueService } from './staff-queue.service';

export type SendMessageDelegate = (
  senderId: string,
  senderRole: string,
  dto: SendMessageInput,
) => Promise<unknown>;

export type TriggerAutoReplyDelegate = (
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
) => Promise<void>;

/**
 * Manages customer support intake, FIFO queue triage, staff ticket claiming,
 * dispute conversation initialization, and support ticket lifecycle transitions.
 */
@Injectable()
export class ChatSupportService {
  private readonly logger = new Logger('ChatService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly staffQueueService: StaffQueueService,
    private readonly realtime: ChatRealtimePublisher,
  ) {}

  /**
   * Submits a customer support request, allocating it to the next available staff or the FIFO queue.
   */
  async requestSupport(
    userId: string,
    role: string,
    dto: RequestSupportInput,
    sendMessageFn?: SendMessageDelegate,
    triggerAutoReplyFn?: TriggerAutoReplyDelegate,
  ) {
    if (role === 'SUPPORT_STAFF' || role === 'ADMIN') {
      throw new BadRequestException(
        'Tài khoản nhân viên hoặc quản trị viên không thể gửi yêu cầu hỗ trợ người dùng.',
      );
    }

    const text = (dto.message || '').trim();
    if (!text) {
      throw new BadRequestException('Nội dung yêu cầu hỗ trợ không được để trống.');
    }
    assertCleanContent(text, 'Nội dung yêu cầu hỗ trợ');

    if (dto.contextType === 'DISPUTE' && dto.contextId) {
      const existingDisputeConv = await this.prisma.chatConversation.findFirst({
        where: { contextId: dto.contextId, contextType: 'DISPUTE' },
        include: {
          participant1: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
          participant2: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
          assignedStaff: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
        },
      });

      if (existingDisputeConv) {
        if (sendMessageFn) {
          await sendMessageFn(userId, role, {
            conversationId: existingDisputeConv.id,
            content: text,
            attachments: dto.attachments,
          });
        }
        return existingDisputeConv;
      }
    }

    const convType = role === 'SELLER' ? 'STAFF_SELLER' : 'STAFF_BUYER';
    const availableStaffId = await this.staffQueueService.getNextAvailableStaff();

    const conv = await this.prisma.chatConversation.create({
      data: {
        type: convType,
        participant1Id: userId,
        participant2Id: availableStaffId || null,
        assignedStaffId: availableStaffId || null,
        status: availableStaffId ? 'IN_PROGRESS' : 'OPEN',
        title:
          dto.subject ||
          (dto.contextType === 'DISPUTE'
            ? `Hỗ trợ khiếu nại #${dto.contextId}`
            : 'Yêu cầu hỗ trợ CSKH'),
        contextId: dto.contextId || null,
        contextType: dto.contextType || 'GENERAL',
        lastMessage: text,
        lastMessageAt: new Date(),
        unreadCountUser1: 0,
        unreadCountUser2: availableStaffId ? 1 : 0,
      },
      include: {
        participant1: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
        participant2: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
        assignedStaff: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
      },
    });

    await this.prisma.chatMessage.create({
      data: {
        conversationId: conv.id,
        senderId: userId,
        body: text,
        attachments: dto.attachments || [],
      },
    });

    if (availableStaffId) {
      await this.staffQueueService.trackAssignedTicket(availableStaffId, conv.id);
      this.realtime.toUser(availableStaffId, 'ticket_assigned', {
        conversationId: conv.id,
        conversation: conv,
      });
      this.logger.log(
        `Tự động gán ticket ${conv.id} cho staff online sớm nhất: ${availableStaffId}`,
      );
    } else {
      this.realtime.toStaff('new_queue_ticket', {
        conversationId: conv.id,
        conversation: conv,
      });
      this.logger.log(`Ticket ${conv.id} đã vào hàng đợi OPEN (chưa có staff rảnh online).`);
    }

    if (triggerAutoReplyFn) {
      await triggerAutoReplyFn(conv, userId, role, text);
    }
    return conv;
  }

  /**
   * Retrieves or initializes a unique support conversation bound to a dispute.
   */
  async getOrCreateDisputeConversation(
    disputeId: string,
    userId: string,
    role: string,
    sendMessageFn?: SendMessageDelegate,
    triggerAutoReplyFn?: TriggerAutoReplyDelegate,
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { order: { select: { id: true, buyerId: true, sellerId: true } } },
    });
    if (!dispute) throw new NotFoundException('Không tìm thấy khiếu nại tranh chấp.');

    const isParty =
      dispute.openedByUserId === userId ||
      dispute.order.buyerId === userId ||
      dispute.order.sellerId === userId;
    const isStaffOrAdmin = role === 'SUPPORT_STAFF' || role === 'ADMIN';

    if (!isParty && !isStaffOrAdmin) {
      throw new ForbiddenException('Bạn không có quyền truy cập hội thoại của tranh chấp này.');
    }

    let conv = await this.prisma.chatConversation.findFirst({
      where: { contextId: disputeId, contextType: 'DISPUTE' },
      include: {
        participant1: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
        participant2: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
        assignedStaff: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
      },
    });

    if (!conv) {
      conv = await this.requestSupport(
        userId,
        role,
        {
          subject: `Tranh chấp đơn hàng #${dispute.orderId}`,
          message: `Mở hội thoại hỗ trợ giải quyết khiếu nại: ${dispute.reason}`,
          contextId: disputeId,
          contextType: 'DISPUTE',
        },
        sendMessageFn,
        triggerAutoReplyFn,
      );
    }

    return conv;
  }

  /**
   * Retrieves paginated support queue tickets adhering to FIFO ordering.
   */
  async getQueue(role: string, query: QueryQueueInput) {
    if (role !== 'SUPPORT_STAFF' && role !== 'ADMIN') {
      throw new ForbiddenException(
        'Chỉ nhân viên hoặc quản trị viên mới có quyền xem hàng đợi hỗ trợ.',
      );
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      status: 'OPEN',
      assignedStaffId: null,
    };
    if (query.contextType) where.contextType = query.contextType;

    const [items, total] = await Promise.all([
      this.prisma.chatConversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          participant1: {
            select: { id: true, fullName: true, avatarUrl: true, role: true, email: true },
          },
          messages: { take: 1, orderBy: { createdAt: 'desc' } },
        },
      }),
      this.prisma.chatConversation.count({ where }),
    ]);

    const formatted = items.map((item) => {
      const waitingTimeMs = Date.now() - new Date(item.createdAt).getTime();
      return {
        ...item,
        waitingTimeSeconds: Math.floor(waitingTimeMs / 1000),
      };
    });

    return {
      items: formatted,
      onlineStaffCount: this.staffQueueService.getOnlineStaffCount(),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Allows support staff to claim an unassigned support ticket from the FIFO queue.
   */
  async claimConversation(convId: string, staffId: string, role: string) {
    if (role !== 'SUPPORT_STAFF' && role !== 'ADMIN') {
      throw new ForbiddenException(
        'Chỉ nhân viên hoặc quản trị viên mới có quyền tiếp nhận cuộc trò chuyện.',
      );
    }

    const conv = await this.prisma.chatConversation.findUnique({
      where: { id: convId },
    });

    if (!conv) throw new NotFoundException('Không tìm thấy cuộc trò chuyện.');
    if (conv.status !== 'OPEN') {
      throw new BadRequestException('Cuộc trò chuyện này đã được tiếp nhận hoặc đã hoàn tất.');
    }

    const updated = await this.prisma.chatConversation.update({
      where: { id: convId },
      data: {
        status: 'IN_PROGRESS',
        assignedStaffId: staffId,
        participant2Id: staffId,
        updatedAt: new Date(),
      },
      include: {
        participant1: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
        participant2: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
        assignedStaff: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
      },
    });

    this.staffQueueService.trackAssignedTicket(staffId, convId);
    this.realtime.statusChange(convId, 'IN_PROGRESS', staffId);
    this.realtime.toUser(staffId, 'ticket_assigned', {
      conversationId: convId,
      conversation: updated,
    });

    return updated;
  }

  /**
   * Updates conversation lifecycle status (OPEN, IN_PROGRESS, RESOLVED, CLOSED).
   */
  async updateConversationStatus(
    convId: string,
    userId: string,
    role: string,
    dto: UpdateConversationStatusInput,
    sendMessageFn?: SendMessageDelegate,
  ) {
    const conv = await this.prisma.chatConversation.findUnique({
      where: { id: convId },
    });
    if (!conv) throw new NotFoundException('Không tìm thấy cuộc trò chuyện.');

    const isAuditAdmin = role === 'ADMIN';
    const isAssigned = conv.assignedStaffId === userId || conv.participant2Id === userId;

    if (!isAssigned && !isAuditAdmin) {
      throw new ForbiddenException('Bạn không có quyền cập nhật trạng thái cuộc trò chuyện này.');
    }

    const updated = await this.prisma.chatConversation.update({
      where: { id: convId },
      data: {
        status: dto.status,
        updatedAt: new Date(),
      },
      include: {
        participant1: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
        participant2: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
        assignedStaff: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
      },
    });

    if (dto.status === 'RESOLVED' || dto.status === 'CLOSED') {
      if (conv.assignedStaffId) {
        this.staffQueueService.releaseAssignedTicket(conv.assignedStaffId, convId);
        void this.processQueueForStaff(conv.assignedStaffId);
      }
    }

    this.realtime.statusChange(convId, dto.status, conv.assignedStaffId);

    if (dto.resolutionNotes?.trim() && sendMessageFn) {
      await sendMessageFn(userId, role, {
        conversationId: convId,
        content: `[Ghi chú kết thúc hỗ trợ]: ${dto.resolutionNotes.trim()}`,
      });
    }

    return updated;
  }

  /**
   * Automatically allocates the next FIFO queue ticket to an idle support staff member.
   */
  async processQueueForStaff(staffId: string): Promise<void> {
    try {
      const isOnline = this.staffQueueService.isStaffOnline(staffId);
      if (!isOnline) return;

      const nextTicket = await this.prisma.chatConversation.findFirst({
        where: {
          status: 'OPEN',
          assignedStaffId: null,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (!nextTicket) return;

      await this.claimConversation(nextTicket.id, staffId, 'SUPPORT_STAFF');
      this.logger.log(`Tự động phân phối ticket FIFO ${nextTicket.id} cho staff ${staffId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Lỗi khi phân phối ticket cho staff ${staffId}: ${msg}`);
    }
  }
}
