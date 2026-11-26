import type { UserNotification } from '@/features/notifications/types/notification.types';

export function resolveStaffNotificationTarget(notification: UserNotification): string | null {
  const metadata = notification.metadata ?? {};
  const readId = (...keys: string[]): string | null => {
    for (const key of keys) {
      const value = metadata[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return null;
  };
  const auctionId = notification.auctionId ?? readId('auctionId', 'auction_id');
  const orderId = readId('orderId', 'order_id', 'orderCode');
  const reviewId = readId('reviewId', 'review_id');
  const disputeId = readId('disputeId', 'complaintId', 'dispute_id');
  const resourceId = readId('resourceId', 'entityId', 'contextId');
  const action = [
    notification.type,
    notification.title,
    notification.content,
    metadata.actionType,
    metadata.entityType,
    metadata.resourceType,
  ]
    .filter((value) => typeof value === 'string')
    .join(' ')
    .toLocaleLowerCase();
  const resourceType = [metadata.entityType, metadata.resourceType]
    .filter((value) => typeof value === 'string')
    .join(' ')
    .toLocaleLowerCase();

  let target: URL | null = null;
  if (notification.targetUrl?.startsWith('/') && !notification.targetUrl.startsWith('//')) {
    target = new URL(notification.targetUrl, window.location.origin);
  }

  const path = target?.pathname ?? '';
  const matches = (route: string) => path === route || path.startsWith(`${route}/`);
  const adminOrderMatch = path.match(/^\/admin\/(?:orders|refunds)\/([^/]+)\/?$/);
  if (adminOrderMatch) return `/staff/orders?orderId=${encodeURIComponent(adminOrderMatch[1])}`;
  const adminAuctionMatch = path.match(/^\/admin\/auctions\/([^/]+)(?:\/lots)?\/?$/);
  if (adminAuctionMatch) {
    const params = new URLSearchParams(target?.search ?? '');
    params.set('auctionId', decodeURIComponent(adminAuctionMatch[1]));
    return `/staff/auction-support?${params.toString()}${target?.hash ?? ''}`;
  }
  if (path === '/admin' || path.startsWith('/admin/')) {
    let staffPath: string | null = null;
    if (matches('/admin/reports')) staffPath = '/staff/disputes';
    else if (matches('/admin/reviews')) staffPath = '/staff/reviews';
    else if (matches('/admin/refunds') || matches('/admin/orders')) staffPath = '/staff/orders';
    else if (matches('/admin/banners')) staffPath = '/staff/banners';
    else if (matches('/admin/auctions')) staffPath = '/staff/auction-support';
    return staffPath ? `${staffPath}${target?.search ?? ''}${target?.hash ?? ''}` : null;
  }
  const auctionMatch = path.match(/^\/(?:auction|auctions|seller\/auctions)\/([^/]+)\/?$/);
  if (auctionMatch) {
    const params = new URLSearchParams(target?.search ?? '');
    params.set('auctionId', decodeURIComponent(auctionMatch[1]));
    return `/staff/auction-support?${params.toString()}${target?.hash ?? ''}`;
  }
  const orderRouteMatch = path.match(
    /^\/(?:commerce\/orders|seller\/orders|buyer\/orders)\/([^/]+)\/?$/,
  );
  if (orderRouteMatch) return `/staff/orders?orderId=${encodeURIComponent(orderRouteMatch[1])}`;
  if (path === '/seller/auctions' || path === '/auctions') return '/staff/auction-support';
  if (target) return `${path}${target.search}${target.hash}`;

  if (
    auctionId ||
    (resourceId && /auction|consignment|đấu giá|ký gửi/.test(resourceType || action))
  ) {
    const id = auctionId ?? resourceId;
    return id
      ? `/staff/auction-support?auctionId=${encodeURIComponent(id)}`
      : '/staff/auction-support';
  }
  if (
    orderId ||
    (resourceId &&
      /order|refund|after.?sales|đơn hàng|hoàn tiền|trả hàng|hủy đơn/.test(resourceType || action))
  ) {
    const id = orderId ?? resourceId;
    return id ? `/staff/orders?orderId=${encodeURIComponent(id)}` : '/staff/orders';
  }
  if (reviewId || (resourceId && /review|rating|đánh giá/.test(resourceType || action)))
    return '/staff/reviews';
  if (
    disputeId ||
    (resourceId && /dispute|complaint|khiếu nại|tranh chấp/.test(resourceType || action))
  )
    return '/staff/disputes';
  if (/auction|consignment|đấu giá|ký gửi/.test(action)) return '/staff/auction-support';
  if (/dispute|complaint|khiếu nại|tranh chấp/.test(action)) return '/staff/disputes';
  if (/order|refund|after.?sales|đơn hàng|hoàn tiền|trả hàng|hủy đơn/.test(action))
    return '/staff/orders';
  if (/review|rating|đánh giá/.test(action)) return '/staff/reviews';
  if (/banner/.test(action)) return '/staff/banners';
  return null;
}
