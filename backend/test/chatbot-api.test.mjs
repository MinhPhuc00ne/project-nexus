import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
const load = createRequire(import.meta.url);
const { Module, ValidationPipe } = load('@nestjs/common');
const { ConfigService } = load('@nestjs/config');
const { NestFactory } = load('@nestjs/core');
const { SwaggerModule, DocumentBuilder } = load('@nestjs/swagger');
const { PrismaService } = load('../src/core/prisma/prisma.service.ts');
const { RedisService } = load('../src/core/redis/redis.service.ts');
const { LightweightJwt } = load('../src/core/security/jwt.util.ts');
const { ChatbotController } = load('../src/modules/chat/controllers/chatbot.controller.ts');
const { ChatbotService } = load('../src/modules/chat/services/chatbot.service.ts');
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
    class ApiModule {}
    Module({
      controllers: [ChatbotController],
      providers: [
        ChatbotService,
        ChatbotAiService,
        ChatbotRateLimitService,
        {
          provide: ConfigService,
          useValue: { get: (key) => (key === 'JWT_SECRET' ? 'chatbot-test-secret' : undefined) },
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
            user: {
              findUnique: async ({ where }) => ({
                id: where.id,
                role: 'BUYER',
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
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    app.setGlobalPrefix('api/v1');
    try {
      await app.listen(0, '127.0.0.1');
      const base = `${await app.getUrl()}/api/v1/chat/bot`;
      const headers = (id) => ({
        'Content-Type': 'application/json',
        authorization: `Bearer ${LightweightJwt.sign({ sub: id }, { secret: 'chatbot-test-secret', expiresInSeconds: 120 })}`,
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
      ]) {
        assert.equal((await post(body)).status, 400);
      }
      const faq = await post({ message: 'huy don da xac nhan' });
      assert.equal(faq.status, 200);
      assert.match((await faq.json()).reply, /Admin duyệt/);
      const owner = await post({ message: 'order', orderId });
      assert.equal(owner.status, 200);
      assert.equal((await owner.json()).order.status, 'PAID');
      assert.equal((await post({ message: 'order', orderId }, 'outsider')).status, 404);
      const missing = '4d7df146-88d6-41b3-af22-f837ead9a2d1';
      assert.equal((await post({ message: 'order', orderId: missing }, 'outsider')).status, 404);
      counts.set('chatbot:rate:owner', 20);
      assert.equal((await post({ message: 'hello' })).status, 429);
      redisDown = true;
      assert.equal((await post({ message: 'hello' }, 'other')).status, 503);
      const doc = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().setTitle('Chatbot').setVersion('1').build(),
      );
      assert.ok(doc.paths['/api/v1/chat/bot/messages'].post);
      assert.ok(doc.components.schemas.ChatbotMessageDto.required.includes('message'));
    } finally {
      await app.close();
    }
  },
);
