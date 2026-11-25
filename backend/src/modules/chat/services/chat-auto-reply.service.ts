import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { assertCleanContent } from '../../../core/moderation/content-moderation.util';
import { containsChatPhrase, normalizeChatText } from './chatbot-knowledge';
import {
  CancelAutoReplyDto,
  CreateAutoReplyDto,
  QueryAutoRepliesDto,
  UpdateAutoReplyDto,
} from '../dtos/auto-reply.dto';

@Injectable()
export class ChatAutoReplyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo tin nhắn tự động cho Seller (tối đa 10 mẫu/shop)
   */
  async createSellerAutoReply(sellerId: string, dto: CreateAutoReplyDto) {
    this.validateReply(dto.triggerType ?? 'WELCOME', dto.keyword, dto.content);
    assertCleanContent(dto.content, 'Nội dung tin nhắn tự động');

    const totalCount = await this.prisma.chatAutoReply.count({
      where: { shopId: sellerId, scope: 'SHOP' },
    });
    if (totalCount >= 10) {
      throw new BadRequestException(
        'Mỗi gian hàng chỉ được tạo tối đa 10 cấu hình tin nhắn tự động.',
      );
    }

    return this.prisma.chatAutoReply.create({
      data: {
        scope: 'SHOP',
        shopId: sellerId,
        name: dto.name || 'Tin nhắn tự động',
        triggerType: dto.triggerType || 'WELCOME',
        keyword: dto.keyword?.trim() || null,
        content: dto.content.trim(),
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Lấy danh sách tin nhắn tự động của Shop
   */
  async getSellerAutoReplies(sellerId: string) {
    return this.prisma.chatAutoReply.findMany({
      where: { shopId: sellerId, scope: 'SHOP' },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Chỉnh sửa tin nhắn tự động của Shop
   */
  async updateSellerAutoReply(sellerId: string, replyId: string, dto: UpdateAutoReplyDto) {
    const existing = await this.prisma.chatAutoReply.findFirst({
      where: { id: replyId, shopId: sellerId, scope: 'SHOP' },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy cấu hình tin nhắn tự động của shop.');
    }

    if (existing.status === 'CANCELLED_BY_ADMIN') {
      throw new ForbiddenException(
        `Tin nhắn tự động này đã bị Quản trị viên khóa do vi phạm (${existing.cancelReason || 'Không rõ lý do'}). Không thể chỉnh sửa.`,
      );
    }

    this.validateReply(
      dto.triggerType ?? existing.triggerType,
      dto.keyword === undefined ? existing.keyword : dto.keyword,
      dto.content ?? existing.content,
    );
    if (dto.content) {
      assertCleanContent(dto.content, 'Nội dung tin nhắn tự động');
    }

    return this.prisma.chatAutoReply.update({
      where: { id: replyId },
      data: {
        name: dto.name !== undefined ? dto.name : existing.name,
        triggerType: dto.triggerType !== undefined ? dto.triggerType : existing.triggerType,
        keyword: dto.keyword !== undefined ? dto.keyword?.trim() : existing.keyword,
        content: dto.content !== undefined ? dto.content.trim() : existing.content,
        isActive: dto.isActive !== undefined ? dto.isActive : existing.isActive,
      },
    });
  }

  /**
   * Xóa tin nhắn tự động của Shop
   */
  async deleteSellerAutoReply(sellerId: string, replyId: string) {
    const existing = await this.prisma.chatAutoReply.findFirst({
      where: { id: replyId, shopId: sellerId, scope: 'SHOP' },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy cấu hình tin nhắn tự động.');
    }

    await this.prisma.chatAutoReply.delete({ where: { id: replyId } });
    return { success: true, message: 'Đã xóa tin nhắn tự động thành công.' };
  }

  /**
   * Bật / Tắt kích hoạt tin nhắn tự động
   */
  async toggleSellerAutoReply(sellerId: string, replyId: string) {
    const existing = await this.prisma.chatAutoReply.findFirst({
      where: { id: replyId, shopId: sellerId, scope: 'SHOP' },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy cấu hình tin nhắn tự động.');
    }

    if (existing.status === 'CANCELLED_BY_ADMIN') {
      throw new ForbiddenException(
        'Tin nhắn tự động đã bị Quản trị viên vô hiệu hóa, không thể bật.',
      );
    }

    return this.prisma.chatAutoReply.update({
      where: { id: replyId },
      data: { isActive: !existing.isActive },
    });
  }

  /**
   * Admin tạo tin nhắn tự động chung của hệ thống (dành cho Staff CSKH Desk)
   */
  async createSystemAutoReply(_adminId: string, dto: CreateAutoReplyDto) {
    this.validateReply(dto.triggerType ?? 'WELCOME', dto.keyword, dto.content);
    assertCleanContent(dto.content, 'Nội dung tin nhắn tự động hệ thống');

    return this.prisma.chatAutoReply.create({
      data: {
        scope: 'SYSTEM',
        shopId: null,
        name: dto.name || 'Tin nhắn chào mừng CSKH Hệ thống',
        triggerType: dto.triggerType || 'WELCOME',
        keyword: dto.keyword?.trim() || null,
        content: dto.content.trim(),
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Admin hủy / khóa tin nhắn tự động của Seller kèm lý do
   */
  async cancelSellerAutoReply(adminId: string, replyId: string, dto: CancelAutoReplyDto) {
    const existing = await this.prisma.chatAutoReply.findUnique({
      where: { id: replyId },
      include: { shop: { select: { id: true, fullName: true, email: true } } },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy tin nhắn tự động.');
    }

    return this.prisma.chatAutoReply.update({
      where: { id: replyId },
      data: {
        status: 'CANCELLED_BY_ADMIN',
        isActive: false,
        cancelReason: dto.cancelReason.trim(),
        cancelledBy: adminId,
        cancelledAt: new Date(),
      },
    });
  }

  /**
   * Admin xem danh sách tin nhắn tự động toàn sàn
   */
  async listAutoRepliesForAdmin(query: QueryAutoRepliesDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.scope) where.scope = query.scope;
    if (query.status) where.status = query.status;
    if (query.shopId) where.shopId = query.shopId;

    const [items, total] = await Promise.all([
      this.prisma.chatAutoReply.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          shop: { select: { id: true, fullName: true, email: true, shopAvatarUrl: true } },
          cancelledByUser: { select: { id: true, fullName: true, email: true } },
        },
      }),
      this.prisma.chatAutoReply.count({ where }),
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
   * Xem lịch sử lý do hủy của một tin nhắn tự động
   */
  async getAutoReplyHistory(replyId: string) {
    const reply = await this.prisma.chatAutoReply.findUnique({
      where: { id: replyId },
      include: {
        cancelledByUser: { select: { id: true, fullName: true, email: true } },
        shop: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!reply) {
      throw new NotFoundException('Không tìm thấy tin nhắn tự động.');
    }

    return {
      id: reply.id,
      name: reply.name,
      content: reply.content,
      status: reply.status,
      cancelReason: reply.cancelReason,
      cancelledAt: reply.cancelledAt,
      cancelledBy: reply.cancelledByUser,
      shop: reply.shop,
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt,
    };
  }

  private validateReply(
    trigger: string,
    keyword: string | null | undefined,
    content: string,
  ): void {
    if (!content.trim()) throw new BadRequestException('Nội dung trả lời không được để trống.');
    if (trigger === 'KEYWORD' && !normalizeChatText(keyword ?? ''))
      throw new BadRequestException('Cấu hình KEYWORD cần từ khóa hợp lệ.');
  }

  /**
   * Evaluates incoming message content against active auto-reply triggers,
   * prioritizing exact keyword matches followed by contextual fallbacks (offline, welcome, default).
   *
   * @param shopId - Target merchant shop identifier or null for system scope
   * @param scope - Configuration scope (SHOP or SYSTEM)
   * @param text - Candidate message text
   * @param context - Additional contextual trigger flags
   * @returns Matched reply content or null
   */
  async findMatchingReply(
    shopId: string | null,
    scope: 'SHOP' | 'SYSTEM',
    text = '',
    context: { firstMessage?: boolean; offline?: boolean } = {},
  ): Promise<string | null> {
    if (scope === 'SHOP' && !shopId) return null;
    const normalized = normalizeChatText(text);

    if (normalized) {
      const keywordReplies = await this.prisma.chatAutoReply.findMany({
        where: {
          scope,
          shopId: scope === 'SHOP' ? shopId : null,
          isActive: true,
          status: 'ACTIVE',
          triggerType: 'KEYWORD',
          keyword: { not: null },
        },
      });

      keywordReplies.sort(
        (a, b) =>
          normalizeChatText(b.keyword ?? '').length - normalizeChatText(a.keyword ?? '').length ||
          a.id.localeCompare(b.id),
      );
      for (const reply of keywordReplies) {
        if (reply.keyword && containsChatPhrase(text, reply.keyword)) {
          return reply.content;
        }
      }
    }

    const triggers = [
      ...(context.offline ? ['OFFLINE'] : []),
      ...(context.firstMessage ? ['WELCOME'] : []),
      'DEFAULT',
    ];
    for (const triggerType of triggers) {
      const reply = await this.prisma.chatAutoReply.findFirst({
        where: {
          scope,
          shopId: scope === 'SHOP' ? shopId : null,
          isActive: true,
          status: 'ACTIVE',
          triggerType,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      });
      if (reply?.content) return reply.content;
    }
    return null;
  }
}
