import { BadRequestException, Injectable } from '@nestjs/common';
import { ChatbotCommerceService } from './chatbot-commerce.service';
import type { ChatbotReply } from './chatbot-reply';
import {
  accountStatusIntent,
  commerceIntent,
  isCommerceFollowUp,
  messageOrderId,
} from './chatbot-commerce-intent';
import {
  ChatbotHistoryMessageDto,
  ChatbotMessageDto,
  GuestChatbotMessageDto,
} from '../dtos/chatbot-message.dto';
import { ChatbotAiService } from './chatbot-ai.service';
import {
  chatbotKnowledge,
  ChatbotTopic,
  containsChatPhrase,
  matchChatbotTopic,
} from './chatbot-knowledge';
import { ChatbotRateLimitService } from './chatbot-rate-limit.service';

export type { ChatbotAction, ChatbotReply } from './chatbot-reply';

/** Coordinates rate limiting, ownership-scoped commerce queries, FAQ fallback, and Gemini AI replies. */
@Injectable()
export class ChatbotService {
  constructor(
    private readonly commerce: ChatbotCommerceService,
    private readonly ai: ChatbotAiService,
    private readonly rateLimit: ChatbotRateLimitService,
  ) {}

  /**
   * Returns current AI configuration readiness and supported static topics.
   * @returns Capability flags and topic summaries.
   */
  capabilities(): { aiConfigured: boolean; topics: { id: string; title: string }[] } {
    return {
      aiConfigured: this.ai.isConfigured(),
      topics: chatbotKnowledge.map(({ id, title }) => ({ id, title })),
    };
  }

  /**
   * Generates a reply for an authenticated user, enforcing rate limits and ownership boundaries.
   * @param userId Authenticated account identifier.
   * @param dto Validated message and optional lookup parameters.
   * @returns Structured assistant response.
   * @throws BadRequestException when single-order lookup is combined with list/cart filters or vice versa.
   */
  async reply(userId: string, dto: ChatbotMessageDto): Promise<ChatbotReply> {
    await this.rateLimit.check(userId);
    if (matchChatbotTopic(dto.message) === 'SECURITY') return this.answer(dto.message, true);
    const orderId = dto.orderId ?? messageOrderId(dto.message);
    if (orderId && (dto.intent || dto.status || dto.page || dto.limit))
      throw new BadRequestException('Tra cứu một đơn không kết hợp truy vấn danh sách hoặc giỏ.');
    if (orderId) return this.commerce.order(userId, orderId, dto.message);
    const navResult = await this.commerce.navigate?.(dto.message, true);
    if (navResult) return navResult;
    const result = await this.commerce.answer(userId, dto);
    if (result) return result;
    if (dto.status || dto.page || dto.limit)
      throw new BadRequestException('Hãy chọn truy vấn đơn mua, đơn bán hoặc giỏ hàng.');
    const accountResult = await this.commerce.accountStatus?.(
      userId,
      dto.message,
      dto.history ?? [],
    );
    if (accountResult) return accountResult;
    const catalogResult = await this.commerce.searchCatalog?.(dto.message);
    if (catalogResult) return catalogResult;
    return this.answer(dto.message, true, dto.history ?? []);
  }

  /**
   * Generates a general policy reply for unauthenticated guests without accessing private data.
   * @param identity Hashed peer address used solely for guest rate limiting.
   * @param dto Validated guest message and optional conversation history.
   * @returns Structured assistant response prompting login for protected actions.
   */
  async replyGuest(identity: string, dto: GuestChatbotMessageDto): Promise<ChatbotReply> {
    await this.rateLimit.check(`guest:${identity}`);
    const navResult = await this.commerce.navigate?.(dto.message, false);
    if (navResult) return navResult;
    const guestIntent = commerceIntent(dto.message);
    if (guestIntent || messageOrderId(dto.message) || isCommerceFollowUp(dto.message))
      return {
        reply: 'Vui lòng đăng nhập để tra cứu đơn hàng hoặc giỏ hàng của bạn.',
        engine: 'FAQ',
        topic: guestIntent === 'CART' ? 'CART' : 'ORDER',
        sources: [],
        actions: [{ type: 'LOGIN' }],
      };
    if (accountStatusIntent(dto.message, dto.history ?? []))
      return {
        reply:
          'Vui lòng đăng nhập để kiểm tra điểm uy tín, số dư ví và điều kiện tài khoản của bạn.',
        engine: 'FAQ',
        topic: 'AUCTION',
        sources: [],
        actions: [{ type: 'LOGIN' }],
      };
    const catalogResult = await this.commerce.searchCatalog?.(dto.message);
    if (catalogResult) {
      return {
        ...catalogResult,
        actions: catalogResult.actions.filter((action) => action.type === 'NAVIGATE'),
      };
    }
    const response = await this.answer(dto.message, false, dto.history ?? []);
    if (response.topic === 'WELCOME' && response.engine === 'FAQ') {
      response.reply =
        'Xin chào! Mình là trợ lý tự động NEXUS. Bạn có thể hỏi chính sách thanh toán, giao hàng, hủy/trả hàng và hoàn tiền. Vui lòng đăng nhập nếu cần tra cứu đơn hoặc liên hệ nhân viên.';
    }
    if (response.topic === 'ORDER') {
      response.reply =
        'Vui lòng đăng nhập để tra cứu đơn hàng của bạn. Khách chưa đăng nhập chỉ có thể hỏi chính sách chung của NEXUS.';
    }
    response.actions = response.actions.length > 0 ? [{ type: 'LOGIN' }] : [];
    return response;
  }

  /**
   * Resolves conversational answers via Gemini when safe and falls back to deterministic FAQ rules.
   * @param message Current user prompt.
   * @param authenticated Whether the caller holds a verified user session.
   * @param history Optional previous conversation turns.
   * @returns Assistant reply from Gemini or deterministic FAQ knowledge.
   */
  private async answer(
    message: string,
    authenticated: boolean,
    history: ChatbotHistoryMessageDto[] = [],
  ): Promise<ChatbotReply> {
    const topic = matchChatbotTopic(message);
    if (topic !== 'SECURITY') {
      const aiReply = await this.replyFromAi(message, history, authenticated);
      if (aiReply) return aiReply;
    }
    return this.replyFromFallback(message, topic);
  }

  /**
   * Redacts credential-bearing history turns and queries Gemini when enabled.
   * @param message Current non-credential prompt.
   * @param history Optional prior turns.
   * @param authenticated Whether the caller is authenticated.
   * @returns Formatted Gemini reply, or null when unavailable or invalid.
   */
  private async replyFromAi(
    message: string,
    history: ChatbotHistoryMessageDto[],
    authenticated: boolean,
  ): Promise<ChatbotReply | null> {
    const safeHistory = history.map((turn) =>
      matchChatbotTopic(turn.content) === 'SECURITY'
        ? { ...turn, content: '[Nội dung bảo mật đã được ẩn.]' }
        : turn,
    );
    const generated = await this.ai.answer(message, safeHistory, authenticated);
    if (!generated) return null;
    const entry = chatbotKnowledge.find((item) => item.id === generated.topic);
    return {
      ...generated,
      engine: 'GEMINI',
      sources: entry ? [{ id: entry.id, title: entry.title }] : [],
      actions: this.actionsForTopic(generated.topic),
    };
  }

  /**
   * Produces a deterministic greeting, topic FAQ, or unknown fallback response.
   * @param message Current user prompt.
   * @param topic Pre-matched static knowledge topic, if any.
   * @returns Deterministic FAQ reply.
   */
  private replyFromFallback(message: string, topic: ChatbotTopic | null): ChatbotReply {
    if (
      !topic &&
      ['xin chao', 'chao', 'hello', 'hi'].some((word) => containsChatPhrase(message, word))
    ) {
      return {
        reply:
          'Xin chào! Mình là trợ lý tự động NEXUS. Mình có thể hướng dẫn thanh toán, giao hàng, hủy/trả hàng, hoàn tiền và tra cứu đơn của bạn.',
        engine: 'FAQ',
        topic: 'WELCOME',
        sources: [],
        actions: [],
      };
    }
    const entry = chatbotKnowledge.find((item) => item.id === topic);
    if (!entry) {
      return {
        reply:
          'Mình chưa có thông tin đủ chắc chắn cho câu hỏi này. Bạn có thể chọn một chủ đề hỗ trợ hoặc gửi yêu cầu tới nhân viên CSKH.',
        engine: 'FAQ',
        topic: 'UNKNOWN',
        sources: [],
        actions: [{ type: 'REQUEST_SUPPORT', endpoint: '/api/v1/chat/request-support' }],
      };
    }
    return {
      reply: entry.answer,
      engine: 'FAQ',
      topic: entry.id,
      sources: [{ id: entry.id, title: entry.title }],
      actions: this.actionsForTopic(entry.id),
    };
  }

  /**
   * Maps a resolved topic to the fixed catalog of safe UI follow-up actions.
   * @param topic Resolved reply topic.
   * @returns Allowed client actions for the topic.
   */
  private actionsForTopic(topic: ChatbotReply['topic']): ChatbotReply['actions'] {
    if (topic === 'WELCOME') return [];
    if (topic === 'ORDER')
      return [
        { type: 'NAVIGATE', path: '/buyer/orders', label: 'Mở đơn hàng của tôi' },
        { type: 'REQUEST_SUPPORT', endpoint: '/api/v1/chat/request-support' },
      ];
    if (topic === 'AUCTION')
      return [
        { type: 'NAVIGATE', path: '/auction', label: 'Mở trang Đấu giá' },
        { type: 'NAVIGATE', path: '/buyer/bids', label: 'Đấu giá của tôi' },
        { type: 'REQUEST_SUPPORT', endpoint: '/api/v1/chat/request-support' },
      ];
    if (topic === 'WALLET')
      return [
        { type: 'NAVIGATE', path: '/buyer/wallet', label: 'Mở Ví NEXUS Pay' },
        { type: 'REQUEST_SUPPORT', endpoint: '/api/v1/chat/request-support' },
      ];
    if (topic === 'REPUTATION')
      return [
        { type: 'NAVIGATE', path: '/buyer/reputation', label: 'Xem Điểm uy tín' },
        { type: 'REQUEST_SUPPORT', endpoint: '/api/v1/chat/request-support' },
      ];
    if (topic === 'CART')
      return [
        { type: 'NAVIGATE', path: '/cart', label: 'Mở giỏ hàng' },
        { type: 'REQUEST_SUPPORT', endpoint: '/api/v1/chat/request-support' },
      ];
    return [{ type: 'REQUEST_SUPPORT', endpoint: '/api/v1/chat/request-support' }];
  }
}
