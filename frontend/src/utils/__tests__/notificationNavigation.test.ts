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
    expect(resolveNotificationTargetUrl({ type: 'REPUTATION_UPDATE' })).toBe('/buyer/reputation');
    expect(resolveNotificationTargetUrl({ type: 'WISHLIST_DROP' })).toBe('/buyer/wishlist');
    expect(resolveNotificationTargetUrl({ type: 'REVIEW_REMINDER' })).toBe('/buyer/orders');
    expect(resolveNotificationTargetUrl({ type: 'SYSTEM', title: 'Hello' })).toBe(
      '/buyer/notifications',
    );
  });
});
