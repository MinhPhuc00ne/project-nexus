import { BadRequestException, Injectable } from '@nestjs/common';
import { CommerceChatQueryService } from '../../commerce/services/commerce-chat-query.service';
import { ChatbotCommerceService } from './chatbot-commerce.service';
import { commerceIntent, messageOrderId } from './chatbot-commerce-intent';
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

export interface ChatbotReply {
  reply: string;
  engine: 'FAQ' | 'GEMINI' | 'ORDER' | 'CART';
  topic: ChatbotTopic | 'WELCOME' | 'UNKNOWN';
  sources: { id: string; title: string }[];
  actions: { type: 'REQUEST_SUPPORT' | 'SELECT_ORDER' | 'LOGIN'; endpoint?: string }[];
  orders?: Awaited<ReturnType<CommerceChatQueryService['orders']>>;
  cart?: Awaited<ReturnType<CommerceChatQueryService['cart']>>;
  order?: {
    id: string;
    status: string;
    shipmentStatus: string | null;
    waybillCode: string | null;
    afterSalesStatus: string | null;
  };
}

@Injectable()
export class ChatbotService {
  constructor(
    private readonly commerce: ChatbotCommerceService,
    private readonly ai: ChatbotAiService,
    private readonly rateLimit: ChatbotRateLimitService,
  ) {}

  capabilities(): { aiConfigured: boolean; topics: { id: string; title: string }[] } {
    return {
      aiConfigured: this.ai.isConfigured(),
      topics: chatbotKnowledge.map(({ id, title }) => ({ id, title })),
    };
  }

  async reply(userId: string, dto: ChatbotMessageDto): Promise<ChatbotReply> {
    await this.rateLimit.check(userId);
    const orderId = dto.orderId ?? messageOrderId(dto.message);
    if (orderId && (dto.intent || dto.status || dto.page || dto.limit))
      throw new BadRequestException('Tra cứu một đơn không kết hợp truy vấn danh sách hoặc giỏ.');
    if (orderId) return this.commerce.order(userId, orderId);
    const result = await this.commerce.answer(userId, dto);
    if (result) return result;
    if (dto.status || dto.page || dto.limit)
      throw new BadRequestException('Hãy chọn truy vấn đơn mua, đơn bán hoặc giỏ hàng.');
    return this.answer(dto.message, true, dto.history ?? []);
  }

  async replyGuest(identity: string, dto: GuestChatbotMessageDto): Promise<ChatbotReply> {
    await this.rateLimit.check(`guest:${identity}`);
    if (commerceIntent(dto.message) || messageOrderId(dto.message))
      return {
        reply: 'Vui lòng đăng nhập để tra cứu đơn hàng hoặc giỏ hàng của bạn.',
        engine: 'FAQ',
        topic: 'ORDER',
        sources: [],
        actions: [{ type: 'LOGIN' }],
      };
    const response = await this.answer(dto.message, false, dto.history ?? []);
    if (response.topic === 'WELCOME' && response.engine === 'FAQ') {
      response.reply =
        'Xin chào! Mình là trợ lý tự động NEXUS. Bạn có thể hỏi chính sách thanh toán, giao hàng, hủy/trả hàng và hoàn tiền. Vui lòng đăng nhập nếu cần tra cứu đơn hoặc liên hệ nhân viên.';
    }
    if (response.topic === 'ORDER') {
      response.reply =
        'Vui lòng đăng nhập để tra cứu đơn hàng của bạn. Khách chưa đăng nhập chỉ có thể hỏi chính sách chung của NEXUS.';
    }
    response.actions = response.actions.map(() => ({ type: 'LOGIN' }));
    return response;
  }

  private async answer(
    message: string,
    authenticated: boolean,
    history: ChatbotHistoryMessageDto[] = [],
  ): Promise<ChatbotReply> {
    const topic = matchChatbotTopic(message);
    const engine: ChatbotReply['engine'] = 'FAQ';
    // Keep credential-bearing messages and history out of the external model.
    if (topic !== 'SECURITY') {
      const safeHistory = history.map((turn) =>
        matchChatbotTopic(turn.content) === 'SECURITY'
          ? { ...turn, content: '[Nội dung bảo mật đã được ẩn.]' }
          : turn,
      );
      const generated = await this.ai.answer(message, safeHistory, authenticated);
      if (generated) {
        const entry = chatbotKnowledge.find((item) => item.id === generated.topic);
        return {
          ...generated,
          engine: 'GEMINI',
          sources: entry ? [{ id: entry.id, title: entry.title }] : [],
          actions:
            generated.topic === 'WELCOME'
              ? []
              : generated.topic === 'ORDER'
                ? [{ type: 'SELECT_ORDER' }]
                : [{ type: 'REQUEST_SUPPORT', endpoint: '/api/v1/chat/request-support' }],
        };
      }
    }
    if (
      !topic &&
      ['xin chao', 'chao', 'hello', 'hi'].some((word) => containsChatPhrase(message, word))
    )
      return {
        reply:
          'Xin chào! Mình là trợ lý tự động NEXUS. Mình có thể hướng dẫn thanh toán, giao hàng, hủy/trả hàng, hoàn tiền và tra cứu đơn của bạn.',
        engine,
        topic: 'WELCOME',
        sources: [],
        actions: [],
      };
    const entry = chatbotKnowledge.find((item) => item.id === topic);
    if (!entry)
      return {
        reply:
          'Mình chưa có thông tin đủ chắc chắn cho câu hỏi này. Bạn có thể chọn một chủ đề hỗ trợ hoặc gửi yêu cầu tới nhân viên CSKH.',
        engine,
        topic: 'UNKNOWN',
        sources: [],
        actions: [{ type: 'REQUEST_SUPPORT', endpoint: '/api/v1/chat/request-support' }],
      };
    return {
      reply: entry.answer,
      engine,
      topic: entry.id,
      sources: [{ id: entry.id, title: entry.title }],
      actions:
        entry.id === 'ORDER'
          ? [{ type: 'SELECT_ORDER' }]
          : [{ type: 'REQUEST_SUPPORT', endpoint: '/api/v1/chat/request-support' }],
    };
  }
}
