import { BadRequestException, Injectable } from '@nestjs/common';
import { AuctionStatus } from '@prisma/client';
import {
  CommerceChatCart,
  CommerceChatOrderItem,
  CommerceChatOrders,
  CommerceChatQuery,
  CommerceChatQueryService,
} from '../../commerce-query/services/commerce-chat-query.service';
import { ChatbotMessageInput } from '../dtos/chatbot-message.dto';
import type { ChatbotReply } from './chatbot-reply';
import {
  accountStatusIntent,
  commerceIntent,
  commerceStatus,
  extractAuctionEligibilityFilter,
  extractCartBudget,
  extractNavigationRequest,
  extractShoppingQuery,
  isCartEligibilityQuery,
  isClearStatusFollowUp,
  isCommerceFollowUp,
  isLatestOrderQuery,
  needsCommerceClarification,
  orderLabels,
} from './chatbot-commerce-intent';
import { chatbotKnowledge, matchChatbotTopic, normalizeChatText } from './chatbot-knowledge';

const money = (value: number): string => `${value.toLocaleString('vi-VN')} đ`;
const pageSummary = (page: number, totalPages: number): string =>
  totalPages > 1 || page > 1 ? ` Trang ${page}/${totalPages}.` : '';
const auctionStatusLabels: Partial<Record<AuctionStatus, string>> = {
  ACTIVE: 'Đang diễn ra',
  EXTENDED: 'Đang gia hạn',
  SCHEDULED: 'Sắp diễn ra',
};
const support: ChatbotReply['actions'] = [
  { type: 'REQUEST_SUPPORT', endpoint: '/api/v1/chat/request-support' },
];

interface CommerceContext {
  intent: ChatbotMessageInput['intent'] | null;
  status: ChatbotMessageInput['status'];
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
  async answer(userId: string, dto: ChatbotMessageInput): Promise<ChatbotReply | null> {
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
      const budget = extractCartBudget(dto.message);
      const checkEligibility = budget !== null || isCartEligibilityQuery(dto.message);
      const cartQuery = checkEligibility && !dto.limit ? { ...query, limit: 20 } : query;
      const cart = await this.queries.cart(userId, cartQuery);
      if (checkEligibility) {
        return this.formatCartEligibilityReply(cart, budget);
      }
      return this.formatCartReply(cart);
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
    dto: ChatbotMessageInput,
    inheritedStatus?: ChatbotMessageInput['status'],
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
        : `Giỏ có ${cart.totalCount} sản phẩm (${cart.total} dòng), tiền hàng ${money(cart.totalPrice)}, chưa gồm phí giao hàng.${pageSummary(cart.page, cart.totalPages)}\n${lines.join('\n')}${cart.items.length > 5 ? '\nĐang tóm tắt 5 dòng đầu của trang.' : ''}${cart.isExpired ? '\nGiỏ đã quá hạn lưu; cần kiểm tra lại trước khi mua.' : ''}${cart.hasPriceChanged ? '\nCó sản phẩm thay đổi giá.' : ''}${cart.hasUnavailableItems ? '\nCó sản phẩm hết hàng, không đủ tồn hoặc không khả dụng.' : ''}${!cart.items.length ? '\nTrang này không có sản phẩm.' : ''}`;
    return {
      reply,
      engine: 'CART',
      topic: 'CART',
      cart,
      sources: [{ id: 'CART_DATABASE', title: 'Dữ liệu giỏ hàng NEXUS' }],
      actions: [{ type: 'NAVIGATE', path: '/cart', label: 'Mở giỏ hàng' }, ...support],
    };
  }

  /**
   * Evaluates cart items for purchase eligibility and optional buyer budget fit.
   * @param cart Ownership-scoped cart summary.
   * @param budget Optional buyer budget in VND.
   * @returns Filtered eligibility summary with shipping-fee disclaimer.
   */
  private formatCartEligibilityReply(cart: CommerceChatCart, budget: number | null): ChatbotReply {
    if (cart.total === 0) {
      return {
        reply: 'Giỏ hàng của bạn hiện đang trống.',
        engine: 'CART',
        topic: 'CART',
        cart,
        sources: [{ id: 'CART_DATABASE', title: 'Dữ liệu giỏ hàng NEXUS' }],
        actions: [{ type: 'NAVIGATE', path: '/cart', label: 'Mở giỏ hàng' }, ...support],
      };
    }

    const availableItems = cart.items.filter(
      (item) =>
        !item.isOutOfStock &&
        !item.isStockInsufficient &&
        !item.isUnavailable &&
        !item.hasInvalidSelections,
    );

    if (budget === null) {
      const unavailableCount = cart.items.length - availableItems.length;
      const lines = availableItems
        .slice(0, 5)
        .map(
          (item) =>
            `- ${item.name.slice(0, 100)}: ${item.quantity} × ${money(item.currentPrice)} (tổng ${money(item.itemSubtotal)})`,
        );
      const reply = availableItems.length
        ? `Trong giỏ hàng có ${availableItems.length} sản phẩm đủ điều kiện mua ngay:\n${lines.join('\n')}${unavailableCount > 0 ? `\n(${unavailableCount} sản phẩm khác hiện hết hàng, không đủ tồn hoặc không khả dụng.)` : ''}`
        : 'Hiện không có sản phẩm nào trong giỏ hàng đủ điều kiện mua (các sản phẩm đang hết hàng, không đủ tồn hoặc không khả dụng).';
      return {
        reply,
        engine: 'CART',
        topic: 'CART',
        cart,
        sources: [{ id: 'CART_DATABASE', title: 'Dữ liệu giỏ hàng NEXUS' }],
        actions: [{ type: 'NAVIGATE', path: '/cart', label: 'Mở giỏ hàng' }, ...support],
      };
    }

    const affordable = availableItems.filter((item) => item.currentPrice <= budget);
    const lines = affordable.slice(0, 5).map((item) => {
      if (item.itemSubtotal <= budget) {
        return `- ${item.name.slice(0, 100)}: ${item.quantity} × ${money(item.currentPrice)} (tổng ${money(item.itemSubtotal)})`;
      }
      const maxQty = Math.floor(budget / item.currentPrice);
      return `- ${item.name.slice(0, 100)}: ${money(item.currentPrice)}/sp (đủ mua tối đa ${maxQty} sp; giỏ đang chọn ${item.quantity} sp = ${money(item.itemSubtotal)})`;
    });

    const excludedCount = cart.items.length - affordable.length;
    const minPrice = availableItems.length
      ? Math.min(...availableItems.map((item) => item.currentPrice))
      : null;

    const reply = affordable.length
      ? `Với ngân sách ${money(budget)} (chưa tính phí giao hàng), trong giỏ hàng có ${affordable.length} sản phẩm đủ điều kiện mua:\n${lines.join('\n')}${excludedCount > 0 ? `\n(${excludedCount} sản phẩm khác vượt mức ${money(budget)} hoặc chưa đủ tồn kho/khả dụng.)` : ''}\nLưu ý: Tổng thanh toán thực tế sẽ cộng thêm phí giao hàng.`
      : availableItems.length
        ? `Với ngân sách ${money(budget)}, hiện không có sản phẩm nào trong giỏ hàng đủ điều kiện mua (sản phẩm khả dụng thấp nhất trong giỏ là ${money(minPrice ?? 0)}, chưa gồm phí giao hàng).`
        : 'Hiện không có sản phẩm khả dụng nào trong giỏ hàng đủ điều kiện mua.';

    return {
      reply,
      engine: 'CART',
      topic: 'CART',
      cart,
      sources: [{ id: 'CART_DATABASE', title: 'Dữ liệu giỏ hàng NEXUS' }],
      actions: [{ type: 'NAVIGATE', path: '/cart', label: 'Mở giỏ hàng' }, ...support],
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
    status: ChatbotMessageInput['status'],
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
        : `Có ${orders.total} ${label}${status ? ` ở trạng thái ${orderLabels[status]}` : ''}.${pageSummary(orders.page, orders.totalPages)}\n${lines.join('\n')}${orders.items.length > 5 ? '\nĐang tóm tắt 5 đơn đầu của trang.' : ''}${!orders.items.length ? '\nTrang này không có đơn hàng.' : ''}\nĐây là trạng thái đã lưu trên NEXUS.`;
    return {
      reply,
      engine: 'ORDER',
      topic: 'ORDER',
      orders,
      sources: [{ id: 'ORDER_DATABASE', title: 'Dữ liệu đơn hàng NEXUS' }],
      actions: [
        { type: 'SELECT_ORDER' },
        {
          type: 'NAVIGATE',
          path: intent === 'SALES' ? '/seller/orders' : '/buyer/orders',
          label: intent === 'SALES' ? 'Mở đơn bán' : 'Mở đơn hàng của tôi',
        },
      ],
    };
  }

  /**
   * Restores conversational filters from user turns, never assistant claims or order IDs.
   * @param dto Current request and optional untrusted conversation history.
   * @returns Read intent and status; data ownership remains enforced by Commerce queries.
   */
  private queryContext(dto: ChatbotMessageInput): CommerceContext {
    let intent: ChatbotMessageInput['intent'] | null = null;
    let status: ChatbotMessageInput['status'];
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
      actions: [
        { type: 'NAVIGATE', path: `/buyer/orders/${order.id}`, label: 'Xem chi tiết đơn' },
        ...support,
      ],
      order: {
        id: order.id,
        status: order.status,
        shipmentStatus: order.shipment?.status ?? null,
        waybillCode: order.shipment?.waybillCode ?? null,
        afterSalesStatus: order.afterSales?.status ?? null,
      },
    };
  }

  /**
   * Searches public storefront products and live/scheduled auctions for buying prompts.
   * @param message Untrusted user message.
   * @returns Matching catalog & auction summary, or an explicit empty notice when none match.
   */
  async searchCatalog(message: string): Promise<ChatbotReply | null> {
    const query = extractShoppingQuery(message);
    if (query === null) return null;
    const result = await this.queries.searchCatalog(query);

    if (!result.products.length && !result.auctions.length) {
      return {
        reply: query
          ? `Hiện tại NEXUS không có sản phẩm hay phiên đấu giá nào phù hợp với "${query}".`
          : 'Hiện tại NEXUS chưa có sản phẩm hay phiên đấu giá nào đang mở.',
        engine: 'ORDER',
        topic: 'ORDER',
        sources: [{ id: 'CATALOG_DATABASE', title: 'Sản phẩm & Đấu giá NEXUS' }],
        actions: support,
      };
    }

    const productSection = result.products.length
      ? `Sản phẩm đang bán:\n${result.products
          .map(
            (p) =>
              `- ${p.title} — ${money(p.price)} (${p.availableQty > 0 ? `Còn ${p.availableQty}` : 'Hết hàng'})`,
          )
          .join('\n')}`
      : 'Sản phẩm đang bán: Không có sản phẩm phù hợp.';

    const auctionSection = result.auctions.length
      ? `Đấu giá:\n${result.auctions
          .map((a) => {
            const state = auctionStatusLabels[a.status] ?? a.status;
            const roomNote =
              a.auctionTitle && a.auctionTitle !== a.title ? `Phiên: ${a.auctionTitle} · ` : '';
            return `- ${a.title} (${roomNote}${state}) — ${money(a.price)}`;
          })
          .join('\n')}`
      : 'Đấu giá: Không có phiên đấu giá phù hợp.';

    const navigationActions: ChatbotReply['actions'] = [
      ...result.products.slice(0, 3).map((p) => ({
        type: 'NAVIGATE' as const,
        path: `/product/${p.id}`,
        label: `Xem SP: ${p.title.slice(0, 32)}`,
      })),
      ...result.auctions.slice(0, 3).map((a) => ({
        type: 'NAVIGATE' as const,
        path: `/auction/${a.auctionId}`,
        label: `Vào đấu giá: ${a.title.slice(0, 28)}`,
      })),
      ...(query
        ? [
            {
              type: 'NAVIGATE' as const,
              path: `/search?q=${encodeURIComponent(query)}`,
              label: 'Xem trang tìm kiếm',
            },
          ]
        : []),
    ];

    return {
      reply: `${productSection}\n\n${auctionSection}`,
      engine: 'ORDER',
      topic: 'ORDER',
      sources: [{ id: 'CATALOG_DATABASE', title: 'Sản phẩm & Đấu giá NEXUS' }],
      actions: [...navigationActions, ...support],
    };
  }

  /**
   * Resolves explicit navigation commands into immediate SPA route actions.
   * @param message Untrusted user message.
   * @param authenticated Whether the caller holds a verified session.
   * @returns Navigation reply or login prompt when auth is required, else null.
   */
  async navigate(message: string, authenticated: boolean): Promise<ChatbotReply | null> {
    const target = extractNavigationRequest(message);
    if (!target) return null;
    if (!authenticated && target.requiresAuth) {
      return {
        reply: `Vui lòng đăng nhập để truy cập trang ${target.label}.`,
        engine: 'FAQ',
        topic: 'ORDER',
        sources: [],
        actions: [{ type: 'LOGIN' }],
      };
    }

    if (target.searchQuery && target.searchKind) {
      const catalog = await this.queries.searchCatalog(target.searchQuery);
      if (target.searchKind === 'AUCTION' && catalog.auctions.length > 0) {
        const first = catalog.auctions[0];
        return {
          reply: `Đang chuyển bạn đến phiên đấu giá ${first.auctionTitle || first.title}.`,
          engine: 'ORDER',
          topic: 'ORDER',
          sources: [{ id: 'CATALOG_DATABASE', title: 'Sản phẩm & Đấu giá NEXUS' }],
          actions: [
            {
              type: 'NAVIGATE',
              path: `/auction/${first.auctionId}`,
              label: `Mở ${(first.auctionTitle || first.title).slice(0, 32)}`,
              auto: true,
            },
          ],
        };
      }
      if (target.searchKind === 'PRODUCT' && catalog.products.length > 0) {
        const first = catalog.products[0];
        return {
          reply: `Đang chuyển bạn đến sản phẩm ${first.title}.`,
          engine: 'ORDER',
          topic: 'ORDER',
          sources: [{ id: 'CATALOG_DATABASE', title: 'Sản phẩm & Đấu giá NEXUS' }],
          actions: [
            {
              type: 'NAVIGATE',
              path: `/product/${first.id}`,
              label: `Mở ${first.title.slice(0, 32)}`,
              auto: true,
            },
          ],
        };
      }
      return {
        reply: `Hiện tại NEXUS không có sản phẩm hay phiên đấu giá nào phù hợp với "${target.searchQuery}".`,
        engine: 'ORDER',
        topic: 'ORDER',
        sources: [{ id: 'CATALOG_DATABASE', title: 'Sản phẩm & Đấu giá NEXUS' }],
        actions: support,
      };
    }

    return {
      reply: `Đang chuyển bạn đến trang ${target.label}.`,
      engine: 'FAQ',
      topic: 'WELCOME',
      sources: [],
      actions: [
        {
          type: 'NAVIGATE',
          path: target.path,
          label: `Mở ${target.label}`,
          auto: true,
        },
      ],
    };
  }

  /**
   * Checks the authenticated user's reputation, wallet balance, and auction eligibility.
   * @param userId Authenticated account identifier.
   * @param message Current user question.
   * @param history Prior conversation turns.
   * @returns Real account status reply, or null for unrelated prompts.
   */
  async accountStatus(
    userId: string,
    message: string,
    history: { role: string; content: string }[] = [],
  ): Promise<ChatbotReply | null> {
    const intent = accountStatusIntent(message, history);
    if (!intent) return null;
    const auctionFilter =
      intent === 'ELIGIBILITY' ? extractAuctionEligibilityFilter(message) : undefined;
    const status = await this.queries.accountEligibility?.(userId, auctionFilter);
    if (!status) return null;

    const walletLine = status.hasWallet
      ? `Ví NEXUS Pay: Khả dụng ${money(status.availableBalance)} (đang khóa: ${money(status.lockedBalance)}).`
      : 'Ví NEXUS Pay: Chưa khởi tạo ví.';
    const reputationLine = `Điểm uy tín của bạn: ${status.reputationScore} (${status.trustLevel}).`;

    if (intent === 'WALLET') {
      return {
        reply: walletLine,
        engine: 'ORDER',
        topic: 'WALLET',
        sources: [{ id: 'ACCOUNT_DATABASE', title: 'Dữ liệu tài khoản NEXUS' }],
        actions: [
          { type: 'NAVIGATE', path: '/buyer/wallet', label: 'Mở Ví NEXUS Pay' },
          ...support,
        ],
      };
    }

    if (intent === 'REPUTATION') {
      return {
        reply: reputationLine,
        engine: 'ORDER',
        topic: 'REPUTATION',
        sources: [{ id: 'ACCOUNT_DATABASE', title: 'Dữ liệu tài khoản NEXUS' }],
        actions: [
          { type: 'NAVIGATE', path: '/buyer/reputation', label: 'Xem Điểm uy tín' },
          ...support,
        ],
      };
    }

    let eligibilityLine: string;
    let auctionButtons: ChatbotReply['actions'] = [];

    if (auctionFilter && status.auctions.length === 0) {
      eligibilityLine = `Hiện tại không có phiên đấu giá nào đang mở hoặc sắp diễn ra phù hợp với "${auctionFilter}".`;
    } else if (status.auctions.length > 0) {
      const eligibleLines = status.eligibleAuctions.slice(0, 5).map((a) => {
        const state = auctionStatusLabels[a.status] ?? a.status;
        const itemNote = a.matchedItems.length
          ? ` · Khớp: ${a.matchedItems.slice(0, 2).join(', ')}`
          : '';
        return `- ${a.title} (${state} · yêu cầu >= ${a.minBuyerReputation} điểm${itemNote})`;
      });
      const ineligibleLines = status.ineligibleAuctions.slice(0, 5).map((a) => {
        const state = auctionStatusLabels[a.status] ?? a.status;
        return `- ${a.title} (${state} · yêu cầu >= ${a.minBuyerReputation} điểm): ${a.reasons[0]}`;
      });
      const parts: string[] = [];
      if (eligibleLines.length) {
        parts.push(
          `Các phiên đấu giá bạn ĐỦ điều kiện tham gia (${status.eligibleAuctions.length}):\n${eligibleLines.join('\n')}`,
        );
      } else {
        parts.push('Bạn CHƯA đủ điều kiện tham gia phiên đấu giá nào trong danh sách phù hợp.');
      }
      if (ineligibleLines.length) {
        parts.push(
          `Các phiên bạn CHƯA đủ điều kiện (${status.ineligibleAuctions.length}):\n${ineligibleLines.join('\n')}`,
        );
      }
      eligibilityLine = parts.join('\n\n');
      auctionButtons = status.eligibleAuctions.slice(0, 5).map((a) => ({
        type: 'NAVIGATE' as const,
        path: `/auction/${a.id}`,
        label: `Vào phiên: ${a.title.slice(0, 28)}`,
      }));
    } else {
      eligibilityLine = status.auctionEligible
        ? `Điều kiện đấu giá: Đủ điều kiện tham gia đấu giá (tối thiểu ${status.minBuyerReputation} điểm uy tín, chế độ Người mua, có ví NEXUS Pay). Khi đặt giá, số dư khả dụng cần đủ mức giá muốn đặt.`
        : `Điều kiện đấu giá: Chưa đủ điều kiện.\n- ${status.auctionReasons.join('\n- ')}`;
    }

    return {
      reply: `${reputationLine}\n${walletLine}\n\n${eligibilityLine}`,
      engine: 'ORDER',
      topic: 'AUCTION',
      sources: [{ id: 'ACCOUNT_DATABASE', title: 'Dữ liệu tài khoản NEXUS' }],
      actions: [
        ...auctionButtons,
        ...(!auctionButtons.length
          ? [{ type: 'NAVIGATE' as const, path: '/auction', label: 'Mở trang Đấu giá' }]
          : []),
        { type: 'NAVIGATE', path: '/buyer/wallet', label: 'Mở Ví NEXUS Pay' },
        ...support,
      ],
    };
  }
}
