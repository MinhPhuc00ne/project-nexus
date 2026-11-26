import { describe, expect, it } from 'vitest';
import { resolveNotificationTargetUrl } from '../notificationNavigation';

describe('resolveNotificationTargetUrl', () => {
  it('routes second-chance auction invitations to buyer auction offers tab', () => {
    expect(
      resolveNotificationTargetUrl({
        metadata: { actionType: 'SECOND_CHANCE_INVITATION' },
      }),
    ).toBe('/buyer/profile?tab=auction-offers');

    expect(
      resolveNotificationTargetUrl({
        type: 'AUCTION',
        title: 'Cơ hội mua đồng hồ Omega',
      }),
    ).toBe('/buyer/profile?tab=auction-offers');
  });

  it('uses safe relative targetUrl or same-origin URL and ignores protocol-relative URLs', () => {
    expect(resolveNotificationTargetUrl({ targetUrl: '/buyer/orders/ord-1' })).toBe(
      '/buyer/orders/ord-1',
    );
    expect(
      resolveNotificationTargetUrl({
        targetUrl: `${window.location.origin}/auction/auc-9?lot=2#bids`,
      }),
    ).toBe('/auction/auc-9?lot=2#bids');
    expect(
      resolveNotificationTargetUrl({
        targetUrl: '//evil.example/phish',
        auctionId: 'auc-1',
      }),
    ).toBe('/auction/auc-1');
  });

  it('routes by auctionId or domain type/content heuristics', () => {
    expect(resolveNotificationTargetUrl({ auctionId: 'auc-42' })).toBe('/auction/auc-42');
    expect(resolveNotificationTargetUrl({ type: 'AUCTION_START' })).toBe('/auction');
    expect(resolveNotificationTargetUrl({ type: 'ORDER_PAID' })).toBe('/buyer/orders');
    expect(resolveNotificationTargetUrl({ content: 'Yêu cầu trả hàng mới' })).toBe(
      '/buyer/disputes',
    );
    expect(resolveNotificationTargetUrl({ type: 'WALLET_TOPUP' })).toBe('/buyer/wallet');
    expect(
      resolveNotificationTargetUrl({ type: 'PAYMENT', content: 'Your withdrawal is approved' }),
    ).toBe('/buyer/wallet');
    expect(resolveNotificationTargetUrl({ type: 'REPUTATION_UPDATE' })).toBe('/buyer/reputation');
    expect(resolveNotificationTargetUrl({ type: 'WISHLIST_DROP' })).toBe('/buyer/wishlist');
    expect(resolveNotificationTargetUrl({ type: 'REVIEW_REMINDER' })).toBe(
      '/buyer/orders?status=completed',
    );
    expect(resolveNotificationTargetUrl({ type: 'SYSTEM', title: 'Hello' })).toBe(
      '/buyer/notifications',
    );
  });

  it('routes order notifications to the referenced order or matching status tab', () => {
    expect(
      resolveNotificationTargetUrl({
        type: 'ORDER',
        metadata: { orderId: 'order/42' },
      }),
    ).toBe('/buyer/orders/order%2F42');
    expect(
      resolveNotificationTargetUrl({
        type: 'REVIEW_REMINDER',
        metadata: { orderId: 'order-42' },
      }),
    ).toBe('/buyer/orders/order-42?review=1');
    expect(
      resolveNotificationTargetUrl({
        type: 'ORDER',
        title: 'Thanh toán PayOS thành công',
        content: 'Đơn hàng #A1B2C3D4 đã được thanh toán thành công.',
      }),
    ).toBe('/buyer/orders?status=paid&search=a1b2c3d4');
    expect(
      resolveNotificationTargetUrl({
        type: 'SYSTEM',
        title: 'Nhắc đánh giá đơn hàng #A1B2C3D4',
      }),
    ).toBe('/buyer/orders?status=completed&search=a1b2c3d4');
    expect(
      resolveNotificationTargetUrl({ type: 'ORDER', content: 'Đơn hàng đang giao hàng' }),
    ).toBe('/buyer/orders?status=shipping');
    expect(resolveNotificationTargetUrl({ type: 'REVIEW_REMINDER' })).toBe(
      '/buyer/orders?status=completed',
    );
  });

  it('resolves an abbreviated order reference only when it uniquely matches a Buyer order', () => {
    const notification = {
      type: 'ORDER',
      title: 'Đơn hàng #a1b2c3d4 thanh toán thành công',
    };
    const orders = [{ id: 'a1b2c3d4-1234-5678' }];

    expect(resolveNotificationTargetUrl(notification, orders)).toBe(
      '/buyer/orders/a1b2c3d4-1234-5678',
    );
    expect(resolveNotificationTargetUrl({ ...notification, type: 'REVIEW_REMINDER' }, orders)).toBe(
      '/buyer/orders/a1b2c3d4-1234-5678?review=1',
    );
    expect(resolveNotificationTargetUrl(notification, [])).toBe(
      '/buyer/orders?status=paid&search=a1b2c3d4',
    );
    expect(
      resolveNotificationTargetUrl(notification, [...orders, { id: 'a1b2c3d4-9999-9999' }]),
    ).toBe('/buyer/orders?status=paid&search=a1b2c3d4');
  });

  it('keeps original destination for non-invitation auction notifications', () => {
    for (const actionType of [
      'AUCTION_OUTBID',
      'SECOND_CHANCE_SENT',
      'SECOND_CHANCE_WITHDRAWN_SELLER',
    ]) {
      expect(
        resolveNotificationTargetUrl({
          targetUrl: '/auction/auction',
          metadata: { actionType },
        }),
      ).toBe('/auction/auction');
    }
  });
});
