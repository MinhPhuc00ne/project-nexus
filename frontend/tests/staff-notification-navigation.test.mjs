import assert from 'node:assert/strict';
import { test } from 'vitest';
import { load } from './helpers/load-module.mjs';

const navigation = await load('pages/staff/staffNotificationNavigation.ts');

test('staff notification targets route admin order notifications into staff order details', () => {
  assert.equal(
    navigation.resolveStaffNotificationTarget({ targetUrl: '/admin/orders/order-42' }),
    '/staff/orders?orderId=order-42',
  );
});

test('staff notification targets route auction notifications with the auction ID', () => {
  assert.equal(
    navigation.resolveStaffNotificationTarget({
      type: 'AUCTION_STARTED',
      auctionId: 'auction-5',
      metadata: {},
    }),
    '/staff/auction-support?auctionId=auction-5',
  );
});

test('Vietnamese notification content resolves to the matching staff tab', () => {
  assert.equal(
    navigation.resolveStaffNotificationTarget({
      type: 'SYSTEM',
      title: 'Có đánh giá mới cần kiểm duyệt',
      content: '',
      metadata: {},
    }),
    '/staff/reviews',
  );
  assert.equal(
    navigation.resolveStaffNotificationTarget({
      type: 'SYSTEM',
      title: 'Có khiếu nại đơn hàng mới',
      content: '',
      metadata: {},
    }),
    '/staff/disputes',
  );
});

test('external notification URLs are never used as staff navigation targets', () => {
  assert.equal(
    navigation.resolveStaffNotificationTarget({ targetUrl: '//example.com/admin/orders/1' }),
    null,
  );
});
