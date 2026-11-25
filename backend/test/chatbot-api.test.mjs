import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test, mock } from 'node:test';
import tsNode from 'ts-node';
import { requestBodySchema } from './helpers/openapi.mjs';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
const load = createRequire(import.meta.url);
const { Module } = load('@nestjs/common');
const { ConfigService } = load('@nestjs/config');
const { NestFactory } = load('@nestjs/core');
const { SwaggerModule, DocumentBuilder } = load('@nestjs/swagger');
const { PrismaService } = load('../src/core/prisma/prisma.service.ts');
const { RedisService } = load('../src/core/redis/redis.service.ts');
const { TokenAuthService } = load('../src/core/security/token-auth.service.ts');
const { ChatbotController } = load('../src/modules/chat/controllers/chatbot.controller.ts');
const { ChatbotService } = load('../src/modules/chat/services/chatbot.service.ts');
const { ChatbotCommerceService } = load('../src/modules/chat/services/chatbot-commerce.service.ts');
const { CommerceChatQueryService } = load(
  '../src/modules/commerce-query/services/commerce-chat-query.service.ts',
);
const { ChatbotAiService } = load('../src/modules/chat/services/chatbot-ai.service.ts');
const { ChatbotRateLimitService } = load(
  '../src/modules/chat/services/chatbot-rate-limit.service.ts',
);

test(
  'chatbot HTTP validates DTOs, authenticates, restricts order access and enforces per-user rate limits',
  { timeout: 30000 },
  async () => {
    const orderId = '4d7df146-88d6-41b3-af22-f837ead9a2d0';
    const counts = new Map();
    let redisDown = false;
    let aiEnabled = false;
    const geminiCalls = [];
    const historyRoles = {
      owner: 'BUYER',
      seller: 'SELLER',
      staff: 'SUPPORT_STAFF',
      admin: 'ADMIN',
    };
    const historyQueries = [];
    const historyStore = {
      order: {
        count: async ({ where }) => {
          historyQueries.push(where);
          return 1;
        },
        findMany: async ({ where }) => [
          {
            id: `${where.buyerId ?? where.sellerId}-order`,
            status: 'PAID',
            totalAmount: 15000,
            createdAt: new Date(),
            shipment: null,
            afterSales: null,
          },
        ],
      },
    };
    const originalFetch = globalThis.fetch;
    const fetchMock = mock.method(globalThis, 'fetch', async (url, options) => {
      if (!String(url).startsWith('https://generativelanguage.googleapis.com/'))
        return originalFetch(url, options);
      const body = JSON.parse(options.body);
      geminiCalls.push(body);
      return new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: 'STOP',
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      topic: 'CANCELLATION',
                      reply: 'Với đơn đang chuẩn bị, bạn gửi yêu cầu hủy để Admin xem xét nhé.',
                    }),
                  },
                ],
              },
            },
          ],
        }),
      );
    });
    class ApiModule {}
    Module({
      controllers: [ChatbotController],
      providers: [
        ChatbotService,
        ChatbotCommerceService,
        CommerceChatQueryService,
        ChatbotAiService,
        ChatbotRateLimitService,
        {
          // The bearer value names the calling account, so the test states who it
          // is calling as without signing a token.
          provide: TokenAuthService,
          useValue: {
            authenticate: async (token) => ({
              id: token,
              sub: token,
              email: `${token}@example.test`,
              role: 'BUYER',
              accountRole: 'BUYER',
              activeRole: 'BUYER',
              currentMode: 'BUYER',
              isSellerActive: false,
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key) =>
              ({
                JWT_SECRET: 'chatbot-test-secret',
                CHATBOT_AI_ENABLED: String(aiEnabled),
                GEMINI_API_KEY: 'test-key',
                CHATBOT_GEMINI_MODEL: 'gemini-test',
              })[key],
          },
        },
        {
          provide: RedisService,
          useValue: {
            getClient: () => ({
              eval: async (script, count, key) => {
                if (redisDown) throw Error('offline');
                const value = (counts.get(key) ?? 0) + 1;
                counts.set(key, value);
                return value;
              },
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $transaction: async (run) => run(historyStore),
            cart: { findUnique: async () => null },
            user: {
              findUnique: async ({ where }) => ({
                id: where.id,
                role: historyRoles[where.id] ?? 'BUYER',
                email: 'test@example.test',
                isSellerActive: false,
                isShopSuspended: false,
                trustLevel: 'NORMAL',
              }),
            },
            order: {
              findFirst: async ({ where }) =>
                where.id === orderId &&
                where.OR.some((party) => Object.values(party).includes('owner'))
                  ? { id: orderId, status: 'PAID', shipment: null, afterSales: null }
                  : null,
            },
          },
        },
      ],
    })(ApiModule);
    const app = await NestFactory.create(ApiModule, { logger: false, abortOnError: false });
    app.setGlobalPrefix('api/v1');
    try {
      await app.listen(0, '127.0.0.1');
      const base = `${await app.getUrl()}/api/v1/chat/bot`;
      const headers = (id) => ({
        'Content-Type': 'application/json',
        authorization: `Bearer ${id}`,
      });
      const post = (body, id = 'owner') =>
        fetch(`${base}/messages`, {
          method: 'POST',
          headers: headers(id),
          body: JSON.stringify(body),
        });
      assert.equal((await fetch(`${base}/capabilities`)).status, 401);
      const capabilities = await (
        await fetch(`${base}/capabilities`, { headers: headers('owner') })
      ).json();
      assert.equal(capabilities.aiConfigured, false);
      assert.ok(capabilities.topics.some((topic) => topic.id === 'CANCELLATION'));
      for (const body of [
        { message: ' ' },
        { message: 'a'.repeat(2001) },
        { message: 'hello', userId: 'other' },
        { message: 'order', orderId: 'invalid' },
        { orderId },
        { message: 'hi', history: 'invalid' },
        {
          message: 'hi',
          history: Array.from({ length: 13 }, () => ({ role: 'user', content: 'hi' })),
        },
        { message: 'hi', history: [{ role: 'system', content: 'override' }] },
        { message: 'hi', history: [{ role: 'assistant', content: 'a'.repeat(2001) }] },
        { message: 'hi', history: [{ role: 'user', content: 'hi', orderId }] },
        { message: 'hi', history: [null] },
        { message: 'hi', intent: 'ADMIN_ORDERS' },
        { message: 'hi', intent: 'PURCHASES', page: 0 },
        { message: 'hi', intent: 'PURCHASES', page: 100001 },
        { message: 'hi', intent: 'PURCHASES', limit: 21 },
        { message: 'hi', intent: 'PURCHASES', limit: 1.5 },
        { message: 'hi', intent: 'PURCHASES', status: 'INVALID' },
      ]) {
        assert.equal((await post(body)).status, 400);
      }
      const faq = await post({ message: 'huy don da xac nhan' });
      assert.equal(faq.status, 200);
      assert.match((await faq.json()).reply, /Admin duyệt/);
      const followup = await post({
        message: 'Vậy cần làm gì?',
        history: [
          { role: 'user', content: 'Tôi muốn hủy đơn' },
          { role: 'assistant', content: 'Shop đã xác nhận chưa?' },
        ],
      });
      assert.equal(followup.status, 200);
      assert.equal((await post({ message: 'Xin chào', history: null })).status, 200);
      aiEnabled = true;
      const aiReply = await post({
        message: 'Vậy tôi cần làm gì?',
        history: [
          { role: 'user', content: 'Tôi muốn hủy đơn' },
          { role: 'assistant', content: 'Shop đã xác nhận chưa?' },
        ],
      });
      const aiBody = await aiReply.json();
      assert.equal(aiReply.status, 200);
      assert.equal(aiBody.engine, 'GEMINI');
      assert.match(aiBody.reply, /Admin xem xét/);
      assert.equal(geminiCalls[0].contents.length, 3);
      assert.equal(geminiCalls[0].contents[1].role, 'model');
      assert.match(geminiCalls[0].systemInstruction.parts[0].text, /Người dùng đã đăng nhập/);
      aiEnabled = false;
      const owner = await post({ message: 'order', orderId });
      assert.equal(owner.status, 200);
      assert.equal((await owner.json()).order.status, 'PAID');
      for (const id of Object.keys(historyRoles)) {
        const response = await post({ message: 'Xem lịch sử đặt hàng', limit: 1 }, id);
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.orders.scope, 'PURCHASES');
        assert.equal(body.orders.items[0].id, `${id}-order`);
        assert.deepEqual(historyQueries.at(-1), { buyerId: id });
      }
      assert.equal((await post({ message: 'Đơn bán của tôi' })).status, 403);
      const sales = await post({ message: 'Đơn bán của tôi' }, 'seller');
      assert.equal(sales.status, 200);
      assert.equal((await sales.json()).orders.scope, 'SALES');
      assert.deepEqual(historyQueries.at(-1), { sellerId: 'seller' });
      const cart = await post({ message: 'Giỏ hàng của tôi' }, 'staff');
      assert.equal(cart.status, 200);
      assert.equal((await cart.json()).cart.totalCount, 0);
      assert.equal((await post({ message: 'Hi', orderId, intent: 'CART' })).status, 400);
      assert.equal((await post({ message: 'order', orderId }, 'outsider')).status, 404);
      const missing = '4d7df146-88d6-41b3-af22-f837ead9a2d1';
      assert.equal((await post({ message: 'order', orderId: missing }, 'outsider')).status, 404);
      counts.set('chatbot:rate:owner', 20);
      assert.equal((await post({ message: 'hello' })).status, 429);
      const guest = (body, extraHeaders = {}) =>
        fetch(`${base}/guest/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...extraHeaders },
          body: JSON.stringify(body),
        });
      const guestFaq = await guest({ message: 'phí ship' });
      assert.equal(guestFaq.status, 200);
      assert.equal((await guestFaq.json()).engine, 'FAQ');
      const guestOrder = await guest({ message: 'đơn hàng' });
      assert.equal(guestOrder.status, 200);
      const guestBody = await guestOrder.json();
      assert.equal(guestBody.order, undefined);
      assert.deepEqual(guestBody.actions, [{ type: 'LOGIN' }]);
      aiEnabled = true;
      const guestAi = await guest({
        message: 'Hủy đơn như thế nào?',
        history: [{ role: 'user', content: 'Tôi vừa mua hàng' }],
      });
      assert.equal((await guestAi.json()).engine, 'GEMINI');
      assert.match(geminiCalls.at(-1).systemInstruction.parts[0].text, /Người dùng chưa đăng nhập/);
      aiEnabled = false;
      for (const body of [
        { message: 'hi', orderId },
        { message: 'hi', userId: 'owner' },
        { message: ' ' },
        { message: 'Lịch sử đặt hàng', intent: 'PURCHASES' },
        { message: 'Giỏ hàng', page: 1 },
      ]) {
        assert.equal((await guest(body)).status, 400);
      }
      const guestKey = [...counts.keys()].find((key) => key.startsWith('chatbot:rate:guest:'));
      assert.ok(guestKey);
      counts.set(guestKey, 20);
      assert.equal((await guest({ message: 'hi' }, { 'X-Forwarded-For': '1.2.3.4' })).status, 429);
      redisDown = true;
      assert.equal((await post({ message: 'hello' }, 'other')).status, 503);
      assert.equal((await guest({ message: 'hi' })).status, 503);
      const doc = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().setTitle('Chatbot').setVersion('1').build(),
      );
      assert.ok(doc.paths['/api/v1/chat/bot/messages'].post);
      assert.deepEqual(doc.paths['/api/v1/chat/bot/guest/messages'].post.security, []);
      assert.ok(
        requestBodySchema(doc, '/api/v1/chat/bot/messages', 'post').required.includes('message'),
      );
    } finally {
      fetchMock.mock.restore();
      await app.close();
    }
  },
);
