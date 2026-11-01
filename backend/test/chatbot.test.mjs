import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test, mock } from 'node:test';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
const load = createRequire(import.meta.url);
const { ChatbotService } = load('../src/modules/chat/services/chatbot.service.ts');
const { ChatbotAiService } = load('../src/modules/chat/services/chatbot-ai.service.ts');
const { ChatbotRateLimitService } = load(
  '../src/modules/chat/services/chatbot-rate-limit.service.ts',
);
const { ChatAutoReplyService } = load('../src/modules/chat/services/chat-auto-reply.service.ts');
const { ChatService } = load('../src/modules/chat/services/chat.service.ts');
const { matchChatbotTopic } = load('../src/modules/chat/services/chatbot-knowledge.ts');

function fixture(order = null) {
  const prisma = { order: { findFirst: mock.fn(async () => order) } };
  const ai = { isConfigured: () => false, classify: mock.fn(async () => null) };
  const limit = { check: mock.fn(async () => {}) };
  return { prisma, ai, limit, bot: new ChatbotService(prisma, ai, limit) };
}

test('FAQ understands Vietnamese accents, cancellation precedence and whole words', async () => {
  assert.equal(matchChatbotTopic('Hủy đơn hàng đã xác nhận'), 'CANCELLATION');
  assert.equal(matchChatbotTopic('hoan tien cho toi'), 'REFUND');
  assert.equal(matchChatbotTopic('shipping unrelated english fragment'), null);
  const f = fixture();
  const reply = await f.bot.reply('buyer', { message: 'HỦY ĐƠN đã xác nhận được không?' });
  assert.match(reply.reply, /Admin duyệt/);
  assert.equal(reply.engine, 'FAQ');
  assert.equal(f.ai.classify.mock.callCount(), 0);
  assert.equal(f.prisma.order.findFirst.mock.callCount(), 0);
  assert.equal((await f.bot.reply('buyer', { message: 'Xin chào' })).topic, 'WELCOME');
});

test('unknown requests offer staff handoff, security questions bypass AI and AI chooses only canonical facts', async () => {
  const f = fixture();
  const unknown = await f.bot.reply('buyer', { message: 'Tell me about quantum physics' });
  assert.equal(unknown.topic, 'UNKNOWN');
  assert.equal(unknown.actions[0].endpoint, '/api/v1/chat/request-support');
  f.ai.classify.mock.mockImplementation(async () => 'REFUND');
  const ai = await f.bot.reply('buyer', {
    message: 'Where is my money after returning this item?',
  });
  assert.equal(ai.engine, 'GEMINI');
  assert.match(ai.reply, /mặc định hoàn về nguồn/);
  const count = f.ai.classify.mock.callCount();
  assert.equal(
    (await f.bot.reply('buyer', { message: 'OTP của tôi là 123456' })).topic,
    'SECURITY',
  );
  assert.equal(f.ai.classify.mock.callCount(), count);
});

test('order lookup restricts both buyer and seller and excludes private data from response and AI', async () => {
  const f = fixture({
    id: 'order-1',
    status: 'PREPARING',
    shipment: null,
    afterSales: { status: 'REQUESTED' },
  });
  const reply = await f.bot.reply('buyer', { message: 'my order', orderId: 'order-1' });
  assert.deepEqual(f.prisma.order.findFirst.mock.calls[0].arguments[0].where, {
    id: 'order-1',
    OR: [{ buyerId: 'buyer' }, { sellerId: 'buyer' }],
  });
  assert.equal(reply.engine, 'ORDER');
  assert.equal(reply.order.afterSalesStatus, 'REQUESTED');
  assert.equal(reply.order.waybillCode, null);
  assert.equal(f.ai.classify.mock.callCount(), 0);
  const select = f.prisma.order.findFirst.mock.calls[0].arguments[0].select;
  assert.equal(select.shippingAddressSnapshot, undefined);
  assert.equal(select.payments, undefined);
  const outsider = fixture();
  await assert.rejects(
    outsider.bot.reply('stranger', { message: 'order', orderId: 'order-1' }),
    (e) => e.getStatus() === 404,
  );
  assert.equal(outsider.ai.classify.mock.callCount(), 0);
});

test('rate limit is Redis-backed, independent by user and fails closed before DB/AI calls', async () => {
  const counts = new Map();
  const limiter = new ChatbotRateLimitService({
    getClient: () => ({
      eval: async (script, keys, key) => {
        assert.match(script, /EXPIRE/);
        const count = (counts.get(key) ?? 0) + 1;
        counts.set(key, count);
        return count;
      },
    }),
  });
  for (let i = 0; i < 20; i++) await limiter.check('buyer');
  await assert.rejects(limiter.check('buyer'), (e) => e.getStatus() === 429);
  await limiter.check('other');
  const broken = new ChatbotRateLimitService({
    getClient: () => {
      throw Error('offline');
    },
  });
  await assert.rejects(broken.check('buyer'), (e) => e.getStatus() === 503);
  const f = fixture();
  f.limit.check.mock.mockImplementation(async () => {
    throw Error('rate limited');
  });
  await assert.rejects(f.bot.reply('buyer', { message: 'question', orderId: 'id' }));
  assert.equal(f.prisma.order.findFirst.mock.callCount(), 0);
  assert.equal(f.ai.classify.mock.callCount(), 0);
});

test('Gemini classifier is opt-in, puts key only in header and validates structured output', async () => {
  const config = {
    CHATBOT_AI_ENABLED: 'true',
    GEMINI_API_KEY: 'test-key',
    CHATBOT_GEMINI_MODEL: 'gemini-test',
  };
  const ai = new ChatbotAiService({ get: (key) => config[key] });
  const response = (topic, finishReason = 'STOP') =>
    new Response(
      JSON.stringify({
        candidates: [{ finishReason, content: { parts: [{ text: JSON.stringify({ topic }) }] } }],
      }),
    );
  const fetchMock = mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.includes('test-key'), false);
    assert.equal(options.headers['x-goog-api-key'], 'test-key');
    assert.equal(
      JSON.stringify(JSON.parse(options.body).contents).includes('private-order'),
      false,
    );
    return response('RETURN');
  });
  try {
    assert.equal(await ai.classify('I received a broken item'), 'RETURN');
    for (const result of [
      response('INVENTED'),
      response('RETURN', 'SAFETY'),
      new Response('{}'),
      new Response('bad json'),
      new Response('', { status: 429 }),
    ]) {
      fetchMock.mock.mockImplementation(async () => result);
      assert.equal(await ai.classify('test'), null);
    }
    fetchMock.mock.mockImplementation(async () => {
      throw Error('timeout');
    });
    assert.equal(await ai.classify('test'), null);
    config.CHATBOT_AI_ENABLED = 'false';
    const calls = fetchMock.mock.callCount();
    assert.equal(await ai.classify('test'), null);
    assert.equal(fetchMock.mock.callCount(), calls);
    config.CHATBOT_AI_ENABLED = 'true';
    config.CHATBOT_GEMINI_MODEL = '../../bad?key=leak';
    assert.equal(ai.isConfigured(), false);
  } finally {
    fetchMock.mock.restore();
  }
});

test('shop keyword replies are scoped, accent-insensitive, specific and do not fire on fragments', async () => {
  const replies = [
    { id: 'b', keyword: 'bảo hành', content: 'Warranty' },
    { id: 'a', keyword: 'bảo hành điện thoại', content: 'Phone warranty' },
    { id: 'c', keyword: 'ship', content: 'Shipping' },
  ];
  let query;
  const service = new ChatAutoReplyService({
    chatAutoReply: {
      findMany: async (args) => {
        query = args;
        return [...replies];
      },
      findFirst: async () => null,
    },
  });
  assert.equal(
    await service.findMatchingReply('shop1', 'SHOP', 'BAO HANH DIEN THOAI thế nào'),
    'Phone warranty',
  );
  assert.equal(query.where.shopId, 'shop1');
  assert.equal(query.where.isActive, true);
  assert.equal(query.where.status, 'ACTIVE');
  assert.equal(await service.findMatchingReply('shop1', 'SHOP', 'shipping'), null);
  assert.equal(await service.findMatchingReply(null, 'SHOP', 'ship'), null);
});

test('welcome is only a first-message fallback and offline precedes default when explicitly detected', async () => {
  const service = new ChatAutoReplyService({
    chatAutoReply: {
      findMany: async () => [],
      findFirst: async ({ where }) => ({ content: where.triggerType }),
    },
  });
  assert.equal(await service.findMatchingReply('s', 'SHOP', 'hello'), 'DEFAULT');
  assert.equal(
    await service.findMatchingReply('s', 'SHOP', 'hello', { firstMessage: true }),
    'WELCOME',
  );
  assert.equal(
    await service.findMatchingReply('s', 'SHOP', 'hello', { offline: true, firstMessage: true }),
    'OFFLINE',
  );
});

test('auto reply persists message and preview/unread together and is explicitly labelled', async () => {
  const changes = [];
  const tx = {
    chatMessage: { create: async ({ data }) => ({ id: 'm', ...data, createdAt: new Date() }) },
    chatConversation: {
      update: async (args) => {
        changes.push(args);
      },
    },
  };
  const service = new ChatService({ $transaction: async (run) => run(tx) }, {}, {}, {});
  const message = await service.saveAutoReply(
    { id: 'conversation', participant1Id: 'buyer' },
    'seller',
    'Hello',
  );
  assert.match(message.body, /^\[Trả lời tự động\]/);
  assert.deepEqual(changes[0].data.unreadCountUser1, { increment: 1 });
  assert.equal(changes[0].data.lastMessage, message.body);
});

test('invalid keyword templates are rejected before writes, including partial updates', async () => {
  let writes = 0;
  const service = new ChatAutoReplyService({
    chatAutoReply: {
      count: async () => 0,
      create: async () => {
        writes++;
      },
      findFirst: async () => ({
        id: 'reply',
        triggerType: 'KEYWORD',
        keyword: 'ship',
        content: 'Shipping',
        status: 'ACTIVE',
      }),
      update: async () => {
        writes++;
      },
    },
  });
  await assert.rejects(
    service.createSellerAutoReply('shop', { triggerType: 'KEYWORD', content: 'Hello' }),
    (e) => e.getStatus() === 400,
  );
  await assert.rejects(
    service.createSystemAutoReply('admin', { content: '   ' }),
    (e) => e.getStatus() === 400,
  );
  await assert.rejects(
    service.updateSellerAutoReply('shop', 'reply', { keyword: '' }),
    (e) => e.getStatus() === 400,
  );
  assert.equal(writes, 0);
});

test('seller acting as customer receives shop replies; shop replies to buyer never trigger customer automation', async () => {
  const calls = [];
  let partnerRole = 'SELLER';
  const prisma = {
    user: { findUnique: async () => ({ role: partnerRole, isShopSuspended: false }) },
    chatMessage: { count: async () => 1 },
  };
  const service = new ChatService(
    prisma,
    {},
    {
      findMatchingReply: async (...args) => {
        calls.push(args);
        return null;
      },
    },
    {},
  );
  const conv = {
    id: 'c',
    type: 'BUYER_SELLER',
    participant1Id: 'customer',
    participant2Id: 'shop',
    status: 'IN_PROGRESS',
  };
  await service.triggerAutoReply(conv, 'customer', 'SELLER', 'ship');
  assert.equal(calls[0][0], 'shop');
  assert.deepEqual(calls[0][3], { firstMessage: true });
  partnerRole = 'BUYER';
  await service.triggerAutoReply(conv, 'shop', 'SELLER', 'Thanks');
  assert.equal(calls.length, 1);
  await service.triggerAutoReply({ ...conv, status: 'CLOSED' }, 'customer', 'BUYER', 'ship');
  assert.equal(calls.length, 1);
});
