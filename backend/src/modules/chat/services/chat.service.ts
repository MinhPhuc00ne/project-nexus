import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CloudinaryStorageService } from '../../../core/storage/cloudinary.service';
import { CreateConversationDto, SendMessageDto } from '../dtos';

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryStorageService: CloudinaryStorageService,
  ) {}

  /**
   * Tạo mới hoặc lấy cuộc trò chuyện 1-1 đã tồn tại
   */
  public async createOrGetConversation(
    currentUserId: string,
    _currentUserRole: Role | string,
    dto: CreateConversationDto,
  ) {
    const targetUserId = dto.targetUserId;

    if (!targetUserId) {
      throw new BadRequestException('Target user ID is required');
    }

    if (currentUserId === targetUserId) {
      throw new BadRequestException('Cannot create a conversation with yourself');
    }

    // Tìm cuộc trò chuyện 1-1 giữa 2 user dựa trên participant1Id & participant2Id
    const existingConversation = await this.prisma.chatConversation.findFirst({
      where: {
        type: 'DIRECT',
        OR: [
          { participant1Id: currentUserId, participant2Id: targetUserId },
          { participant1Id: targetUserId, participant2Id: currentUserId },
        ],
      },
      include: {
        participant1: {
          select: { id: true, fullName: true, avatarUrl: true, role: true },
        },
        participant2: {
          select: { id: true, fullName: true, avatarUrl: true, role: true },
        },
      },
    });

    if (existingConversation) {
      return existingConversation;
    }

    // Tạo cuộc trò chuyện mới
    return this.prisma.chatConversation.create({
      data: {
        type: 'DIRECT',
        participant1Id: currentUserId,
        participant2Id: targetUserId,
      },
      include: {
        participant1: {
          select: { id: true, fullName: true, avatarUrl: true, role: true },
        },
        participant2: {
          select: { id: true, fullName: true, avatarUrl: true, role: true },
        },
      },
    });
  }

  /**
   * Lấy danh sách cuộc trò chuyện của User
   */
  public async listUserConversations(
    userId: string,
    _userRole: Role | string,
    query: PaginationQuery,
  ) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 20;
    const skip = (page - 1) * limit;

    const whereCondition = {
      OR: [{ participant1Id: userId }, { participant2Id: userId }],
    };

    const [items, total] = await Promise.all([
      this.prisma.chatConversation.findMany({
        where: whereCondition,
        include: {
          participant1: {
            select: { id: true, fullName: true, avatarUrl: true, role: true },
          },
          participant2: {
            select: { id: true, fullName: true, avatarUrl: true, role: true },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.chatConversation.count({
        where: whereCondition,
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lấy tổng số tin nhắn chưa đọc
   */
  public async getTotalUnreadCount(userId: string) {
    const count = await this.prisma.chatMessage.count({
      where: {
        senderId: { not: userId },
        conversation: {
          OR: [{ participant1Id: userId }, { participant2Id: userId }],
        },
      },
    });
    return { unreadCount: count };
  }

  /**
   * Lấy chi tiết cuộc trò chuyện theo ID
   */
  public async getConversationById(
    conversationId: string,
    currentUserId: string,
    _userRole: Role | string,
  ) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include: {
        participant1: {
          select: { id: true, fullName: true, avatarUrl: true, role: true },
        },
        participant2: {
          select: { id: true, fullName: true, avatarUrl: true, role: true },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant =
      conversation.participant1Id === currentUserId ||
      conversation.participant2Id === currentUserId;

    if (!isParticipant) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    return conversation;
  }

  /**
   * Lấy lịch sử tin nhắn
   */
  public async listMessages(
    conversationId: string,
    currentUserId: string,
    _userRole: Role | string,
    query: PaginationQuery,
  ) {
    await this.getConversationById(conversationId, currentUserId, _userRole);

    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 20;
    const skip = (page - 1) * limit;

    const [messages, count] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          sender: {
            select: { id: true, fullName: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.chatMessage.count({
        where: { conversationId },
      }),
    ]);

    return {
      conversationId,
      limit,
      count,
      messages,
    };
  }

  /**
   * Đánh dấu đã đọc tin nhắn
   */
  public async markAsRead(_conversationId: string, _userId: string) {
    return { success: true };
  }

  /**
   * Gửi tin nhắn mới
   */
  public async sendMessage(senderId: string, senderRole: Role | string, dto: SendMessageDto) {
    const { conversationId, content, attachments } = dto;

    await this.getConversationById(conversationId, senderId, senderRole);

    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        senderId,
        body: content || '',
        attachments: attachments || [],
      },
      include: {
        sender: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
      },
    });

    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  /**
   * Upload hình ảnh qua CloudinaryStorageService
   */
  public async uploadAttachments(files: Express.Multer.File[]): Promise<string[]> {
    if (!files || files.length === 0) return [];

    const uploadPromises = files.map(async (file) => {
      const result = await this.cloudinaryStorageService.uploadFile(
        file.buffer,
        file.originalname,
        'nexus/chat-attachments',
      );
      return result.url;
    });

    return Promise.all(uploadPromises);
  }
}
