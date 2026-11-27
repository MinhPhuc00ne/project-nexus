import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test, mock } from './helpers/vitest-node-compat.mjs';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});

const load = createRequire(import.meta.url);
const { NotificationsService } = load(
  '../src/modules/notifications/services/notifications.service.ts',
);

test('NotificationsService paginates notifications and returns unread count', async () => {
  const prisma = {
    notification: {
      count: mock.fn(async ({ where }) => (where.isRead === false ? 2 : 5)),
      findMany: mock.fn(async () => [
        {
          id: 'n1',
          title: 'Order paid',
          auctionId: null,
          targetUrl: '/buyer/orders/o1',
          metadata: null,
          content: 'Your order is confirmed',
          type: 'ORDER',
          channel: 'IN_APP',
          isRead: false,
          readAt: null,
          createdAt: new Date('2026-11-22T10:00:00Z'),
        },
      ]),
    },
  };

  const service = new NotificationsService(prisma);
  const page = await service.getUserNotifications('u1', { page: 1, limit: 10 });
  assert.equal(page.total, 5);
  assert.equal(page.unreadCount, 2);
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].targetUrl, '/buyer/orders/o1');

  const unread = await service.getUnreadCount('u1');
  assert.equal(unread.unreadCount, 2);
});
