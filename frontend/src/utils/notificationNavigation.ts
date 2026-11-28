interface NotificationRouteInput {
  targetUrl?: string | null;
  auctionId?: string | null;
  type?: string | null;
  title?: string | null;
  content?: string | null;
  metadata?: { actionType?: string; orderId?: unknown } | null;
}

interface BuyerOrderReference {
  id: string;
}

function buyerOrdersUrl(status?: string, search?: string): string {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  const query = params.toString();
  return query ? `/buyer/orders?${query}` : '/buyer/orders';
}

function resolveExplicitTarget(targetUrl?: string | null): string | undefined {
  const trimmed = targetUrl?.trim();
  if (!trimmed || trimmed.startsWith('//')) return undefined;
  if (trimmed.startsWith('/')) return trimmed;

  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (parsed.origin === window.location.origin) {
      return parsed.pathname + parsed.search + parsed.hash;
    }
  } catch {
    return undefined;
  }
  return trimmed;
}

function orderReference(text: string): string | undefined {
  return text.match(/(?:order|đơn(?:\s+hàng)?)\s*#([a-f0-9]{8})/i)?.[1];
}

function isReviewNotification(type: string, text: string): boolean {
  return type.includes('REVIEW') || text.includes('đánh giá') || text.includes('review');
}

function orderStatus(text: string): string | undefined {
  if (text.includes('chờ thanh toán') || text.includes('pending payment')) {
    return 'pending_payment';
  }
  if (
    text.includes('đã thanh toán') ||
    text.includes('thanh toán thành công') ||
    text.includes('payment received') ||
    text.includes('payment successful') ||
    text.includes('order paid')
  ) {
    return 'paid';
  }
  if (text.includes('chuẩn bị') || text.includes('preparing')) return 'preparing';
  if (text.includes('đã giao') || text.includes('delivered')) return 'delivered';
  if (text.includes('đang giao') || text.includes('shipping') || text.includes('vận đơn')) {
    return 'shipping';
  }
  if (
    text.includes('hoàn thành') ||
    text.includes('completed') ||
    text.includes('đã hủy') ||
    text.includes('đã huỷ') ||
    text.includes('cancelled')
  ) {
    return text.includes('hủy') || text.includes('huỷ') || text.includes('cancelled')
      ? 'cancelled'
      : 'completed';
  }
  return undefined;
}

function resolveOrderTarget(type: string, text: string): string | undefined {
  const search = orderReference(text);
  if (isReviewNotification(type, text)) {
    return buyerOrdersUrl('completed', search);
  }
  if (
    type.includes('ORDER') ||
    text.includes('đơn hàng') ||
    text.includes('giao hàng') ||
    text.includes('order') ||
    text.includes('delivery')
  ) {
    return buyerOrdersUrl(orderStatus(text), search);
  }
  return undefined;
}

function resolveFallbackTarget(type: string, text: string): string {
  if (type.includes('AUCTION') || text.includes('đấu giá') || text.includes('auction')) {
    return '/auction';
  }
  const orderTarget = resolveOrderTarget(type, text);
  if (orderTarget) return orderTarget;
  if (
    type.includes('DISPUTE') ||
    text.includes('khiếu nại') ||
    text.includes('trả hàng') ||
    text.includes('dispute') ||
    text.includes('return')
  ) {
    return '/buyer/disputes';
  }
  if (
    type.includes('WALLET') ||
    text.includes('ví') ||
    text.includes('số dư') ||
    text.includes('nạp tiền') ||
    text.includes('rút tiền') ||
    text.includes('wallet') ||
    text.includes('balance') ||
    text.includes('deposit') ||
    text.includes('withdrawal')
  ) {
    return '/buyer/wallet';
  }
  if (
    type.includes('REPUTATION') ||
    type.includes('TRUST') ||
    text.includes('uy tín') ||
    text.includes('tín nhiệm') ||
    text.includes('reputation') ||
    text.includes('trust')
  ) {
    return '/buyer/reputation';
  }
  if (type.includes('WISHLIST') || text.includes('yêu thích') || text.includes('wishlist')) {
    return '/buyer/wishlist';
  }
  return '/buyer/notifications';
}

/**
 * Resolves the target route for an in-app notification based on explicit route metadata
 * and content-driven domain heuristics.
 */
export function resolveNotificationTargetUrl(
  item: NotificationRouteInput,
  buyerOrders?: BuyerOrderReference[],
): string {
  if (
    item.metadata?.actionType === 'SECOND_CHANCE_INVITATION' ||
    (item.type === 'AUCTION' &&
      (item.title?.startsWith('Cơ hội mua ') || item.title?.startsWith('Second-chance ')))
  ) {
    return '/buyer/profile?tab=auction-offers';
  }

  const explicitTarget = resolveExplicitTarget(item.targetUrl);
  if (explicitTarget) return explicitTarget;
  if (item.auctionId) return `/auction/${item.auctionId}`;

  const type = (item.type || '').toUpperCase();
  const text = `${item.title || ''} ${item.content || ''}`.toLowerCase();
  const orderId = item.metadata?.orderId;
  if (typeof orderId === 'string' && orderId.trim()) {
    const orderPath = `/buyer/orders/${encodeURIComponent(orderId.trim())}`;
    return isReviewNotification(type, text) ? `${orderPath}?review=1` : orderPath;
  }

  const shortOrderId = orderReference(text);
  if (shortOrderId && buyerOrders) {
    const matches = buyerOrders.filter((order) =>
      order.id.toLowerCase().startsWith(shortOrderId.toLowerCase()),
    );
    if (matches.length === 1) {
      const orderPath = `/buyer/orders/${encodeURIComponent(matches[0].id)}`;
      return isReviewNotification(type, text) ? `${orderPath}?review=1` : orderPath;
    }
  }

  return resolveFallbackTarget(type, text);
}

export function getNotificationOrderReference(item: NotificationRouteInput): string | undefined {
  if (
    item.targetUrl?.trim() ||
    item.auctionId ||
    (typeof item.metadata?.orderId === 'string' && item.metadata.orderId.trim())
  ) {
    return undefined;
  }
  return orderReference(`${item.title || ''} ${item.content || ''}`.toLowerCase());
}
