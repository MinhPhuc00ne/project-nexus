import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CommerceChatCart,
  CommerceChatOrderItem,
  CommerceChatOrders,
  CommerceChatQuery,
  CommerceChatQueryService,
} from '../../commerce/services/commerce-chat-query.service';
import { ChatbotMessageDto } from '../dtos/chatbot-message.dto';
import type { ChatbotReply } from './chatbot.service';
import {
  commerceIntent,
  commerceStatus,
  isClearStatusFollowUp,
  isCommerceFollowUp,
  isLatestOrderQuery,
  needsCommerceClarification,
  orderLabels,
} from './chatbot-commerce-intent';
import { chatbotKnowledge, matchChatbotTopic, normalizeChatText } from './chatbot-knowledge';

const money = (value: number): string => `${value.toLocaleString('vi-VN')} đ`;
const support: ChatbotReply['actions'] = [
  { type: 'REQUEST_SUPPORT', endpoint: '/api/v1/chat/request-support' },
];

interface CommerceContext {
  intent: ChatbotMessageDto['intent'] | null;
  status: ChatbotMessageDto['status'];
  needsScopeClarification: boolean;
}

/** Formats verified Commerce data locally so personal data never reaches Gemini. */
@Injectable()
export class ChatbotCommerceService {
  constructor(private readonly queries: CommerceChatQueryService) {}

  /**
   * Resolves a read-only cart or order-list response when the message requests personal commerce data.
   * @param userId Authenticated account identifier.
   * @param dto Validated query or the current natural-language message.
   * @returns A deterministic data reply, or null for ordinary conversation.
   * @throws BadRequestException for incompatible filters.
   */
  async answer(userId: string, dto: ChatbotMessageDto): Promise<ChatbotReply | null> {
    const context = this.queryContext(dto);
    if (context.needsScopeClarification) {
      const prompt = context.status
        ? `Bạn muốn xem đơn mua hay đơn bán ở trạng thái ${orderLabels[context.status]}? Hãy nêu rõ "đơn mua" hoặc "đơn bán".`
        : 'Bạn muốn xem tất cả đơn mua hay đơn bán? Hãy nêu rõ "đơn mua" hoặc "đơn bán".';
      return this.clarificationReply(prompt);
    }
    const intent = context.intent;
    if (!intent) return null;
    if (intent !== 'CART' && !dto.status && needsCommerceClarification(dto.message)) {
      return this.clarificationReply(
        'Bạn muốn kiểm tra một đơn cụ thể hay lọc danh sách theo một trạng thái? Hãy chọn mã đơn hoặc nêu một trạng thái rõ ràng; mình chưa áp dụng bộ lọc cho câu hỏi này.',
      );
    }
    if (intent === 'CART' && dto.status) {
      throw new BadRequestException('Giỏ hàng không hỗ trợ bộ lọc trạng thái đơn.');
    }
    const query = this.buildQuery(dto, context.status);
    if (intent === 'CART') {
      return this.formatCartReply(await this.queries.cart(userId, query));
    }
    const orders = await this.queries.orders(userId, intent, query);
    return this.formatOrdersReply(intent, query.status, orders);
  }

  /**
   * Builds pagination and status filters from explicit DTO fields or natural-language cues.
   * @param dto Request payload.
   * @param inheritedStatus Status inferred from the message or prior user turn.
   * @returns Bounded commerce query parameters.
   */
  private buildQuery(
    dto: ChatbotMessageDto,
    inheritedStatus?: ChatbotMessageDto['status'],
  ): CommerceChatQuery {
    const text = normalizeChatText(dto.message);
    const pageMatch = text.match(/\b(?:trang|page)\s+(\d+)\b/);
    const limitMatch = text.match(/\b(\d+)\s+(?:don|orders|mon)\b/);
    const defaultLimit = isLatestOrderQuery(dto.message) ? 1 : 5;
    return {
      status: dto.status ?? inheritedStatus,
      page: dto.page ?? Number(pageMatch?.[1] ?? 1),
      limit: dto.limit ?? Math.max(1, Math.min(20, Number(limitMatch?.[1] ?? defaultLimit))),
    };
  }

  /**
   * Formats a localized clarification prompt for ambiguous order queries.
   * @param reply Human-readable guidance prompt.
   * @returns Deterministic FAQ clarification payload.
   */
  private clarificationReply(reply: string): ChatbotReply {
    return {
      reply,
      engine: 'FAQ',
      topic: 'ORDER',
      sources: [],
      actions: [{ type: 'SELECT_ORDER' }],
    };
  }

  /**
   * Formats a bounded, revalidated shopping cart summary without exposing internal identifiers.
   * @param cart Ownership-scoped cart summary.
   * @returns Deterministic cart response.
   */
  private formatCartReply(cart: CommerceChatCart): ChatbotReply {
    const lines = cart.items
      .slice(0, 5)
      .map(
        (item) =>
          `${item.name.slice(0, 100)}${Object.keys(item.selections).length ? ` (${Object.values(item.selections).join(', ').slice(0, 100)})` : ''}: ${item.quantity} × ${money(item.currentPrice)}${item.hasPriceChanged ? ` — giá đã đổi (từ ${money(item.priceAtAdded)})` : ''}${item.hasInvalidSelections ? ' — phân loại không hợp lệ' : ''}${item.isOutOfStock ? ' — hết hàng' : item.isStockInsufficient ? ' — không đủ tồn' : ''}${item.isUnavailable ? ' — không khả dụng' : ''}`,
      );
    const reply =
      cart.total === 0
        ? 'Giỏ hàng của bạn hiện đang trống.'
        : `Giỏ có ${cart.totalCount} sản phẩm (${cart.total} dòng), tiền hàng ${money(cart.totalPrice)}, chưa gồm phí giao hàng. Trang ${cart.page}/${cart.totalPages}.\n${lines.join('\n')}${cart.items.length > 5 ? '\nĐang tóm tắt 5 dòng đầu của trang.' : ''}${cart.isExpired ? '\nGiỏ đã quá hạn lưu; cần kiểm tra lại trước khi mua.' : ''}${cart.hasPriceChanged ? '\nCó sản phẩm thay đổi giá.' : ''}${cart.hasUnavailableItems ? '\nCó sản phẩm hết hàng, không đủ tồn hoặc không khả dụng.' : ''}${!cart.items.length ? '\nTrang này không có sản phẩm.' : ''}`;
    return {
      reply,
      engine: 'CART',
      topic: 'CART',
      cart,
      sources: [{ id: 'CART_DATABASE', title: 'Dữ liệu giỏ hàng NEXUS' }],
      actions: support,
    };
  }

  /**
   * Formats a short readable product summary for an order's line items.
   * @param items Order line summaries.
   * @returns Human-readable product names and quantities, or an empty string when unavailable.
   */
  private summarizeOrderItems(items: CommerceChatOrderItem[]): string {
    if (!items.length) return '';
    const preview = items.slice(0, 2).map((item) => {
      const variants = Object.values(item.selections).join(', ').slice(0, 60);
      return `${item.name.slice(0, 80)}${variants ? ` (${variants})` : ''} × ${item.quantity}`;
    });
    const extra = items.length > 2 ? ` (+${items.length - 2} sản phẩm khác)` : '';
    return `${preview.join(', ')}${extra}`;
  }

  /**
   * Formats a paginated purchase or sales order summary.
   * @param intent Purchase or sales scope.
   * @param status Optional applied order status filter.
   * @param orders Ownership-scoped order page.
   * @returns Deterministic order-list response.
   */
  private formatOrdersReply(
    intent: 'PURCHASES' | 'SALES',
    status: ChatbotMessageDto['status'],
    orders: CommerceChatOrders,
  ): ChatbotReply {
    const label = intent === 'SALES' ? 'đơn bán' : 'đơn mua';
    const lines = orders.items.slice(0, 5).map((order) => {
      const itemSummary = this.summarizeOrderItems(order.items);
      const dateText =
        order.createdAt instanceof Date && !Number.isNaN(order.createdAt.getTime())
          ? order.createdAt.toLocaleDateString('vi-VN')
          : '';
      const heading = itemSummary || 'Đơn hàng';
      const meta = [dateText, orderLabels[order.status]].filter(Boolean).join(' · ');
      return `- ${heading} (${meta}) — ${money(order.totalAmount)} [Mã đơn: ${order.id}]`;
    });
    const reply =
      orders.total === 0
        ? `Bạn chưa có ${label}${status ? ` ở trạng thái ${orderLabels[status]}` : ''}.`
        : `Có ${orders.total} ${label}${status ? ` ở trạng thái ${orderLabels[status]}` : ''}. Trang ${orders.page}/${orders.totalPages}.\n${lines.join('\n')}${orders.items.length > 5 ? '\nĐang tóm tắt 5 đơn đầu của trang.' : ''}${!orders.items.length ? '\nTrang này không có đơn hàng.' : ''}\nĐây là trạng thái đã lưu trên NEXUS.`;
    return {
      reply,
      engine: 'ORDER',
      topic: 'ORDER',
      orders,
      sources: [{ id: 'ORDER_DATABASE', title: 'Dữ liệu đơn hàng NEXUS' }],
      actions: [{ type: 'SELECT_ORDER' }],
    };
  }

  /**
   * Restores conversational filters from user turns, never assistant claims or order IDs.
   * @param dto Current request and optional untrusted conversation history.
   * @returns Read intent and status; data ownership remains enforced by Commerce queries.
   */
  private queryContext(dto: ChatbotMessageDto): CommerceContext {
    let intent: ChatbotMessageDto['intent'] | null = null;
    let status: ChatbotMessageDto['status'];
    for (const turn of (dto.history ?? []).slice(-12)) {
      if (turn.role !== 'user') continue;
      const explicit = commerceIntent(turn.content);
      if (needsCommerceClarification(turn.content)) {
        intent = null;
        status = undefined;
        continue;
      }
      if (explicit || !isCommerceFollowUp(turn.content)) {
        intent = explicit;
        status = commerceStatus(turn.content);
      } else if (isClearStatusFollowUp(turn.content)) {
        if (intent === 'CART') intent = null;
        status = undefined;
      } else {
        const turnStatus = commerceStatus(turn.content);
        if (intent === 'CART' && turnStatus) {
          intent = null;
          status = undefined;
        } else {
          status = turnStatus ?? status;
        }
      }
    }
    const currentIntent = dto.intent ?? commerceIntent(dto.message);
    const followUp = !currentIntent && isCommerceFollowUp(dto.message);
    const clearStatus = followUp && isClearStatusFollowUp(dto.message);
    const currentStatus = dto.status ?? commerceStatus(dto.message);
    const cartOrderMismatch =
      !dto.intent && followUp && intent === 'CART' && (Boolean(currentStatus) || clearStatus);
    return {
      intent: cartOrderMismatch ? null : (currentIntent ?? (followUp ? intent : null)),
      status: clearStatus ? undefined : (currentStatus ?? (followUp ? status : undefined)),
      needsScopeClarification: cartOrderMismatch,
    };
  }

  /**
   * Looks up a single owned order and attaches relevant static policy guidance.
   * @param userId Authenticated buyer or seller identifier.
   * @param orderId Complete NEXUS order UUID.
   * @param message Current question, used only to select static policy guidance.
   * @returns The saved order, shipment and after-sales states.
   * @throws NotFoundException when no owned order matches.
   */
  async order(userId: string, orderId: string, message = ''): Promise<ChatbotReply> {
    const order = await this.queries.order(userId, orderId);
    const topic = matchChatbotTopic(message);
    const policy = chatbotKnowledge.find(
      (entry) =>
        entry.id === topic &&
        ['CANCELLATION', 'RETURN', 'REFUND', 'SHIPPING', 'PAYMENT', 'AUCTION', 'WALLET'].includes(
          entry.id,
        ),
    );
    const itemSummary = this.summarizeOrderItems(order.items);
    const itemsSegment = itemSummary ? ` (${itemSummary})` : '';
    const amountSegment =
      typeof order.totalAmount === 'number' && Number.isFinite(order.totalAmount)
        ? ` — ${money(order.totalAmount)}`
        : '';
    const waybillSegment = order.shipment?.waybillCode
      ? ` Vận đơn GHN: ${order.shipment.waybillCode}${order.shipment.status ? ` (${order.shipment.status})` : ''}.`
      : '';
    return {
      reply: `Đơn ${order.id}${itemsSegment}: ${orderLabels[order.status]}${amountSegment}.${waybillSegment}${order.afterSales ? ` Yêu cầu hậu mãi: ${order.afterSales.status}.` : ''} Đây là trạng thái đã lưu trên NEXUS; chatbot không tự thay đổi trạng thái hoặc xác nhận hoàn tiền.${policy ? `\n${policy.answer}` : ''}`,
      engine: 'ORDER',
      topic: 'ORDER',
      sources: [
        { id: 'ORDER_DATABASE', title: 'Dữ liệu đơn hàng NEXUS' },
        ...(policy ? [{ id: policy.id, title: policy.title }] : []),
      ],
      actions: support,
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
