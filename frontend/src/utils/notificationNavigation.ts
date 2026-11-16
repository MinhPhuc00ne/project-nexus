/**
 * Resolves the target route for an in-app notification based on explicit route metadata
 * and content-driven domain heuristics.
 *
 * @param item - Notification payload containing optional targetUrl, auctionId, type, title, and content.
 * @returns Relative application route path to navigate to.
 */
export function resolveNotificationTargetUrl(item: {
  targetUrl?: string | null;
  auctionId?: string | null;
  type?: string | null;
  title?: string | null;
  content?: string | null;
  metadata?: { actionType?: string } | null;
}): string {
  if (
    item.metadata?.actionType === 'SECOND_CHANCE_INVITATION' ||
    (item.type === 'AUCTION' && item.title?.startsWith('Cơ hội mua '))
  ) {
    return '/buyer/profile?tab=auction-offers';
  }
  if (item.targetUrl && typeof item.targetUrl === 'string' && item.targetUrl.trim().length > 0) {
    const trimmed = item.targetUrl.trim();
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
      return trimmed;
    }
    try {
      const parsed = new URL(trimmed, window.location.origin);
      if (parsed.origin === window.location.origin) {
        return parsed.pathname + parsed.search + parsed.hash;
      }
      return trimmed;
    } catch {
      void 0;
    }
  }

  if (item.auctionId) {
    return `/auction/${item.auctionId}`;
  }

  const typeUpper = (item.type || '').toUpperCase();
  const text = `${item.title || ''} ${item.content || ''}`.toLowerCase();

  if (typeUpper.includes('AUCTION') || text.includes('đấu giá')) {
    return '/auction';
  }

  if (typeUpper.includes('ORDER') || text.includes('đơn hàng') || text.includes('giao hàng')) {
    return '/buyer/orders';
  }

  if (typeUpper.includes('DISPUTE') || text.includes('khiếu nại') || text.includes('trả hàng')) {
    return '/buyer/disputes';
  }

  if (
    typeUpper.includes('WALLET') ||
    text.includes('ví') ||
    text.includes('số dư') ||
    text.includes('nạp tiền') ||
    text.includes('rút tiền')
  ) {
    return '/buyer/wallet';
  }

  if (
    typeUpper.includes('REPUTATION') ||
    typeUpper.includes('TRUST') ||
    text.includes('uy tín') ||
    text.includes('tín nhiệm')
  ) {
    return '/buyer/reputation';
  }

  if (typeUpper.includes('WISHLIST') || text.includes('yêu thích')) {
    return '/buyer/wishlist';
  }

  if (typeUpper.includes('REVIEW') || text.includes('đánh giá')) {
    return '/buyer/orders';
  }

  return '/buyer/notifications';
}
