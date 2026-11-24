import assert from 'node:assert/strict';
import { test } from 'vitest';
import { load } from './helpers/load-module.mjs';

const afterSales = await load('pages/staff/afterSales.helpers.ts');
const reviews = await load('pages/staff/reviewModeration.helpers.ts');
const auctions = await load('pages/staff/auctionSupport.helpers.ts');
const chat = await load('components/chat/chatWidget.helpers.ts');

test('staff after-sales filters only the API page and computes server pagination', () => {
  const requests = [
    { orderId: 'order-1', kind: 'CANCEL', returnWaybillCode: null, reason: 'changed mind' },
    { orderId: 'order-2', kind: 'RETURN', returnWaybillCode: 'waybill-2', reason: 'damaged' },
  ];

  assert.deepEqual(afterSales.filterStaffAfterSalesPage(requests, 'RETURN', '', 'en'), [
    requests[1],
  ]);
  assert.deepEqual(afterSales.filterStaffAfterSalesPage(requests, 'ALL', 'WAYBILL-2', 'en'), [
    requests[1],
  ]);
  assert.equal(afterSales.getAfterSalesPageCount(41, 20), 3);
  assert.equal(afterSales.getAfterSalesPageCount(0, 20), 1);
});

test('staff can confirm receipt for an approved or already received return only', () => {
  assert.equal(afterSales.canReceiveStaffReturn('RETURN', 'APPROVED'), true);
  assert.equal(afterSales.canReceiveStaffReturn('RETURN', 'RECEIVED'), true);
  assert.equal(afterSales.canReceiveStaffReturn('RETURN', 'REQUESTED'), false);
  assert.equal(afterSales.canReceiveStaffReturn('CANCEL', 'APPROVED'), false);
});

test('staff review deletion requires a reason and a valid reputation deduction', () => {
  assert.equal(reviews.validateStaffReviewDeletion('bad', 1, 10), 'reasonRequired');
  assert.equal(reviews.validateStaffReviewDeletion('clear reason', 0, 10), 'pointsInvalid');
  assert.equal(reviews.validateStaffReviewDeletion('clear reason', 11, 10), 'pointsInvalid');
  assert.equal(reviews.validateStaffReviewDeletion('clear reason', 1, 10), null);
});

test('staff auction lot can be ended only while live', () => {
  assert.equal(auctions.canEndStaffAuctionLot('ACTIVE'), true);
  assert.equal(auctions.canEndStaffAuctionLot('EXTENDED'), true);
  assert.equal(auctions.canEndStaffAuctionLot('SCHEDULED'), false);
  assert.equal(auctions.canEndStaffAuctionLot('ENDED'), false);
});

test('chat unread badge caps at 99 and duplicate message IDs do not count twice', () => {
  assert.equal(chat.unreadBadgeLabel(1), '1');
  assert.equal(chat.unreadBadgeLabel(120), '99+');
  assert.equal(chat.unreadBadgeLabel(-1), '0');

  const seen = new Set();
  assert.equal(chat.rememberChatMessageId(seen, 'message-1'), true);
  assert.equal(chat.rememberChatMessageId(seen, 'message-1'), false);
});

test('chat message de-duplication cache stays bounded', async () => {
  const seen = new Set();
  const max = 1_000;
  for (let index = 0; index <= max; index += 1) {
    chat.rememberChatMessageId(seen, `message-${index}`);
  }

  assert.equal(seen.size, max);
  assert.equal(seen.has('message-0'), false);
  assert.equal(seen.has('message-1000'), true);
});

test('chat reconnect rejoins previously subscribed conversation rooms', async () => {
  const handlers = new Map();
  const joinedRooms = [];
  let cleanup;
  const connection = {
    socket: {
      on: (name, handler) => handlers.set(name, handler),
      off: (name) => handlers.delete(name),
    },
    connect: () => {},
    disconnect: () => {},
    joinConversation: (id) => joinedRooms.push(id),
  };
  const conversations = {
    getChatConversations: async () => ({
      items: [{ id: 'conversation-1', unreadCount: 0, createdAt: '', lastMessageAt: null }],
      pagination: { totalPages: 1 },
    }),
    getChatUnreadCount: async () => 0,
  };
  const hook = await load('components/chat/useChatUnreadSync.ts', {
    '../../services/chat': conversations,
    '../../services/chatSocket': { createChatConnection: () => connection },
    react: {
      useRef: (initial) => ({ current: initial }),
      useEffect: (effect) => {
        cleanup = effect();
      },
    },
  });
  hook.useChatUnreadSync({
    userId: 'user-1',
    activeChatStateRef: { current: { isVisible: false } },
    isPanelOpenRef: { current: false },
    setUnread: () => {},
    setConversations: () => {},
    setRevision: () => {},
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(joinedRooms, ['conversation-1']);

  handlers.get('connect')?.();
  assert.deepEqual(joinedRooms, ['conversation-1', 'conversation-1']);
  cleanup?.();
});
