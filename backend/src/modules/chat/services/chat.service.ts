import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ChatMessage } from '@prisma/client';
import { CloudinaryStorageService } from '../../../core/storage/cloudinary.service';
import { assertCleanContent } from '../../../core/moderation/content-moderation.util';
import {
  CreateConversationDto,
  QueryConversationsDto,
  QueryMessagesDto,
  QueryQueueDto,
  RequestSupportDto,
  SendMessageDto,
  UpdateConversationStatusDto,
} from '../dtos';
import { ChatAutoReplyService } from './chat-auto-reply.service';
import { maskStaffSender, SUPPORT_STAFF_MASK } from './chat-mask.util';
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
  private readonly logger = new Logger(ChatService.name);
  private socketBroadcaster: ChatSocketBroadcaster | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryStorageService,
    private readonly autoReplyService: ChatAutoReplyService,
    private readonly staffQueueService: StaffQueueService,
  ) {}

  setBroadcaster(broadcaster: ChatSocketBroadcaster): void {
    this.socketBroadcaster = broadcaster;
  }

  /**
   * Tạo hoặc mở cuộc trò chuyện trực tiếp (chủ yếu là BUYER <-> SELLER)
   * Chặn Staff tự tiện nhắn tin trực tiếp với khách nếu không có yêu cầu / tranh chấp.
   * Đảm bảo mỗi tranh chấp (Dispute) chỉ tạo DUY NHẤT một hội thoại.
   */
  async createOrGetConversation(
    currentUserId: string,
    currentUserRole: string,
    dto: CreateConversationDto,
  ) {
    const recipientId = (dto.participantId || dto.targetUserId || '').trim();
    if (!recipientId && dto.contextType !== 'DISPUTE') {
      throw new BadRequestException('Vui lòng cung cấp ID đối tác trò chuyện.');
    }
    if (recipientId && currentUserId === recipientId) {
      throw new BadRequestException('Không thể tự tạo cuộc trò chuyện với chính mình.');
    }

    // Đảm bảo mỗi tranh chấp chỉ tạo một hội thoại
    if (dto.contextType === 'DISPUTE' && dto.contextId) {
      return this.getOrCreateDisputeConversation(dto.contextId, currentUserId, currentUserRole);
    }

    // Nhân viên không được tự ý spam chat với khách
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

    // Nếu người dùng nhắn cho Staff -> Chuyển sang luồng Hàng đợi Request Support
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
   * Buyer / Seller gửi yêu cầu hỗ trợ lên Staff
   * - Đưa vào hàng đợi với trạng thái OPEN
   * - Tự động đẩy cho Staff nào đang ONLINE trước nhất (FIFO Staff)
   * - Đảm bảo mỗi tranh chấp chỉ tạo 1 hội thoại
   */
  async requestSupport(userId: string, role: string, dto: RequestSupportDto) {
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

    // Đảm bảo mỗi tranh chấp chỉ tạo duy nhất 1 hội thoại
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
        await this.sendMessage(userId, role, {
          conversationId: existingDisputeConv.id,
          content: text,
          attachments: dto.attachments,
        });
        return existingDisputeConv;
      }
    }

    const convType = role === 'SELLER' ? 'STAFF_SELLER' : 'STAFF_BUYER';

    // Tìm Staff online sớm nhất chưa quá tải
    const availableStaffId = this.staffQueueService.getNextAvailableStaff();

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
      this.staffQueueService.trackAssignedTicket(availableStaffId, conv.id);
      this.socketBroadcaster?.broadcastToUser(availableStaffId, 'ticket_assigned', {
        conversationId: conv.id,
        conversation: conv,
      });
      this.logger.log(
        `Tự động gán ticket ${conv.id} cho staff online sớm nhất: ${availableStaffId}`,
      );
    } else {
      this.socketBroadcaster?.broadcastToStaff('new_queue_ticket', {
        conversationId: conv.id,
        conversation: conv,
      });
      this.logger.log(`Ticket ${conv.id} đã vào hàng đợi OPEN (chưa có staff rảnh online).`);
    }

    await this.triggerAutoReply(conv, userId, role, text);
    return conv;
  }

  /**
   * Lấy hoặc khởi tạo duy nhất một cuộc trò chuyện hỗ trợ cho một khiếu nại tranh chấp
   */
  async getOrCreateDisputeConversation(disputeId: string, userId: string, role: string) {
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
      conv = await this.requestSupport(userId, role, {
        subject: `Tranh chấp đơn hàng #${dispute.orderId}`,
        message: `Mở hội thoại hỗ trợ giải quyết khiếu nại: ${dispute.reason}`,
        contextId: disputeId,
        contextType: 'DISPUTE',
      });
    }

    return conv;
  }

  /**
   * Xem Hàng đợi yêu cầu hỗ trợ (FIFO Queue)
   * Chỉ Staff hoặc Admin mới xem được danh sách này
   */
  async getQueue(role: string, query: QueryQueueDto) {
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
        orderBy: { createdAt: 'asc' }, // FIFO: ai gửi trước thì đứng đầu
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
   * Nhân viên chủ động tiếp nhận (Claim) một ticket từ hàng đợi
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
    this.socketBroadcaster?.broadcastStatusChange(convId, 'IN_PROGRESS', staffId);
    this.socketBroadcaster?.broadcastToUser(staffId, 'ticket_assigned', {
      conversationId: convId,
      conversation: updated,
    });

    return updated;
  }

  /**
   * Cập nhật trạng thái cuộc trò chuyện (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
   */
  async updateConversationStatus(
    convId: string,
    userId: string,
    role: string,
    dto: UpdateConversationStatusDto,
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
        // Tự động kéo ticket tiếp theo trong hàng đợi về cho Staff này
        void this.processQueueForStaff(conv.assignedStaffId);
      }
    }

    this.socketBroadcaster?.broadcastStatusChange(convId, dto.status, conv.assignedStaffId);

    if (dto.resolutionNotes?.trim()) {
      await this.sendMessage(userId, role, {
        conversationId: convId,
        content: `[Ghi chú kết thúc hỗ trợ]: ${dto.resolutionNotes.trim()}`,
      });
    }

    return updated;
  }

  /**
   * Tự động kéo ticket tiếp theo trong hàng đợi FIFO cho nhân viên rảnh việc
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
        orderBy: { createdAt: 'asc' }, // FIFO
      });

      if (!nextTicket) return;

      await this.claimConversation(nextTicket.id, staffId, 'SUPPORT_STAFF');
      this.logger.log(`Tự động phân phối ticket FIFO ${nextTicket.id} cho staff ${staffId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Lỗi khi phân phối ticket cho staff ${staffId}: ${msg}`);
    }
  }

  /**
   * Lấy danh sách cuộc trò chuyện:
   * - BỎ HOÀN TOÀN CHAT CHUNG!
   * - Staff CHỈ thấy cuộc trò chuyện của chính mình (assignedStaffId = userId)
   * - Ẩn danh tên Staff với khách hàng thành "Nhân viên Hỗ trợ"
   * - Chỉ Admin mới thấy đầy đủ tên thật Staff qua Audit
   */
  async listUserConversations(userId: string, role: string, query: QueryConversationsDto) {
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

    // Nếu hội thoại đang OPEN và Staff trả lời -> Tự động chuyển sang IN_PROGRESS và gán cho Staff này
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
      this.socketBroadcaster?.broadcastStatusChange(convId, 'IN_PROGRESS', senderId);
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
    this.socketBroadcaster?.broadcastMessage(convId, clientPayload);

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
          offline: (await this.socketBroadcaster?.isUserOnline?.(partnerId)) === false,
        });
        if (reply) {
          const autoMsg = await this.saveAutoReply(conv, partnerId, reply);
          this.socketBroadcaster?.broadcastMessage(conv.id, autoMsg);
        }
      } else if (
        (conv.type === 'STAFF_BUYER' || conv.type === 'STAFF_SELLER') &&
        senderRole !== 'SUPPORT_STAFF'
      ) {
        const reply = await this.autoReplyService.findMatchingReply(null, 'SYSTEM', text, {
          firstMessage,
          offline: conv.assignedStaffId
            ? (await this.socketBroadcaster?.isUserOnline?.(conv.assignedStaffId)) === false
            : (await this.socketBroadcaster?.isSupportOnline?.()) === false,
        });
        if (reply) {
          const staffUser = await this.prisma.user.findFirst({
            where: { role: 'SUPPORT_STAFF' },
            select: { id: true },
          });
          // Never store a system reply as if the customer had authored it.
          if (!staffUser) return;
          const autoMsg = await this.saveAutoReply(conv, staffUser.id, reply);
          this.socketBroadcaster?.broadcastMessage(conv.id, {
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
