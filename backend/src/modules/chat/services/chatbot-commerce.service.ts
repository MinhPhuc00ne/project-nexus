import { BadRequestException, Injectable } from '@nestjs/common';
import { AuctionStatus } from '@prisma/client';
import {
  CommerceChatCart,
  CommerceChatOrderItem,
  CommerceChatOrders,
  CommerceChatQuery,
} from '../../../core/domain/commerce-chat.types';
import { OrdersChatFacade } from '../../orders/services/orders-chat.facade';
import { CartChatFacade } from '../../cart/services/cart-chat.facade';
import { CatalogChatFacade } from '../../catalog/services/catalog-chat.facade';
import { UsersChatFacade } from '../../users/services/users-chat.facade';
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

const money = (value: number): string => `${value.toLocaleString('en-US')} VND`;
const pageSummary = (page: number, totalPages: number): string =>
  totalPages > 1 || page > 1 ? ` Page ${page}/${totalPages}.` : '';
const auctionStatusLabels: Partial<Record<AuctionStatus, string>> = {
  ACTIVE: 'Live',
  EXTENDED: 'Extended',
  SCHEDULED: 'Scheduled',
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
  constructor(
    private readonly ordersFacade: OrdersChatFacade,
    private readonly cartFacade: CartChatFacade,
    private readonly catalogFacade: CatalogChatFacade,
    private readonly usersFacade: UsersChatFacade,
  ) {}

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
        ? `Would you like to view purchase orders or sales orders with status ${orderLabels[context.status]}? Please specify "purchases" or "sales".`
        : 'Would you like to view all purchase orders or sales orders? Please specify "purchases" or "sales".';
      return this.clarificationReply(prompt);
    }
    const intent = context.intent;
    if (!intent) return null;
    if (intent !== 'CART' && !dto.status && needsCommerceClarification(dto.message)) {
      return this.clarificationReply(
        'Would you like to check a specific order or filter the list by status? Please select an order ID or specify a clear status; no filter has been applied yet.',
      );
    }
    if (intent === 'CART' && dto.status) {
      throw new BadRequestException('Shopping cart does not support order status filters.');
    }
    const query = this.buildQuery(dto, context.status);
    if (intent === 'CART') {
      const budget = extractCartBudget(dto.message);
      const checkEligibility = budget !== null || isCartEligibilityQuery(dto.message);
      const cartQuery = checkEligibility && !dto.limit ? { ...query, limit: 20 } : query;
      const cart = await this.cartFacade.cart(userId, cartQuery);
      if (checkEligibility) {
        return this.formatCartEligibilityReply(cart, budget);
      }
      return this.formatCartReply(cart);
    }
    const orders = await this.ordersFacade.orders(userId, intent, query);
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
          `${item.name.slice(0, 100)}${Object.keys(item.selections).length ? ` (${Object.values(item.selections).join(', ').slice(0, 100)})` : ''}: ${item.quantity} × ${money(item.currentPrice)}${item.hasPriceChanged ? ` — price changed (from ${money(item.priceAtAdded)})` : ''}${item.hasInvalidSelections ? ' — invalid variant' : ''}${item.isOutOfStock ? ' — out of stock' : item.isStockInsufficient ? ' — insufficient stock' : ''}${item.isUnavailable ? ' — unavailable' : ''}`,
      );
    const reply =
      cart.total === 0
        ? 'Your shopping cart is currently empty.'
        : `Cart has ${cart.totalCount} items (${cart.total} lines), subtotal ${money(cart.totalPrice)}, excluding shipping.${pageSummary(cart.page, cart.totalPages)}\n${lines.join('\n')}${cart.items.length > 5 ? '\nShowing the first 5 lines of this page.' : ''}${cart.isExpired ? '\nYour saved cart has expired; please review before checkout.' : ''}${cart.hasPriceChanged ? '\nSome items have updated prices.' : ''}${cart.hasUnavailableItems ? '\nSome items are out of stock, low on stock, or unavailable.' : ''}${!cart.items.length ? '\nNo items on this page.' : ''}`;
    return {
      reply,
      engine: 'CART',
      topic: 'CART',
      cart,
      sources: [{ id: 'CART_DATABASE', title: 'NEXUS Cart Data' }],
      actions: [{ type: 'NAVIGATE', path: '/cart', label: 'Open cart' }, ...support],
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
        reply: 'Your shopping cart is currently empty.',
        engine: 'CART',
        topic: 'CART',
        cart,
        sources: [{ id: 'CART_DATABASE', title: 'NEXUS Cart Data' }],
        actions: [{ type: 'NAVIGATE', path: '/cart', label: 'Open cart' }, ...support],
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
            `- ${item.name.slice(0, 100)}: ${item.quantity} × ${money(item.currentPrice)} (subtotal ${money(item.itemSubtotal)})`,
        );
      const reply = availableItems.length
        ? `Your cart has ${availableItems.length} eligible items ready for purchase:\n${lines.join('\n')}${unavailableCount > 0 ? `\n(${unavailableCount} other items are out of stock, insufficient in stock, or unavailable.)` : ''}`
        : 'There are currently no eligible items in your cart ready for purchase (items are out of stock, insufficient in stock, or unavailable).';
      return {
        reply,
        engine: 'CART',
        topic: 'CART',
        cart,
        sources: [{ id: 'CART_DATABASE', title: 'NEXUS Cart Data' }],
        actions: [{ type: 'NAVIGATE', path: '/cart', label: 'Open cart' }, ...support],
      };
    }

    const affordable = availableItems.filter((item) => item.currentPrice <= budget);
    const lines = affordable.slice(0, 5).map((item) => {
      if (item.itemSubtotal <= budget) {
        return `- ${item.name.slice(0, 100)}: ${item.quantity} × ${money(item.currentPrice)} (subtotal ${money(item.itemSubtotal)})`;
      }
      const maxQty = Math.floor(budget / item.currentPrice);
      return `- ${item.name.slice(0, 100)}: ${money(item.currentPrice)}/item (up to ${maxQty} items affordable; cart has ${item.quantity} = ${money(item.itemSubtotal)})`;
    });

    const excludedCount = cart.items.length - affordable.length;
    const minPrice = availableItems.length
      ? Math.min(...availableItems.map((item) => item.currentPrice))
      : null;

    const reply = affordable.length
      ? `With a budget of ${money(budget)} (excluding shipping), ${affordable.length} items in your cart are eligible for purchase:\n${lines.join('\n')}${excludedCount > 0 ? `\n(${excludedCount} other items exceed ${money(budget)} or lack sufficient stock/availability.)` : ''}\nNote: The final total will include shipping fees.`
      : availableItems.length
        ? `With a budget of ${money(budget)}, no items in your cart are currently affordable (lowest available item in cart is ${money(minPrice ?? 0)}, excluding shipping).`
        : 'There are currently no eligible items in your cart ready for purchase.';

    return {
      reply,
      engine: 'CART',
      topic: 'CART',
      cart,
      sources: [{ id: 'CART_DATABASE', title: 'NEXUS Cart Data' }],
      actions: [{ type: 'NAVIGATE', path: '/cart', label: 'Open cart' }, ...support],
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
    const extra = items.length > 2 ? ` (+${items.length - 2} more items)` : '';
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
    const label = intent === 'SALES' ? 'sales orders' : 'purchase orders';
    const lines = orders.items.slice(0, 5).map((order) => {
      const itemSummary = this.summarizeOrderItems(order.items);
      const dateText =
        order.createdAt instanceof Date && !Number.isNaN(order.createdAt.getTime())
          ? order.createdAt.toLocaleDateString('en-US')
          : '';
      const heading = itemSummary || 'Order';
      const meta = [dateText, orderLabels[order.status]].filter(Boolean).join(' · ');
      return `- ${heading} (${meta}) — ${money(order.totalAmount)} [Order ID: ${order.id}]`;
    });
    const reply =
      orders.total === 0
        ? `You have no ${label}${status ? ` with status ${orderLabels[status]}` : ''}.`
        : `Found ${orders.total} ${label}${status ? ` with status ${orderLabels[status]}` : ''}.${pageSummary(orders.page, orders.totalPages)}\n${lines.join('\n')}${orders.items.length > 5 ? '\nShowing the first 5 orders on this page.' : ''}${!orders.items.length ? '\nNo orders on this page.' : ''}\nThis reflects the current saved status on NEXUS.`;
    return {
      reply,
      engine: 'ORDER',
      topic: 'ORDER',
      orders,
      sources: [{ id: 'ORDER_DATABASE', title: 'NEXUS Order Data' }],
      actions: [
        { type: 'SELECT_ORDER' },
        {
          type: 'NAVIGATE',
          path: intent === 'SALES' ? '/seller/orders' : '/buyer/orders',
          label: intent === 'SALES' ? 'Open sales orders' : 'Open my orders',
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
    const order = await this.ordersFacade.order(userId, orderId);
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
      ? ` GHN waybill: ${order.shipment.waybillCode}${order.shipment.status ? ` (${order.shipment.status})` : ''}.`
      : '';
    return {
      reply: `Order ${order.id}${itemsSegment}: ${orderLabels[order.status]}${amountSegment}.${waybillSegment}${order.afterSales ? ` After-sales request: ${order.afterSales.status}.` : ''} This reflects the saved status on NEXUS; the chatbot cannot alter statuses or confirm refunds.${policy ? `\n${policy.answer}` : ''}`,
      engine: 'ORDER',
      topic: 'ORDER',
      sources: [
        { id: 'ORDER_DATABASE', title: 'NEXUS Order Data' },
        ...(policy ? [{ id: policy.id, title: policy.title }] : []),
      ],
      actions: [
        { type: 'NAVIGATE', path: `/buyer/orders/${order.id}`, label: 'View order details' },
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
    const result = await this.catalogFacade.searchCatalog(query);

    if (!result.products.length && !result.auctions.length) {
      return {
        reply: query
          ? `NEXUS currently has no products or auctions matching "${query}".`
          : 'NEXUS currently has no open products or auctions.',
        engine: 'ORDER',
        topic: 'ORDER',
        sources: [{ id: 'CATALOG_DATABASE', title: 'NEXUS Products & Auctions' }],
        actions: support,
      };
    }

    const productSection = result.products.length
      ? `Active products:\n${result.products
          .map(
            (p) =>
              `- ${p.title} — ${money(p.price)} (${p.availableQty > 0 ? `${p.availableQty} left` : 'Out of stock'})`,
          )
          .join('\n')}`
      : 'Active products: No matching products found.';

    const auctionSection = result.auctions.length
      ? `Auctions:\n${result.auctions
          .map((a) => {
            const state = auctionStatusLabels[a.status] ?? a.status;
            const roomNote =
              a.auctionTitle && a.auctionTitle !== a.title ? `Room: ${a.auctionTitle} · ` : '';
            return `- ${a.title} (${roomNote}${state}) — ${money(a.price)}`;
          })
          .join('\n')}`
      : 'Auctions: No matching auctions found.';

    const navigationActions: ChatbotReply['actions'] = [
      ...result.products.slice(0, 3).map((p) => ({
        type: 'NAVIGATE' as const,
        path: `/product/${p.id}`,
        label: `View: ${p.title.slice(0, 32)}`,
      })),
      ...result.auctions.slice(0, 3).map((a) => ({
        type: 'NAVIGATE' as const,
        path: `/auction/${a.auctionId}`,
        label: `Join auction: ${a.title.slice(0, 28)}`,
      })),
      ...(query
        ? [
            {
              type: 'NAVIGATE' as const,
              path: `/search?q=${encodeURIComponent(query)}`,
              label: 'View search results',
            },
          ]
        : []),
    ];

    return {
      reply: `${productSection}\n\n${auctionSection}`,
      engine: 'ORDER',
      topic: 'ORDER',
      sources: [{ id: 'CATALOG_DATABASE', title: 'NEXUS Products & Auctions' }],
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
        reply: `Please sign in to access ${target.label}.`,
        engine: 'FAQ',
        topic: 'ORDER',
        sources: [],
        actions: [{ type: 'LOGIN' }],
      };
    }

    if (target.searchQuery && target.searchKind) {
      const catalog = await this.catalogFacade.searchCatalog(target.searchQuery);
      if (target.searchKind === 'AUCTION' && catalog.auctions.length > 0) {
        const first = catalog.auctions[0];
        return {
          reply: `Taking you to auction ${first.auctionTitle || first.title}.`,
          engine: 'ORDER',
          topic: 'ORDER',
          sources: [{ id: 'CATALOG_DATABASE', title: 'NEXUS Products & Auctions' }],
          actions: [
            {
              type: 'NAVIGATE',
              path: `/auction/${first.auctionId}`,
              label: `Open ${(first.auctionTitle || first.title).slice(0, 32)}`,
              auto: true,
            },
          ],
        };
      }
      if (target.searchKind === 'PRODUCT' && catalog.products.length > 0) {
        const first = catalog.products[0];
        return {
          reply: `Taking you to product ${first.title}.`,
          engine: 'ORDER',
          topic: 'ORDER',
          sources: [{ id: 'CATALOG_DATABASE', title: 'NEXUS Products & Auctions' }],
          actions: [
            {
              type: 'NAVIGATE',
              path: `/product/${first.id}`,
              label: `Open ${first.title.slice(0, 32)}`,
              auto: true,
            },
          ],
        };
      }
      return {
        reply: `NEXUS currently has no products or auctions matching "${target.searchQuery}".`,
        engine: 'ORDER',
        topic: 'ORDER',
        sources: [{ id: 'CATALOG_DATABASE', title: 'NEXUS Products & Auctions' }],
        actions: support,
      };
    }

    return {
      reply: `Taking you to ${target.label}.`,
      engine: 'FAQ',
      topic: 'WELCOME',
      sources: [],
      actions: [
        {
          type: 'NAVIGATE',
          path: target.path,
          label: `Open ${target.label}`,
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
    const status = await this.usersFacade.accountEligibility(userId, auctionFilter);
    if (!status) return null;

    const walletLine = status.hasWallet
      ? `NEXUS Pay Wallet: Available ${money(status.availableBalance)} (locked: ${money(status.lockedBalance)}).`
      : 'NEXUS Pay Wallet: Wallet not initialized yet.';
    const reputationLine = `Your reputation score: ${status.reputationScore} (${status.trustLevel}).`;

    if (intent === 'WALLET') {
      return {
        reply: walletLine,
        engine: 'ORDER',
        topic: 'WALLET',
        sources: [{ id: 'ACCOUNT_DATABASE', title: 'NEXUS Account Data' }],
        actions: [
          { type: 'NAVIGATE', path: '/buyer/wallet', label: 'Open NEXUS Pay Wallet' },
          ...support,
        ],
      };
    }

    if (intent === 'REPUTATION') {
      return {
        reply: reputationLine,
        engine: 'ORDER',
        topic: 'REPUTATION',
        sources: [{ id: 'ACCOUNT_DATABASE', title: 'NEXUS Account Data' }],
        actions: [
          { type: 'NAVIGATE', path: '/buyer/reputation', label: 'View Reputation Score' },
          ...support,
        ],
      };
    }

    let eligibilityLine: string;
    let auctionButtons: ChatbotReply['actions'] = [];

    if (auctionFilter && status.auctions.length === 0) {
      eligibilityLine = `There are currently no open or upcoming auctions matching "${auctionFilter}".`;
    } else if (status.auctions.length > 0) {
      const eligibleLines = status.eligibleAuctions.slice(0, 5).map((a) => {
        const state = auctionStatusLabels[a.status] ?? a.status;
        const itemNote = a.matchedItems.length
          ? ` · Matched: ${a.matchedItems.slice(0, 2).join(', ')}`
          : '';
        return `- ${a.title} (${state} · requires >= ${a.minBuyerReputation} pts${itemNote})`;
      });
      const ineligibleLines = status.ineligibleAuctions.slice(0, 5).map((a) => {
        const state = auctionStatusLabels[a.status] ?? a.status;
        return `- ${a.title} (${state} · requires >= ${a.minBuyerReputation} pts): ${a.reasons[0]}`;
      });
      const parts: string[] = [];
      if (eligibleLines.length) {
        parts.push(
          `Auctions you ARE eligible to join (${status.eligibleAuctions.length}):\n${eligibleLines.join('\n')}`,
        );
      } else {
        parts.push('You are NOT YET eligible to join any matching auctions.');
      }
      if (ineligibleLines.length) {
        parts.push(
          `Auctions you are NOT YET eligible for (${status.ineligibleAuctions.length}):\n${ineligibleLines.join('\n')}`,
        );
      }
      eligibilityLine = parts.join('\n\n');
      auctionButtons = status.eligibleAuctions.slice(0, 5).map((a) => ({
        type: 'NAVIGATE' as const,
        path: `/auction/${a.id}`,
        label: `Enter auction: ${a.title.slice(0, 28)}`,
      }));
    } else {
      eligibilityLine = status.auctionEligible
        ? `Auction eligibility: Eligible to participate (minimum ${status.minBuyerReputation} reputation points, Buyer mode, active NEXUS Pay wallet). When bidding, your available balance must cover the bid amount.`
        : `Auction eligibility: Not eligible.\n- ${status.auctionReasons.join('\n- ')}`;
    }

    return {
      reply: `${reputationLine}\n${walletLine}\n\n${eligibilityLine}`,
      engine: 'ORDER',
      topic: 'AUCTION',
      sources: [{ id: 'ACCOUNT_DATABASE', title: 'NEXUS Account Data' }],
      actions: [
        ...auctionButtons,
        ...(!auctionButtons.length
          ? [{ type: 'NAVIGATE' as const, path: '/auction', label: 'Open Auctions' }]
          : []),
        { type: 'NAVIGATE', path: '/buyer/wallet', label: 'Open NEXUS Pay Wallet' },
        ...support,
      ],
    };
  }
}
