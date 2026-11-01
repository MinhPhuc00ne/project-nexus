import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ChatbotMessageDto } from '../dtos/chatbot-message.dto';
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
  engine: 'FAQ' | 'GEMINI' | 'ORDER';
  topic: ChatbotTopic | 'WELCOME' | 'UNKNOWN';
  sources: { id: string; title: string }[];
  actions: { type: 'REQUEST_SUPPORT' | 'SELECT_ORDER'; endpoint?: string }[];
  order?: {
    id: string;
    status: string;
    shipmentStatus: string | null;
    waybillCode: string | null;
    afterSalesStatus: string | null;
  };
}

const orderLabels: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  PREPARING: 'Đang chuẩn bị hàng',
  SHIPPING: 'Đang giao hàng',
  DELIVERED: 'Đã giao hàng',
  CONFIRMED: 'Đã xác nhận nhận hàng',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Đã hoàn tiền',
};

@Injectable()
export class ChatbotService {
  constructor(
    private readonly prisma: PrismaService,
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
    if (dto.orderId) return this.orderReply(userId, dto.orderId);
    let topic = matchChatbotTopic(dto.message);
    let engine: ChatbotReply['engine'] = 'FAQ';
    if (
      !topic &&
      ['xin chao', 'chao', 'hello', 'hi'].some((word) => containsChatPhrase(dto.message, word))
    )
      return {
        reply:
          'Xin chào! Mình là trợ lý tự động NEXUS. Mình có thể hướng dẫn thanh toán, giao hàng, hủy/trả hàng, hoàn tiền và tra cứu đơn của bạn.',
        engine,
        topic: 'WELCOME',
        sources: [],
        actions: [],
      };
    if (!topic) {
      topic = await this.ai.classify(dto.message);
      if (topic) engine = 'GEMINI';
    }
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

  private async orderReply(userId: string, orderId: string): Promise<ChatbotReply> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, OR: [{ buyerId: userId }, { sellerId: userId }] },
      select: {
        id: true,
        status: true,
        shipment: { select: { status: true, waybillCode: true } },
        afterSales: { select: { status: true } },
      },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng của bạn.');
    return {
      reply: `Đơn ${order.id}: ${orderLabels[order.status] ?? order.status}.${order.afterSales ? ` Yêu cầu hậu mãi: ${order.afterSales.status}.` : ''} Đây là trạng thái đã lưu trên NEXUS; chatbot không tự thay đổi trạng thái hoặc xác nhận hoàn tiền.`,
      engine: 'ORDER',
      topic: 'ORDER',
      sources: [{ id: 'ORDER_DATABASE', title: 'Dữ liệu đơn hàng NEXUS' }],
      actions: [{ type: 'REQUEST_SUPPORT', endpoint: '/api/v1/chat/request-support' }],
      order: {
        id: order.id,
        status: order.status,
        shipmentStatus: order.shipment?.status ?? null,
        waybillCode: order.shipment?.waybillCode ?? null,
        afterSalesStatus: order.afterSales?.status ?? null,
      },
    };
  }
}
