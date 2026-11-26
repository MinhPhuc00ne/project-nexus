import { describe, expect, it } from 'vitest';
import type { UserNotification } from '@/features/notifications/types/notification.types';
import { resolveStaffNotificationTarget } from '../staffNotificationNavigation';

const makeNotification = (overrides: Partial<UserNotification>): UserNotification => ({
  id: 'notif-1',
  title: '',
  content: '',
  type: 'SYSTEM',
  channel: 'IN_APP',
  isRead: false,
  readAt: null,
  createdAt: '2026-11-25T10:00:00Z',
  ...overrides,
});

describe('resolveStaffNotificationTarget', () => {
  it('routes admin order notifications into staff order details', () => {
    expect(
      resolveStaffNotificationTarget(makeNotification({ targetUrl: '/admin/orders/order-42' })),
    ).toBe('/staff/orders?orderId=order-42');
  });

  it('routes auction notifications with the auction ID', () => {
    expect(
      resolveStaffNotificationTarget(
        makeNotification({
          type: 'AUCTION_STARTED',
          auctionId: 'auction-5',
          metadata: {},
        }),
      ),
    ).toBe('/staff/auction-support?auctionId=auction-5');
  });

  it('resolves Vietnamese notification content to the matching staff tab', () => {
    expect(
      resolveStaffNotificationTarget(
        makeNotification({
          type: 'SYSTEM',
          title: 'Có đánh giá mới cần kiểm duyệt',
          content: '',
          metadata: {},
        }),
      ),
    ).toBe('/staff/reviews');

    expect(
      resolveStaffNotificationTarget(
        makeNotification({
          type: 'SYSTEM',
          title: 'Có khiếu nại đơn hàng mới',
          content: '',
          metadata: {},
        }),
      ),
    ).toBe('/staff/disputes');
  });

  it('never uses external or protocol-relative URLs as staff navigation targets', () => {
    expect(
      resolveStaffNotificationTarget(
        makeNotification({ targetUrl: '//example.com/admin/orders/1' }),
      ),
    ).toBeNull();
  });
});
