import { BadRequestException, Injectable } from '@nestjs/common';
import { CommerceChatQueryService } from '../../commerce/services/commerce-chat-query.service';
import { ChatbotMessageDto } from '../dtos/chatbot-message.dto';
import type { ChatbotReply } from './chatbot.service';
import { commerceIntent, commerceStatus, orderLabels } from './chatbot-commerce-intent';

const money = (value: number): string => `${value.toLocaleString('vi-VN')} đ`;
const support: ChatbotReply['actions'] = [
  { type: 'REQUEST_SUPPORT', endpoint: '/api/v1/chat/request-support' },
];

/** Formats verified Commerce data locally so personal data never reaches Gemini. */
@Injectable()
export class ChatbotCommerceService {
  constructor(private readonly queries: CommerceChatQueryService) {}

  /**
   * @param userId Authenticated account identifier.
   * @param dto Validated query or the current natural-language message.
   * @returns A deterministic data reply, or null for ordinary conversation.
   * @throws BadRequestException for incompatible filters.
   */
  async answer(userId: string, dto: ChatbotMessageDto): Promise<ChatbotReply | null> {
    const intent = dto.intent ?? commerceIntent(dto.message);
    if (!intent) return null;
    if (intent === 'CART' && dto.status)
      throw new BadRequestException('Giỏ hàng không hỗ trợ bộ lọc trạng thái đơn.');
    const query = {
      status: dto.status ?? commerceStatus(dto.message),
      page: dto.page ?? Number(dto.message.match(/\btrang\s+(\d+)\b/i)?.[1] ?? 1),
      limit:
        dto.limit ??
        Math.max(
          1,
          Math.min(
            20,
            Number(dto.message.match(/\b(\d+)\s+(?:đơn|don|orders|món|mon)\b/i)?.[1] ?? 5),
          ),
        ),
    };
    if (intent === 'CART') {
      const cart = await this.queries.cart(userId, query);
      const lines = cart.items
        .slice(0, 5)
        .map(
          (item) =>
            `${item.name.slice(0, 100)}${Object.keys(item.selections).length ? ` (${Object.values(item.selections).join(', ').slice(0, 100)})` : ''}: ${item.quantity} × ${money(item.currentPrice)}${item.hasPriceChanged ? ' — giá đã đổi' : ''}${item.isOutOfStock ? ' — hết hàng' : item.isStockInsufficient ? ' — không đủ tồn' : ''}${item.isUnavailable ? ' — không khả dụng' : ''}`,
        );
      return {
        reply:
          cart.total === 0
            ? 'Giỏ hàng của bạn hiện đang trống.'
            : `Giỏ có ${cart.totalCount} sản phẩm (${cart.total} dòng), tiền hàng ${money(cart.totalPrice)}, chưa gồm phí giao hàng. Trang ${cart.page}/${cart.totalPages}.\n${lines.join('\n')}${cart.items.length > 5 ? '\nĐang tóm tắt 5 dòng đầu của trang.' : ''}${cart.isExpired ? '\nGiỏ đã quá hạn lưu; cần kiểm tra lại trước khi mua.' : ''}${cart.hasPriceChanged ? '\nCó sản phẩm thay đổi giá.' : ''}${cart.hasUnavailableItems ? '\nCó sản phẩm hết hàng, không đủ tồn hoặc không khả dụng.' : ''}${!cart.items.length ? '\nTrang này không có sản phẩm.' : ''}`,
        engine: 'CART',
        topic: 'CART',
        cart,
        sources: [{ id: 'CART_DATABASE', title: 'Dữ liệu giỏ hàng NEXUS' }],
        actions: support,
      };
    }
    const orders = await this.queries.orders(userId, intent, query);
    const label = intent === 'SALES' ? 'đơn bán' : 'đơn mua';
    const lines = orders.items
      .slice(0, 5)
      .map((order) => `${order.id}: ${orderLabels[order.status]} — ${money(order.totalAmount)}`);
    return {
      reply:
        orders.total === 0
          ? `Bạn chưa có ${label}${query.status ? ` ở trạng thái ${orderLabels[query.status]}` : ''}.`
          : `Có ${orders.total} ${label}${query.status ? ` ở trạng thái ${orderLabels[query.status]}` : ''}. Trang ${orders.page}/${orders.totalPages}.\n${lines.join('\n')}${orders.items.length > 5 ? '\nĐang tóm tắt 5 đơn đầu của trang.' : ''}${!orders.items.length ? '\nTrang này không có đơn hàng.' : ''}\nĐây là trạng thái đã lưu trên NEXUS.`,
      engine: 'ORDER',
      topic: 'ORDER',
      orders,
      sources: [{ id: 'ORDER_DATABASE', title: 'Dữ liệu đơn hàng NEXUS' }],
      actions: [{ type: 'SELECT_ORDER' }],
    };
  }

  /**
   * @param userId Authenticated buyer or seller identifier.
   * @param orderId Complete NEXUS order UUID.
   * @returns The saved order, shipment and after-sales states.
   * @throws NotFoundException when no owned order matches.
   */
  async order(userId: string, orderId: string): Promise<ChatbotReply> {
    const order = await this.queries.order(userId, orderId);
    return {
      reply: `Đơn ${order.id}: ${orderLabels[order.status]}.${order.afterSales ? ` Yêu cầu hậu mãi: ${order.afterSales.status}.` : ''} Đây là trạng thái đã lưu trên NEXUS; chatbot không tự thay đổi trạng thái hoặc xác nhận hoàn tiền.`,
      engine: 'ORDER',
      topic: 'ORDER',
      sources: [{ id: 'ORDER_DATABASE', title: 'Dữ liệu đơn hàng NEXUS' }],
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
