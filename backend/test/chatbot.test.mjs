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
const { ChatbotCommerceService } = load('../src/modules/chat/services/chatbot-commerce.service.ts');
const { CommerceChatQueryService } = load(
  '../src/modules/commerce/services/commerce-chat-query.service.ts',
);
const { ChatbotAiService } = load('../src/modules/chat/services/chatbot-ai.service.ts');
const { ChatbotRateLimitService } = load(
  '../src/modules/chat/services/chatbot-rate-limit.service.ts',
);
const { ChatAutoReplyService } = load('../src/modules/chat/services/chat-auto-reply.service.ts');
const { ChatService } = load('../src/modules/chat/services/chat.service.ts');
const { matchChatbotTopic } = load('../src/modules/chat/services/chatbot-knowledge.ts');

function fixture(order = null) {
  const prisma = { order: { findFirst: mock.fn(async () => order) } };
  const ai = { isConfigured: () => false, answer: mock.fn(async () => null) };
  const limit = { check: mock.fn(async () => {}) };
  const commerce = new ChatbotCommerceService(new CommerceChatQueryService(prisma));
  return { prisma, ai, limit, bot: new ChatbotService(commerce, ai, limit) };
}

test('guest fallback never reads orders and offers login for protected actions', async () => {
  const f = fixture();
  for (const message of ['hi', 'hủy đơn', 'đơn hàng', 'unknown topic']) {
    const result = await f.bot.replyGuest('peer-hash', { message, orderId: 'injected' });
    assert.equal(result.engine, 'FAQ');
    assert.equal(result.order, undefined);
    assert.ok(result.actions.every((action) => action.type === 'LOGIN'));
  }
  assert.equal(f.ai.answer.mock.callCount(), 4);
  assert.equal(f.ai.answer.mock.calls[0].arguments[2], false);
  assert.equal(f.prisma.order.findFirst.mock.callCount(), 0);
  assert.equal(f.limit.check.mock.calls[0].arguments[0], 'guest:peer-hash');
});

test('auto replies detect shop/support offline, preserve first-message context and tolerate unknown presence', async () => {
  let online = false;
  const calls = [];
  const service = new ChatService(
    {
      user: { findUnique: async () => ({ role: 'SELLER', isShopSuspended: false }) },
      chatMessage: { count: async () => 1 },
    },
    {},
    {
      findMatchingReply: async (...args) => {
        calls.push(args);
        return null;
      },
    },
    {},
  );
  service.setBroadcaster({ isUserOnline: async () => online, isSupportOnline: async () => online });
  const conv = { id: 'c', type: 'BUYER_SELLER', participant1Id: 'buyer', participant2Id: 'shop' };
  await service.triggerAutoReply(conv, 'buyer', 'BUYER', 'hi');
  assert.deepEqual(calls.at(-1)[3], { firstMessage: true, offline: true });
  online = true;
  await service.triggerAutoReply(conv, 'buyer', 'BUYER', 'hi');
  assert.equal(calls.at(-1)[3].offline, false);
  online = null;
  await service.triggerAutoReply(conv, 'buyer', 'BUYER', 'hi');
  assert.equal(calls.at(-1)[3].offline, false);
  online = false;
  await service.triggerAutoReply({ ...conv, type: 'STAFF_BUYER' }, 'buyer', 'BUYER', 'hi');
  assert.equal(calls.at(-1)[1], 'SYSTEM');
  assert.equal(calls.at(-1)[3].offline, true);
  service.setBroadcaster({
    isUserOnline: async (id) => id !== 'assigned',
    isSupportOnline: async () => true,
  });
  await service.triggerAutoReply(
    { ...conv, type: 'STAFF_BUYER', assignedStaffId: 'assigned' },
    'buyer',
    'BUYER',
    'hi',
  );
  assert.equal(calls.at(-1)[3].offline, true);
});

test('FAQ understands Vietnamese accents, cancellation precedence and whole words', async () => {
  assert.equal(matchChatbotTopic('Hủy đơn hàng đã xác nhận'), 'CANCELLATION');
  assert.equal(matchChatbotTopic('hoan tien cho toi'), 'REFUND');
  assert.equal(matchChatbotTopic('shipping unrelated english fragment'), null);
  const f = fixture();
  const reply = await f.bot.reply('buyer', { message: 'HỦY ĐƠN đã xác nhận được không?' });
  assert.match(reply.reply, /Admin duyệt/);
  assert.equal(reply.engine, 'FAQ');
  const paymentReply = await f.bot.reply('buyer', { message: 'Các phương thức thanh toán là gì?' });
  assert.equal(paymentReply.topic, 'PAYMENT');
  assert.match(paymentReply.reply, /COD/);
  assert.equal(f.ai.answer.mock.callCount(), 2);
  assert.equal(f.prisma.order.findFirst.mock.callCount(), 0);
  assert.equal((await f.bot.reply('buyer', { message: 'Xin chào' })).topic, 'WELCOME');
});

test('unknown requests offer staff handoff, AI authors answers and security questions bypass AI', async () => {
  const f = fixture();
  const unknown = await f.bot.reply('buyer', { message: 'Tell me about quantum physics' });
  assert.equal(unknown.topic, 'UNKNOWN');
  assert.equal(unknown.actions[0].endpoint, '/api/v1/chat/request-support');
  f.ai.answer.mock.mockImplementation(async () => ({
    topic: 'REFUND',
    reply: 'Mình sẽ giải thích: tiền mặc định hoàn về nguồn thanh toán ban đầu.',
  }));
  const ai = await f.bot.reply('buyer', {
    message: 'Where is my money after returning this item?',
  });
  assert.equal(ai.engine, 'GEMINI');
  assert.match(ai.reply, /mặc định hoàn về nguồn/);
  const count = f.ai.answer.mock.callCount();
  assert.equal(
    (await f.bot.reply('buyer', { message: 'OTP của tôi là 123456' })).topic,
    'SECURITY',
  );
  assert.equal(f.ai.answer.mock.callCount(), count);
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
  assert.equal(f.ai.answer.mock.callCount(), 0);
  const select = f.prisma.order.findFirst.mock.calls[0].arguments[0].select;
  assert.equal(select.shippingAddressSnapshot, undefined);
  assert.equal(select.payments, undefined);
  const outsider = fixture();
  await assert.rejects(
    outsider.bot.reply('stranger', { message: 'order', orderId: 'order-1' }),
    (e) => e.getStatus() === 404,
  );
  assert.equal(outsider.ai.answer.mock.callCount(), 0);
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
  assert.equal(f.ai.answer.mock.callCount(), 0);
});

test('Gemini conversation is opt-in, separates system prompt and history and validates output', async () => {
  const config = {
    CHATBOT_AI_ENABLED: 'true',
    GEMINI_API_KEY: 'test-key',
    CHATBOT_GEMINI_MODEL: 'gemini-test',
  };
  const ai = new ChatbotAiService({ get: (key) => config[key] });
  const response = (
    topic,
    finishReason = 'STOP',
    reply = 'Bạn hãy chuẩn bị bằng chứng về sản phẩm bị lỗi nhé.',
  ) =>
    new Response(
      JSON.stringify({
        candidates: [
          { finishReason, content: { parts: [{ text: JSON.stringify({ topic, reply }) }] } },
        ],
      }),
    );
  const fetchMock = mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.includes('test-key'), false);
    assert.equal(options.headers['x-goog-api-key'], 'test-key');
    const payload = JSON.parse(options.body);
    assert.match(payload.systemInstruction.parts[0].text, /trợ lý AI hội thoại/);
    assert.match(payload.systemInstruction.parts[0].text, /Kiến thức NEXUS/);
    assert.match(payload.systemInstruction.parts[0].text, /Không tự bịa thông tin/);
    assert.equal(payload.contents[1].role, 'model');
    assert.equal(payload.contents[0].parts[0].text, 'Tôi muốn trả hàng');
    assert.equal(payload.contents.at(-1).parts[0].text, 'Tôi cần chuẩn bị gì?');
    assert.equal(
      JSON.stringify(JSON.parse(options.body).contents).includes('private-order'),
      false,
    );
    return response('RETURN');
  });
  try {
    const history = [
      { role: 'user', content: 'Tôi muốn trả hàng' },
      { role: 'assistant', content: 'Bạn nhận hàng khi nào?' },
    ];
    assert.deepEqual(await ai.answer('Tôi cần chuẩn bị gì?', history), {
      topic: 'RETURN',
      reply: 'Bạn hãy chuẩn bị bằng chứng về sản phẩm bị lỗi nhé.',
    });
    for (const result of [
      response('INVENTED'),
      response('RETURN', 'SAFETY'),
      response('RETURN', 'STOP', ''),
      response('RETURN', 'STOP', 'x'.repeat(2001)),
      response('RETURN', 'STOP', 123),
      new Response('{}'),
      new Response('bad json'),
      new Response('', { status: 429 }),
    ]) {
      fetchMock.mock.mockImplementation(async () => result);
      assert.equal(await ai.answer('test'), null);
    }
    fetchMock.mock.mockImplementation(async () => {
      throw Error('timeout');
    });
    assert.equal(await ai.answer('test'), null);
    config.CHATBOT_AI_ENABLED = 'false';
    const calls = fetchMock.mock.callCount();
    assert.equal(await ai.answer('test'), null);
    assert.equal(fetchMock.mock.callCount(), calls);
    config.CHATBOT_AI_ENABLED = 'true';
    config.CHATBOT_GEMINI_MODEL = '../../bad?key=leak';
    assert.equal(ai.isConfigured(), false);
  } finally {
    fetchMock.mock.restore();
  }
});

test('AI handles keyword matches, greetings and follow-up questions for authenticated and guest users', async () => {
  const f = fixture();
  f.ai.answer.mock.mockImplementation(async () => ({
    topic: 'CANCELLATION',
    reply: 'Bạn cho mình biết shop đã xác nhận đơn chưa nhé?',
  }));
  const history = [
    { role: 'user', content: 'Tôi muốn hủy đơn' },
    { role: 'assistant', content: 'Shop đã xác nhận chưa?' },
  ];
  for (const message of ['hủy đơn', 'Xin chào', 'Rồi, giờ làm sao?']) {
    const reply = await f.bot.reply('buyer', { message, history });
    assert.equal(reply.engine, 'GEMINI');
    assert.equal(reply.reply, 'Bạn cho mình biết shop đã xác nhận đơn chưa nhé?');
    assert.deepEqual(f.ai.answer.mock.calls.at(-1).arguments, [message, history, true]);
    assert.deepEqual(reply.sources, [{ id: 'CANCELLATION', title: 'Hủy đơn hàng' }]);
  }
  const guest = await f.bot.replyGuest('guest', { message: 'Rồi, giờ làm sao?', history });
  assert.equal(guest.engine, 'GEMINI');
  assert.equal(f.ai.answer.mock.calls.at(-1).arguments[2], false);
  assert.deepEqual(guest.actions, [{ type: 'LOGIN' }]);
  assert.equal(f.prisma.order.findFirst.mock.callCount(), 0);
});

test('credential-bearing history is redacted before follow-up reaches AI', async () => {
  const f = fixture();
  await f.bot.reply('buyer', {
    message: 'Tôi cần làm gì tiếp?',
    history: [{ role: 'user', content: 'OTP là 123456' }],
  });
  assert.equal(JSON.stringify(f.ai.answer.mock.calls[0].arguments).includes('123456'), false);
});

test('credential formats and English security labels never reach AI for members or guests', async () => {
  const messages = [
    'My password is example-only',
    'My API key is example-only',
    'Thông tin thẻ 4111 1111 1111 1111',
    '4111-1111-1111-1111',
    'Bearer example-only',
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.signature',
    'AIzaExampleOnlyNotARealKey123456789',
    'sk-example-only-not-a-real-key',
    'ghp_exampleOnlyNotARealGitHubToken123456',
    'xoxb-example-only-slack-token',
    'ya29.exampleOnlyNotARealOAuthToken123456',
    '-----BEGIN PRIVATE KEY-----',
  ];
  for (const message of messages) {
    const f = fixture();
    const member = await f.bot.reply('buyer', { message, orderId: 'order-1', intent: 'CART' });
    assert.equal(member.topic, 'SECURITY', message);
    assert.equal((await f.bot.replyGuest('peer', { message })).topic, 'SECURITY', message);
    assert.equal(f.ai.answer.mock.callCount(), 0);
    assert.equal(f.prisma.order.findFirst.mock.callCount(), 0);
    await f.bot.reply('buyer', {
      message: 'Tôi cần làm gì tiếp?',
      history: [
        { role: 'user', content: message },
        { role: 'assistant', content: message },
      ],
    });
    const passedHistory = f.ai.answer.mock.calls[0].arguments[1];
    assert.ok(passedHistory.every((turn) => turn.content === '[Nội dung bảo mật đã được ẩn.]'));
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
  assert.deepEqual(calls[0][3], { firstMessage: true, offline: false });
  partnerRole = 'BUYER';
  await service.triggerAutoReply(conv, 'shop', 'SELLER', 'Thanks');
  assert.equal(calls.length, 1);
  await service.triggerAutoReply({ ...conv, status: 'CLOSED' }, 'customer', 'BUYER', 'ship');
  assert.equal(calls.length, 1);
});

test('all knowledge topics including auction, wallet, reputation, seller and security title resolve cleanly', async () => {
  const f = fixture();
  const { topics } = f.bot.capabilities();
  for (const { id, title } of topics) {
    assert.equal(matchChatbotTopic(title), id, `topic title should match ${id}`);
  }
  const auction = await f.bot.reply('buyer', { message: 'Luật đấu giá 3D và anti sniping?' });
  assert.equal(auction.topic, 'AUCTION');
  assert.match(auction.reply, /40/);
  assert.match(auction.reply, /2 phút/);
  const wallet = await f.bot.reply('buyer', {
    message: 'Ký quỹ và rút tiền ví NEXUS Pay thế nào?',
  });
  assert.equal(wallet.topic, 'WALLET');
  assert.match(wallet.reply, /7%/);
  const reputation = await f.bot.reply('buyer', { message: 'Điểm uy tín tính thế nào?' });
  assert.equal(reputation.topic, 'REPUTATION');
  assert.match(reputation.reply, /100 điểm/);
  const seller = await f.bot.reply('buyer', { message: 'Cách bật chế độ người bán?' });
  assert.equal(seller.topic, 'SELLER');
  assert.match(seller.reply, /50 điểm/);
  const securityTopic = await f.bot.reply('buyer', { message: 'Bảo mật tài khoản' });
  assert.equal(securityTopic.topic, 'SECURITY');
  assert.equal(securityTopic.engine, 'FAQ');
});
