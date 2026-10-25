import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateConversationDto } from '../dtos/create-conversation.dto';
import { QueryConversationsDto, QueryMessagesDto } from '../dtos/query-chat.dto';
import { SendMessageDto } from '../dtos/send-message.dto';

export interface ChatParticipantInfo {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  storeName?: string | null;
}

export interface ChatConversationItem {
  id: string;
  type: string;
  title: string | null;
  contextId: string | null;
  contextType: string | null;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  partner: ChatParticipantInfo;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Khởi tạo hoặc lấy cuộc trò chuyện có sẵn giữa 2 người dùng
   */
  async createOrGetConversation(currentUserId: string, dto: CreateConversationDto) {
    if (currentUserId === dto.participantId) {
      throw new BadRequestException('Bạn không thể tạo cuộc trò chuyện với chính mình.');
    }

    // 1. Kiểm tra đối tác trò chuyện có tồn tại không
    const partner = await this.prisma.user.findUnique({
      where: { id: dto.participantId },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        role: true,
        sellerUpgradeRequests: {
          where: { status: 'APPROVED' },
          take: 1,
          select: { storeName: true },
        },
      },
    });

    if (!partner) {
      throw new NotFoundException('Không tìm thấy người dùng tham gia trò chuyện.');
    }

    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: { id: true, fullName: true, role: true },
    });

    // 2. Tìm cuộc trò chuyện sẵn có giữa 2 bên
    let existingRows: any[] = [];
    if (dto.contextId) {
      existingRows = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM chat_conversations
         WHERE ((participant1_id = $1 AND participant2_id = $2) OR (participant1_id = $2 AND participant2_id = $1))
           AND context_id = $3
         LIMIT 1`,
        currentUserId,
        dto.participantId,
        dto.contextId,
      );
    } else {
      existingRows = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM chat_conversations
         WHERE ((participant1_id = $1 AND participant2_id = $2) OR (participant1_id = $2 AND participant2_id = $1))
         ORDER BY updated_at DESC
         LIMIT 1`,
        currentUserId,
        dto.participantId,
      );
    }

    if (existingRows.length > 0) {
      const conv = existingRows[0];
      const isUser1 = conv.participant1_id === currentUserId;
      return {
        id: conv.id,
        type: conv.type,
        title: conv.title,
        contextId: conv.context_id,
        contextType: conv.context_type,
        lastMessage: conv.last_message,
        lastMessageAt: conv.last_message_at,
        unreadCount: isUser1 ? conv.unread_count_user1 : conv.unread_count_user2,
        status: conv.status,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
        partner: {
          id: partner.id,
          fullName: partner.fullName,
          email: partner.email,
          avatarUrl: partner.avatarUrl,
          role: partner.role,
          storeName: partner.sellerUpgradeRequests?.[0]?.storeName || null,
        },
      };
    }

    // 3. Xác định loại hội thoại nếu chưa chỉ định (BUYER_SELLER, STAFF_SELLER, STAFF_BUYER)
    let convType = dto.type || 'BUYER_SELLER';
    if (!dto.type) {
      const isStaffInvolved =
        currentUser?.role === 'SUPPORT_STAFF' ||
        currentUser?.role === 'ADMIN' ||
        partner.role === 'SUPPORT_STAFF' ||
        partner.role === 'ADMIN';

      if (isStaffInvolved) {
        convType =
          currentUser?.role === 'SELLER' || partner.role === 'SELLER'
            ? 'STAFF_SELLER'
            : 'STAFF_BUYER';
      }
    }

    const conversationId = randomUUID();
    const title =
      dto.title ||
      partner.sellerUpgradeRequests?.[0]?.storeName ||
      partner.fullName ||
      'Trò chuyện';

    // 4. Lưu hội thoại mới vào DB
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO chat_conversations (
         id, type, participant1_id, participant2_id, title, context_id, context_type,
         last_message, last_message_at, unread_count_user1, unread_count_user2, status, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
      conversationId,
      convType,
      currentUserId,
      dto.participantId,
      title,
      dto.contextId || null,
      dto.contextType || null,
      dto.initialMessage || null,
      dto.initialMessage ? new Date() : null,
      0,
      dto.initialMessage ? 1 : 0,
      'ACTIVE',
    );

    // 5. Nếu có tin nhắn ban đầu, ghi nhận luôn vào chat_messages
    if (dto.initialMessage) {
      const messageId = randomUUID();
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO chat_messages (
           id, conversation_id, sender_id, body, is_read, created_at
         ) VALUES ($1, $2, $3, $4, false, NOW())`,
        messageId,
        conversationId,
        currentUserId,
        dto.initialMessage,
      );
    }

    return {
      id: conversationId,
      type: convType,
      title,
      contextId: dto.contextId || null,
      contextType: dto.contextType || null,
      lastMessage: dto.initialMessage || null,
      lastMessageAt: dto.initialMessage ? new Date() : null,
      unreadCount: 0,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      partner: {
        id: partner.id,
        fullName: partner.fullName,
        email: partner.email,
        avatarUrl: partner.avatarUrl,
        role: partner.role,
        storeName: partner.sellerUpgradeRequests?.[0]?.storeName || null,
      },
    };
  }

  /**
   * Lấy danh sách các cuộc trò chuyện của người dùng hiện tại (hỗ trợ phân trang & bộ lọc)
   */
  async listUserConversations(userId: string, userRole: string, query: QueryConversationsDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const offset = (page - 1) * limit;

    const isStaff = userRole === 'SUPPORT_STAFF' || userRole === 'ADMIN';

    let countQuery = `SELECT COUNT(*) as total FROM chat_conversations WHERE (participant1_id = $1 OR participant2_id = $1)`;
    let selectQuery = `
      SELECT c.*,
             u1.full_name as u1_name, u1.email as u1_email, u1.avatar_url as u1_avatar, u1.role as u1_role,
             u2.full_name as u2_name, u2.email as u2_email, u2.avatar_url as u2_avatar, u2.role as u2_role
      FROM chat_conversations c
      JOIN users u1 ON c.participant1_id = u1.id
      JOIN users u2 ON c.participant2_id = u2.id
      WHERE (c.participant1_id = $1 OR c.participant2_id = $1)
    `;

    const params: any[] = [userId];

    if (query.type) {
      params.push(query.type);
      countQuery += ` AND type = $${params.length}`;
      selectQuery += ` AND c.type = $${params.length}`;
    }

    if (query.search) {
      params.push(`%${query.search.trim().toLowerCase()}%`);
      const searchIdx = params.length;
      countQuery += ` AND (LOWER(title) LIKE $${searchIdx} OR id IN (
        SELECT c2.id FROM chat_conversations c2
        JOIN users u ON (c2.participant1_id = u.id OR c2.participant2_id = u.id)
        WHERE u.id != $1 AND LOWER(u.full_name) LIKE $${searchIdx}
      ))`;
      selectQuery += ` AND (LOWER(c.title) LIKE $${searchIdx} OR LOWER(u1.full_name) LIKE $${searchIdx} OR LOWER(u2.full_name) LIKE $${searchIdx})`;
    }

    selectQuery += ` ORDER BY c.updated_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const [totalRes, rows] = await Promise.all([
      this.prisma.$queryRawUnsafe<any[]>(countQuery, ...params),
      this.prisma.$queryRawUnsafe<any[]>(selectQuery, ...params),
    ]);

    const total = Number(totalRes[0]?.total || 0);

    const items: ChatConversationItem[] = rows.map((r) => {
      const isUser1 = r.participant1_id === userId;
      const partnerId = isUser1 ? r.participant2_id : r.participant1_id;
      const partnerName = isUser1 ? r.u2_name : r.u1_name;
      const partnerEmail = isUser1 ? r.u2_email : r.u1_email;
      const partnerAvatar = isUser1 ? r.u2_avatar : r.u1_avatar;
      const partnerRole = isUser1 ? r.u2_role : r.u1_role;
      const unread = isUser1 ? r.unread_count_user1 : r.unread_count_user2;

      return {
        id: r.id,
        type: r.type,
        title: r.title,
        contextId: r.context_id,
        contextType: r.context_type,
        lastMessage: r.last_message,
        lastMessageAt: r.last_message_at,
        unreadCount: Number(unread || 0),
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        partner: {
          id: partnerId,
          fullName: partnerName,
          email: partnerEmail,
          avatarUrl: partnerAvatar,
          role: partnerRole,
        },
      };
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Xem chi tiết một cuộc trò chuyện
   */
  async getConversationById(conversationId: string, currentUserId: string, userRole: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT c.*,
              u1.full_name as u1_name, u1.email as u1_email, u1.avatar_url as u1_avatar, u1.role as u1_role,
              u2.full_name as u2_name, u2.email as u2_email, u2.avatar_url as u2_avatar, u2.role as u2_role
       FROM chat_conversations c
       JOIN users u1 ON c.participant1_id = u1.id
       JOIN users u2 ON c.participant2_id = u2.id
       WHERE c.id = $1 LIMIT 1`,
      conversationId,
    );

    if (rows.length === 0) {
      throw new NotFoundException('Không tìm thấy cuộc trò chuyện này.');
    }

    const conv = rows[0];
    const isParticipant =
      conv.participant1_id === currentUserId || conv.participant2_id === currentUserId;
    const isStaff = userRole === 'SUPPORT_STAFF' || userRole === 'ADMIN';

    if (!isParticipant && !isStaff) {
      throw new ForbiddenException('Bạn không có quyền truy cập cuộc trò chuyện này.');
    }

    const isUser1 = conv.participant1_id === currentUserId;
    const partnerId = isUser1 ? conv.participant2_id : conv.participant1_id;
    const partnerName = isUser1 ? conv.u2_name : conv.u1_name;
    const partnerEmail = isUser1 ? conv.u2_email : conv.u1_email;
    const partnerAvatar = isUser1 ? conv.u2_avatar : conv.u1_avatar;
    const partnerRole = isUser1 ? conv.u2_role : conv.u1_role;
    const unread = isUser1 ? conv.unread_count_user1 : conv.unread_count_user2;

    return {
      id: conv.id,
      type: conv.type,
      title: conv.title,
      contextId: conv.context_id,
      contextType: conv.context_type,
      lastMessage: conv.last_message,
      lastMessageAt: conv.last_message_at,
      unreadCount: Number(unread || 0),
      status: conv.status,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
      partner: {
        id: partnerId,
        fullName: partnerName,
        email: partnerEmail,
        avatarUrl: partnerAvatar,
        role: partnerRole,
      },
    };
  }

  /**
   * Lấy lịch sử tin nhắn trong một cuộc trò chuyện
   */
  async listMessages(
    conversationId: string,
    currentUserId: string,
    userRole: string,
    query: QueryMessagesDto,
  ) {
    // 1. Xác thực quyền xem
    await this.getConversationById(conversationId, currentUserId, userRole);

    const limit = Math.max(1, Math.min(100, query.limit || 50));

    let sql = `
      SELECT m.*, u.full_name as sender_name, u.avatar_url as sender_avatar, u.role as sender_role
      FROM chat_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
    `;
    const params: any[] = [conversationId];

    if (query.before) {
      params.push(new Date(query.before));
      sql += ` AND m.created_at < $2`;
    }

    sql += ` ORDER BY m.created_at DESC LIMIT ${limit}`;

    const rows = await this.prisma.$queryRawUnsafe<any[]>(sql, ...params);

    // Đảo ngược mảng để client nhận theo thứ tự thời gian tăng dần (cũ -> mới)
    const items = rows.reverse().map((r) => ({
      id: r.id,
      conversationId: r.conversation_id,
      senderId: r.sender_id,
      senderName: r.sender_name,
      senderAvatar: r.sender_avatar,
      senderRole: r.sender_role,
      body: r.body,
      attachments: r.attachments || [],
      isRead: r.is_read,
      readAt: r.read_at,
      createdAt: r.created_at,
      isMe: r.sender_id === currentUserId,
    }));

    return {
      conversationId,
      limit,
      count: items.length,
      messages: items,
    };
  }

  /**
   * Gửi một tin nhắn mới vào cuộc trò chuyện
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    senderRole: string,
    dto: SendMessageDto,
  ) {
    const convRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM chat_conversations WHERE id = $1 LIMIT 1`,
      conversationId,
    );

    if (convRows.length === 0) {
      throw new NotFoundException('Không tìm thấy cuộc trò chuyện này.');
    }

    const conv = convRows[0];
    const isParticipant = conv.participant1_id === senderId || conv.participant2_id === senderId;
    const isStaff = senderRole === 'SUPPORT_STAFF' || senderRole === 'ADMIN';

    if (!isParticipant && !isStaff) {
      throw new ForbiddenException('Bạn không phải là thành viên trong cuộc trò chuyện này.');
    }

    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { id: true, fullName: true, avatarUrl: true, role: true },
    });

    const messageId = randomUUID();
    const attachmentsJson = dto.attachments?.length ? JSON.stringify(dto.attachments) : null;

    // 1. Lưu tin nhắn
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO chat_messages (id, conversation_id, sender_id, body, attachments, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, false, NOW())`,
      messageId,
      conversationId,
      senderId,
      dto.body.trim(),
      attachmentsJson,
    );

    // 2. Cập nhật hội thoại (last_message, thời gian và tăng unread count của đối phương)
    const isSenderUser1 = conv.participant1_id === senderId;
    const updateUnreadSql = isSenderUser1
      ? `unread_count_user2 = unread_count_user2 + 1`
      : `unread_count_user1 = unread_count_user1 + 1`;

    await this.prisma.$executeRawUnsafe(
      `UPDATE chat_conversations
       SET last_message = $1,
           last_message_at = NOW(),
           ${updateUnreadSql},
           updated_at = NOW()
       WHERE id = $2`,
      dto.body.trim(),
      conversationId,
    );

    return {
      id: messageId,
      conversationId,
      senderId,
      senderName: sender?.fullName || 'Người dùng',
      senderAvatar: sender?.avatarUrl || null,
      senderRole: sender?.role || 'BUYER',
      body: dto.body.trim(),
      attachments: dto.attachments || [],
      isRead: false,
      readAt: null,
      createdAt: new Date(),
      isMe: true,
    };
  }

  /**
   * Đánh dấu đã đọc toàn bộ tin nhắn trong cuộc trò chuyện
   */
  async markAsRead(conversationId: string, currentUserId: string) {
    const convRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM chat_conversations WHERE id = $1 LIMIT 1`,
      conversationId,
    );

    if (convRows.length === 0) {
      throw new NotFoundException('Không tìm thấy cuộc trò chuyện.');
    }

    const conv = convRows[0];
    const isUser1 = conv.participant1_id === currentUserId;

    // Đánh dấu tin nhắn từ người khác là đã đọc
    await this.prisma.$executeRawUnsafe(
      `UPDATE chat_messages
       SET is_read = true, read_at = NOW()
       WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false`,
      conversationId,
      currentUserId,
    );

    // Đặt lại unread_count của người dùng hiện tại về 0
    const resetCounterSql = isUser1 ? `unread_count_user1 = 0` : `unread_count_user2 = 0`;

    await this.prisma.$executeRawUnsafe(
      `UPDATE chat_conversations SET ${resetCounterSql} WHERE id = $1`,
      conversationId,
    );

    return {
      success: true,
      conversationId,
      message: 'Đã đánh dấu toàn bộ tin nhắn là đã đọc.',
    };
  }

  /**
   * Đếm tổng số tin nhắn chưa đọc của người dùng trên toàn hệ thống
   */
  async getTotalUnreadCount(currentUserId: string): Promise<number> {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COALESCE(SUM(
         CASE
           WHEN participant1_id = $1 THEN unread_count_user1
           WHEN participant2_id = $1 THEN unread_count_user2
           ELSE 0
         END
       ), 0) as total_unread
       FROM chat_conversations
       WHERE participant1_id = $1 OR participant2_id = $1`,
      currentUserId,
    );

    return Number(rows[0]?.total_unread || 0);
  }
}
