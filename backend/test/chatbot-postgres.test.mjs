import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
const load = createRequire(import.meta.url);
const { ChatbotService } = load('../src/modules/chat/services/chatbot.service.ts');
const { ChatbotRateLimitService } = load(
  '../src/modules/chat/services/chatbot-rate-limit.service.ts',
);
const { ChatService } = load('../src/modules/chat/services/chat.service.ts');
const { ChatAutoReplyService } = load('../src/modules/chat/services/chat-auto-reply.service.ts');

test(
  'chatbot uses real local PostgreSQL ownership queries and atomic Redis limits without retained fixtures',
  { skip: process.env.NEXUS_CHATBOT_DB_TEST !== '1' },
  async () => {
    dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
    const url = new URL(process.env.DATABASE_URL);
    assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
    const redisHost = process.env.REDIS_HOST ?? 'localhost';
    assert.ok(['localhost', '127.0.0.1', '::1'].includes(redisHost));
    const redis = new Redis({
      host: redisHost,
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
      retryStrategy: () => null,
    });
    redis.on('error', () => {});
    const pool = new Pool({ connectionString: url.toString(), connectionTimeoutMillis: 5000 });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    const marker = `chatbot-${randomUUID()}`;
    const rateKey = `chatbot:rate:${marker}`;
    const rollback = new Error('intentional rollback');
    try {
      await redis.connect();
      const limit = new ChatbotRateLimitService({ getClient: () => redis });
      const results = await Promise.allSettled(
        Array.from({ length: 21 }, () => limit.check(marker)),
      );
      assert.equal(results.filter((r) => r.status === 'fulfilled').length, 20);
      assert.equal(
        results.filter((r) => r.status === 'rejected' && r.reason.getStatus() === 429).length,
        1,
      );
      assert.ok((await redis.ttl(rateKey)) > 0);
      const guestBot = new ChatbotService(
        {
          order: {
            findFirst: () => {
              throw Error('Guest order access');
            },
          },
        },
        {
          answer: () => {
            return null;
          },
        },
        limit,
      );
      for (let i = 0; i < 20; i++) {
        const response = await guestBot.replyGuest(marker, { message: 'đơn hàng' });
        assert.deepEqual(response.actions, [{ type: 'LOGIN' }]);
      }
      await assert.rejects(
        guestBot.replyGuest(marker, { message: 'hi' }),
        (e) => e.getStatus() === 429,
      );
      await assert.rejects(
        prisma.$transaction(async (tx) => {
          const buyer = await tx.user.create({
            data: {
              email: `${marker}-buyer@example.invalid`,
              fullName: marker,
              passwordHash: 'test',
              role: 'BUYER',
            },
          });
          const seller = await tx.user.create({
            data: {
              email: `${marker}-seller@example.invalid`,
              fullName: marker,
              passwordHash: 'test',
              role: 'SELLER',
            },
          });
          const order = await tx.order.create({
            data: {
              buyerId: buyer.id,
              sellerId: seller.id,
              status: 'PAID',
              subtotal: 100,
              totalAmount: 100,
              shippingAddressSnapshot: { privateAddress: 'must-not-return' },
            },
          });
          const ai = {
            isConfigured: () => false,
            answer: () => {
              throw Error('Order details must never reach AI');
            },
          };
          const bot = new ChatbotService(tx, ai, { check: async () => {} });
          for (const id of [buyer.id, seller.id]) {
            const reply = await bot.reply(id, { message: 'order', orderId: order.id });
            assert.equal(reply.order.id, order.id);
            assert.equal(JSON.stringify(reply).includes('must-not-return'), false);
          }
          await assert.rejects(
            bot.reply(randomUUID(), { message: 'order', orderId: order.id }),
            (e) => e.getStatus() === 404,
          );
          const facade = new Proxy(tx, {
            get: (target, property) =>
              property === '$transaction' ? (run) => run(tx) : target[property],
          });
          await tx.chatAutoReply.create({
            data: {
              shopId: seller.id,
              scope: 'SHOP',
              triggerType: 'KEYWORD',
              keyword: 'bảo hành điện thoại',
              content: 'Bảo hành theo thông tin của shop',
              status: 'ACTIVE',
              isActive: true,
            },
          });
          const conversation = await tx.chatConversation.create({
            data: {
              participant1Id: buyer.id,
              participant2Id: seller.id,
              type: 'BUYER_SELLER',
              status: 'IN_PROGRESS',
            },
          });
          const chat = new ChatService(facade, {}, new ChatAutoReplyService(facade), {});
          await chat.sendMessage(buyer.id, 'BUYER', {
            conversationId: conversation.id,
            content: 'BAO HANH DIEN THOAI the nao?',
          });
          const messages = await tx.chatMessage.findMany({
            where: { conversationId: conversation.id },
            orderBy: { createdAt: 'asc' },
          });
          assert.equal(messages.length, 2);
          const automatic = messages.find((m) => m.senderId === seller.id);
          assert.match(automatic.body, /^\[Trả lời tự động\] Bảo hành/);
          const updated = await tx.chatConversation.findUniqueOrThrow({
            where: { id: conversation.id },
          });
          assert.equal(updated.unreadCountUser1, 1);
          assert.equal(updated.unreadCountUser2, 1);
          assert.equal(updated.lastMessage, automatic.body);
          await tx.chatAutoReply.create({
            data: {
              shopId: seller.id,
              scope: 'SHOP',
              triggerType: 'OFFLINE',
              content: 'Shop đang vắng mặt',
              status: 'ACTIVE',
              isActive: true,
            },
          });
          let online = false;
          chat.setBroadcaster({ isUserOnline: async () => online, broadcastMessage() {} });
          await chat.sendMessage(buyer.id, 'BUYER', {
            conversationId: conversation.id,
            content: 'hi',
          });
          const offlineUpdate = await tx.chatConversation.findUniqueOrThrow({
            where: { id: conversation.id },
          });
          assert.equal(offlineUpdate.lastMessage, '[Trả lời tự động] Shop đang vắng mặt');
          assert.equal(offlineUpdate.unreadCountUser1, 2);
          online = true;
          await chat.sendMessage(buyer.id, 'BUYER', {
            conversationId: conversation.id,
            content: 'hi',
          });
          assert.equal(
            await tx.chatMessage.count({
              where: { conversationId: conversation.id, senderId: seller.id },
            }),
            2,
          );
          throw rollback;
        }),
        (error) => error === rollback,
      );
      assert.equal(await prisma.user.count({ where: { fullName: marker } }), 0);
    } finally {
      if (redis.status === 'ready') await redis.del(rateKey, `chatbot:rate:guest:${marker}`);
      redis.disconnect();
      await prisma.$disconnect();
      await pool.end();
    }
  },
);
