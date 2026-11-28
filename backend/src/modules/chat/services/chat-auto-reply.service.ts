import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChatAutoReplyTriggerType } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { assertCleanContent } from '../../../core/moderation/content-moderation.util';
import { containsChatPhrase, normalizeChatText } from './chatbot-knowledge';
import {
  CancelAutoReplyInput,
  CreateAutoReplyInput,
  QueryAutoRepliesInput,
  UpdateAutoReplyInput,
} from '../dtos/auto-reply.dto';

@Injectable()
export class ChatAutoReplyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates an auto-reply rule for a Seller (maximum 10 rules per shop).
   */
  async createSellerAutoReply(sellerId: string, dto: CreateAutoReplyInput) {
    this.validateReply(dto.triggerType ?? 'WELCOME', dto.keyword, dto.content);
    assertCleanContent(dto.content, 'Auto-reply content');

    const totalCount = await this.prisma.chatAutoReply.count({
      where: { shopId: sellerId, scope: 'SHOP' },
    });
    if (totalCount >= 10) {
      throw new BadRequestException('Each store can create a maximum of 10 auto-reply rules.');
    }

    return this.prisma.chatAutoReply.create({
      data: {
        scope: 'SHOP',
        shopId: sellerId,
        name: dto.name || 'Auto-reply',
        triggerType: dto.triggerType || 'WELCOME',
        keyword: dto.keyword?.trim() || null,
        content: dto.content.trim(),
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Lists auto-reply rules for a Shop.
   */
  async getSellerAutoReplies(sellerId: string) {
    return this.prisma.chatAutoReply.findMany({
      where: { shopId: sellerId, scope: 'SHOP' },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Updates an auto-reply rule for a Shop.
   */
  async updateSellerAutoReply(sellerId: string, replyId: string, dto: UpdateAutoReplyInput) {
    const existing = await this.prisma.chatAutoReply.findFirst({
      where: { id: replyId, shopId: sellerId, scope: 'SHOP' },
    });

    if (!existing) {
      throw new NotFoundException('Store auto-reply configuration not found.');
    }

    if (existing.status === 'CANCELLED_BY_ADMIN') {
      throw new ForbiddenException(
        `This auto-reply was locked by an Administrator for policy violation (${existing.cancelReason || 'No reason provided'}). Cannot edit.`,
      );
    }

    this.validateReply(
      dto.triggerType ?? existing.triggerType,
      dto.keyword === undefined ? existing.keyword : dto.keyword,
      dto.content ?? existing.content,
    );
    if (dto.content) {
      assertCleanContent(dto.content, 'Auto-reply content');
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
   * Deletes an auto-reply rule for a Shop.
   */
  async deleteSellerAutoReply(sellerId: string, replyId: string) {
    const existing = await this.prisma.chatAutoReply.findFirst({
      where: { id: replyId, shopId: sellerId, scope: 'SHOP' },
    });

    if (!existing) {
      throw new NotFoundException('Auto-reply configuration not found.');
    }

    await this.prisma.chatAutoReply.delete({ where: { id: replyId } });
    return { success: true, message: 'Auto-reply deleted successfully.' };
  }

  /**
   * Toggles an auto-reply rule active state.
   */
  async toggleSellerAutoReply(sellerId: string, replyId: string) {
    const existing = await this.prisma.chatAutoReply.findFirst({
      where: { id: replyId, shopId: sellerId, scope: 'SHOP' },
    });

    if (!existing) {
      throw new NotFoundException('Auto-reply configuration not found.');
    }

    if (existing.status === 'CANCELLED_BY_ADMIN') {
      throw new ForbiddenException(
        'This auto-reply was disabled by an Administrator and cannot be enabled.',
      );
    }

    return this.prisma.chatAutoReply.update({
      where: { id: replyId },
      data: { isActive: !existing.isActive },
    });
  }

  /**
   * Creates a system-wide auto-reply rule (for the Support Staff desk).
   */
  async createSystemAutoReply(_adminId: string, dto: CreateAutoReplyInput) {
    this.validateReply(dto.triggerType ?? 'WELCOME', dto.keyword, dto.content);
    assertCleanContent(dto.content, 'System auto-reply content');

    return this.prisma.chatAutoReply.create({
      data: {
        scope: 'SYSTEM',
        shopId: null,
        name: dto.name || 'System Support Welcome Message',
        triggerType: dto.triggerType || 'WELCOME',
        keyword: dto.keyword?.trim() || null,
        content: dto.content.trim(),
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Admin cancels/locks a Seller auto-reply rule with a reason.
   */
  async cancelSellerAutoReply(adminId: string, replyId: string, dto: CancelAutoReplyInput) {
    const existing = await this.prisma.chatAutoReply.findUnique({
      where: { id: replyId },
      include: { shop: { select: { id: true, fullName: true, email: true } } },
    });

    if (!existing) {
      throw new NotFoundException('Auto-reply not found.');
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
   * Admin lists all auto-reply rules across the platform.
   */
  async listAutoRepliesForAdmin(query: QueryAutoRepliesInput) {
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
   * Views cancellation reason history for an auto-reply rule.
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
      throw new NotFoundException('Auto-reply not found.');
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
    if (!content.trim()) throw new BadRequestException('Reply content cannot be empty.');
    if (trigger === 'KEYWORD' && !normalizeChatText(keyword ?? ''))
      throw new BadRequestException('KEYWORD trigger requires a valid keyword.');
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

    const triggers: ChatAutoReplyTriggerType[] = [
      ...(context.offline ? [ChatAutoReplyTriggerType.OFFLINE] : []),
      ...(context.firstMessage ? [ChatAutoReplyTriggerType.WELCOME] : []),
      ChatAutoReplyTriggerType.DEFAULT,
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
