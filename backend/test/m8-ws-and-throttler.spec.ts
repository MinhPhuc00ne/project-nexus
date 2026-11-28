import {
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  HttpStatus,
  Module,
  NotFoundException,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import {
  WS_AUCTION_EVENTS,
  WS_CHAT_EVENTS,
  Ws3dSyncPayloadSchema,
  WsChatSendMessageSchema,
  WsChatTypingSchema,
  WsJoinConversationSchema,
  WsJoinRoomSchema,
  WsLeaveConversationSchema,
  WsLeaveRoomSchema,
  WsMarkReadSchema,
  WsPlaceBidSchema,
} from '@nexus/contracts';
import { Role } from '@prisma/client';
import type { Socket } from 'socket.io';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { GlobalHttpExceptionFilter } from '../src/core/filters/global-http-exception.filter';
import type { PrismaService } from '../src/core/prisma/prisma.service';
import { SocketMetricsService } from '../src/core/realtime/socket-metrics.service';
import type { RedisService } from '../src/core/redis/redis.service';
import { RedisThrottlerStorage } from '../src/core/security/redis-throttler.storage';
import { TokenAuthService } from '../src/core/security/token-auth.service';
import { AuctionGateway } from '../src/modules/auction/gateways/auction.gateway';
import { AuthController } from '../src/modules/auth/controllers/auth.controller';
import { AuthProfileService } from '../src/modules/auth/services/auth-profile.service';
import { AuthService } from '../src/modules/auth/services/auth.service';
import { OAuthCodeService } from '../src/modules/auth/services/oauth-code.service';
import { ChatGateway } from '../src/modules/chat/gateways/chat.gateway';
import type { ChatPresenceService } from '../src/modules/chat/services/chat-presence.service';
import { ChatService } from '../src/modules/chat/services/chat.service';
import type { StaffQueueService } from '../src/modules/chat/services/staff-queue.service';
import { PayosService } from '../src/modules/payments/services/payos.service';
import { PayosWebhookController } from '../src/modules/wallet/controllers/payos-webhook.controller';
import { PayosWebhookService } from '../src/modules/wallet/services/payos-webhook.service';
import { ConfigService } from '@nestjs/config';

function createSocketMock(user?: { id: string; role: string; email?: string; fullName?: string }) {
  const emit = vi.fn();
  const roomEmit = vi.fn();
  const join = vi.fn().mockResolvedValue(undefined);
  const leave = vi.fn().mockResolvedValue(undefined);
  const to = vi.fn(() => ({ emit: roomEmit }));
  const socket = {
    id: 'sock-1',
    data: user ? { user } : {},
    emit,
    join,
    leave,
    to,
  } as unknown as Socket;
  return { socket, emit, roomEmit, join, leave, to };
}

@Controller('m8-string-error')
class StringErrorTestController {
  @Get('forbidden')
  forbidden(): never {
    throw new HttpException('Forbidden action', HttpStatus.FORBIDDEN);
  }
}

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }],
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: AuthService, useValue: {} },
    { provide: ConfigService, useValue: { get: () => undefined } },
    { provide: AuthProfileService, useValue: {} },
    { provide: TokenAuthService, useValue: {} },
    { provide: OAuthCodeService, useValue: { redeem: vi.fn(async () => ({ ok: true })) } },
  ],
})
class AuthThrottleTestModule {}

describe('M8 WebSocket Zod Validation, PayOS Webhook, OAuth Throttle, RedisThrottlerStorage & Filter', () => {
  describe('@nexus/contracts WebSocket Schemas', () => {
    it('trims and validates auction and chat client payloads', () => {
      expect(WsJoinRoomSchema.safeParse({ auctionId: '  ' }).success).toBe(false);
      expect(WsLeaveRoomSchema.safeParse({ auctionId: ' auc-1 ' }).data).toEqual({
        auctionId: 'auc-1',
      });
      expect(WsPlaceBidSchema.safeParse({ auctionId: 'auc-1', bidAmount: -10 }).success).toBe(
        false,
      );
      expect(
        Ws3dSyncPayloadSchema.safeParse({
          auctionId: 'auc-1',
          rotation: { x: 0, y: 1, z: 0 },
          zoom: 0,
        }).success,
      ).toBe(false);

      expect(WsJoinConversationSchema.safeParse({ conversationId: ' ' }).success).toBe(false);
      expect(WsLeaveConversationSchema.safeParse({ conversationId: 'conv-1' }).success).toBe(true);
      expect(WsMarkReadSchema.safeParse({ conversationId: 'conv-1' }).success).toBe(true);
      expect(
        WsChatTypingSchema.safeParse({ conversationId: 'conv-1', isTyping: 'yes' }).success,
      ).toBe(false);
      expect(
        WsChatTypingSchema.safeParse({ conversationId: 'conv-1', isTyping: true }).success,
      ).toBe(true);

      expect(
        WsChatSendMessageSchema.safeParse({ conversationId: 'conv-1', content: '   ' }).success,
      ).toBe(false);
      expect(
        WsChatSendMessageSchema.safeParse({ conversationId: 'conv-1', body: 'Hello' }).success,
      ).toBe(true);
      expect(
        WsChatSendMessageSchema.safeParse({
          conversationId: 'conv-1',
          attachments: ['https://cdn.example.com/a.png'],
        }).success,
      ).toBe(true);
    });
  });

  describe('AuctionGateway Zod validation', () => {
    function createGateway() {
      return new AuctionGateway({} as unknown as TokenAuthService, new SocketMetricsService());
    }

    it('rejects invalid join_room, leave_room, place_bid, and 3d_sync payloads with English-US messages', async () => {
      const gateway = createGateway();
      const admin = createSocketMock({ id: 'admin-1', role: Role.ADMIN });
      const buyer = createSocketMock({ id: 'buyer-1', role: Role.BUYER });
      const anon = createSocketMock();

      gateway.handleJoinRoom(anon.socket, { auctionId: '   ' });
      expect(anon.emit).toHaveBeenCalledWith(WS_AUCTION_EVENTS.SERVER.ERROR, {
        message: 'Invalid auction room payload.',
      });
      expect(anon.join).not.toHaveBeenCalled();

      gateway.handleLeaveRoom(anon.socket, {});
      expect(anon.emit).toHaveBeenCalledWith(WS_AUCTION_EVENTS.SERVER.ERROR, {
        message: 'Invalid auction room payload.',
      });

      const unauthBid = await gateway.handlePlaceBid(anon.socket, {
        auctionId: 'auc-1',
        bidAmount: 500,
      });
      expect(unauthBid).toEqual({
        ok: false,
        error: 'Authentication is required to place a bid.',
      });

      gateway.registerPlaceBidHandler(vi.fn(async () => ({ accepted: true })));
      const invalidBid = await gateway.handlePlaceBid(buyer.socket, {
        auctionId: 'auc-1',
        bidAmount: 0,
      });
      expect(invalidBid).toEqual({
        ok: false,
        error: 'Invalid auction room or bid amount.',
      });

      gateway.handleSyncViewport(buyer.socket, {
        auctionId: 'auc-1',
        rotation: { x: 0, y: 0, z: 0 },
        zoom: 1,
      });
      expect(buyer.emit).toHaveBeenCalledWith(WS_AUCTION_EVENTS.SERVER.ERROR, {
        message: 'Only administrators may synchronize the 3D viewport.',
      });

      gateway.handleSyncViewport(admin.socket, { auctionId: 'auc-1', zoom: 0 });
      expect(admin.emit).toHaveBeenCalledWith(WS_AUCTION_EVENTS.SERVER.ERROR, {
        message: 'Invalid 3D viewport synchronization payload.',
      });

      const validSync = {
        auctionId: 'auc-1',
        rotation: { x: 0.5, y: 1.0, z: 0 },
        zoom: 1.5,
      };
      gateway.handleSyncViewport(admin.socket, validSync);
      expect(admin.roomEmit).toHaveBeenCalledWith(
        WS_AUCTION_EVENTS.SERVER.VIEWPORT_UPDATED,
        validSync,
      );
    });
  });

  describe('ChatGateway & ChatService.assertConversationAccess', () => {
    it('enforces conversation participant, staff, and admin authorization rules', async () => {
      const findUnique = vi.fn();
      const service = new ChatService(
        { chatConversation: { findUnique } } as unknown as PrismaService,
        {} as unknown as never,
        {} as unknown as never,
        {} as unknown as StaffQueueService,
        {} as unknown as never,
      );

      findUnique.mockResolvedValueOnce(null);
      await expect(service.assertConversationAccess('conv-missing', 'u1', 'BUYER')).rejects.toThrow(
        NotFoundException,
      );

      findUnique.mockResolvedValue({
        id: 'conv-1',
        participant1Id: 'buyer-1',
        participant2Id: 'seller-1',
        assignedStaffId: 'staff-1',
        status: 'ACTIVE',
      });

      await expect(service.assertConversationAccess('conv-1', 'stranger', 'BUYER')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(
        service.assertConversationAccess('conv-1', 'staff-other', 'SUPPORT_STAFF'),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.assertConversationAccess('conv-1', 'buyer-1', 'BUYER'),
      ).resolves.toBeUndefined();
      await expect(
        service.assertConversationAccess('conv-1', 'staff-1', 'SUPPORT_STAFF'),
      ).resolves.toBeUndefined();
      await expect(
        service.assertConversationAccess('conv-1', 'admin-1', 'ADMIN'),
      ).resolves.toBeUndefined();

      findUnique.mockResolvedValueOnce({
        id: 'conv-open',
        participant1Id: 'buyer-1',
        participant2Id: null,
        assignedStaffId: null,
        status: 'OPEN',
      });
      await expect(
        service.assertConversationAccess('conv-open', 'staff-any', 'SUPPORT_STAFF'),
      ).resolves.toBeUndefined();
    });

    it('validates all 5 ChatGateway handlers with Zod and enforces join_conversation & typing access', async () => {
      const assertConversationAccess = vi.fn().mockResolvedValue(undefined);
      const sendMessage = vi.fn().mockResolvedValue({ id: 'msg-1' });
      const markAsRead = vi.fn().mockResolvedValue(undefined);

      const gateway = new ChatGateway(
        { assertConversationAccess, sendMessage, markAsRead } as unknown as ChatService,
        {} as unknown as TokenAuthService,
        {} as unknown as StaffQueueService,
        {} as unknown as ChatPresenceService,
        new SocketMetricsService(),
        new EventEmitter2(),
      );

      const anon = createSocketMock();
      const unauthJoin = await gateway.handleJoinConversation(anon.socket, {
        conversationId: 'conv-1',
      });
      expect(unauthJoin).toEqual({ status: 'error', message: 'Authentication is required.' });
      expect(anon.emit).toHaveBeenCalledWith(WS_CHAT_EVENTS.SERVER.ERROR, {
        message: 'Authentication is required.',
      });
      expect(anon.join).not.toHaveBeenCalled();

      const buyer = createSocketMock({
        id: 'buyer-1',
        role: Role.BUYER,
        email: 'buyer@nexus.test',
      });
      const invalidJoin = await gateway.handleJoinConversation(buyer.socket, {
        conversationId: '  ',
      });
      expect(invalidJoin).toEqual({ status: 'error', message: 'Invalid conversation payload.' });
      expect(buyer.join).not.toHaveBeenCalled();

      assertConversationAccess.mockRejectedValueOnce(new ForbiddenException('Access denied.'));
      const deniedJoin = await gateway.handleJoinConversation(buyer.socket, {
        conversationId: 'conv-secret',
      });
      expect(deniedJoin).toEqual({ status: 'error', message: 'Access denied.' });
      expect(buyer.join).not.toHaveBeenCalled();

      const okJoin = await gateway.handleJoinConversation(buyer.socket, {
        conversationId: 'conv-1',
      });
      expect(okJoin).toEqual({ event: 'joined', conversationId: 'conv-1' });
      expect(buyer.join).toHaveBeenCalledWith('conversation:conv-1');

      const invalidLeave = await gateway.handleLeaveConversation(buyer.socket, {});
      expect(invalidLeave).toEqual({ status: 'error', message: 'Invalid conversation payload.' });

      const emptyMsg = await gateway.handleSendMessage(buyer.socket, {
        conversationId: 'conv-1',
        content: '   ',
      });
      expect(emptyMsg).toEqual({ status: 'error', message: 'Invalid message payload.' });
      expect(sendMessage).not.toHaveBeenCalled();

      const okMsg = await gateway.handleSendMessage(buyer.socket, {
        conversationId: 'conv-1',
        body: 'Hello shop',
      });
      expect(okMsg).toEqual({ status: 'ok', data: { id: 'msg-1' } });

      assertConversationAccess.mockRejectedValueOnce(new ForbiddenException('Not a participant.'));
      const deniedTyping = await gateway.handleTyping(buyer.socket, {
        conversationId: 'conv-secret',
        isTyping: true,
      });
      expect(deniedTyping).toEqual({ status: 'error', message: 'Not a participant.' });
      expect(buyer.roomEmit).not.toHaveBeenCalled();

      const staff = createSocketMock({ id: 'staff-1', role: Role.SUPPORT_STAFF });
      await gateway.handleTyping(staff.socket, { conversationId: 'conv-1', isTyping: true });
      expect(staff.roomEmit).toHaveBeenCalledWith(WS_CHAT_EVENTS.SERVER.USER_TYPING, {
        conversationId: 'conv-1',
        userId: 'SUPPORT_STAFF_DESK',
        userName: 'Support Staff',
        isTyping: true,
      });

      markAsRead.mockRejectedValueOnce(new Error('Database error'));
      const errMarkRead = await gateway.handleMarkRead(buyer.socket, { conversationId: 'conv-1' });
      expect(errMarkRead).toEqual({ status: 'error', message: 'Database error' });
      expect(buyer.emit).toHaveBeenCalledWith(WS_CHAT_EVENTS.SERVER.ERROR, {
        message: 'Database error',
      });
    });
  });

  describe('PayosWebhookController @ZodBody & Swagger compatibility', () => {
    it('rejects malformed payloads with 400, preserves unknown HMAC fields verbatim, and builds OpenAPI', async () => {
      const handle = vi.fn(async (body: unknown) => ({ success: true, received: body }));

      const moduleRef = await Test.createTestingModule({
        controllers: [PayosWebhookController],
        providers: [
          { provide: PayosWebhookService, useValue: { handle } },
          { provide: PayosService, useValue: { confirmWebhook: vi.fn() } },
        ],
      }).compile();

      const app = moduleRef.createNestApplication();
      await app.init();

      try {
        const doc = SwaggerModule.createDocument(
          app,
          new DocumentBuilder().setTitle('Test').setVersion('1.0').build(),
        );
        expect(doc.paths['/commerce/webhooks/payos']).toBeDefined();

        const server = app.getHttpServer();
        await request(server).post('/commerce/webhooks/payos').send({}).expect(400);
        await request(server)
          .post('/commerce/webhooks/payos')
          .send({ data: { orderCode: '12345' } })
          .expect(400);

        const rawPayload = {
          code: '00',
          desc: 'success',
          success: true,
          extraEnvelopeField: 'keep-envelope',
          data: {
            orderCode: 998877,
            amount: 500000,
            description: 'Order payment',
            extraHmacField: 'keep-me-for-hmac',
          },
          signature: 'sig-123',
        };
        await request(server).post('/commerce/webhooks/payos').send(rawPayload).expect(200);
        expect(handle).toHaveBeenCalledWith(rawPayload);
      } finally {
        await app.close();
      }
    });
  });

  describe('AuthController @Throttle on POST /auth/oauth/exchange', () => {
    it('returns 429 on the 11th request within 60 seconds', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AuthThrottleTestModule],
      }).compile();
      const app = moduleRef.createNestApplication();
      await app.init();

      try {
        const server = app.getHttpServer();
        for (let i = 0; i < 10; i += 1) {
          await request(server)
            .post('/auth/oauth/exchange')
            .send({ code: `code-${i}` })
            .expect(200);
        }
        await request(server).post('/auth/oauth/exchange').send({ code: 'code-11' }).expect(429);
      } finally {
        await app.close();
      }
    });
  });

  describe('RedisThrottlerStorage atomic Lua & bounded memory fallback', () => {
    it('uses client.eval atomically when available and blocks when hits exceed limit', async () => {
      const evalMock = vi.fn().mockResolvedValueOnce([4, 45_000, 1, 45_000]);
      const storage = new RedisThrottlerStorage({
        getClient: () => ({ eval: evalMock }),
      } as unknown as RedisService);

      const record = await storage.increment('ip-1', 60_000, 3, 0, 'default');
      expect(evalMock).toHaveBeenCalledTimes(1);
      expect(record).toEqual({
        totalHits: 4,
        timeToExpire: 45,
        isBlocked: true,
        timeToBlockExpire: 45,
      });
    });

    it('blocks when blockDuration is 0 in memory fallback and prunes/caps memory buckets', async () => {
      const storage = new RedisThrottlerStorage({
        getClient: () => {
          throw new Error('redis offline');
        },
      } as unknown as RedisService);

      const r1 = await storage.increment('client-a', 60_000, 1, 0, 'default');
      const r2 = await storage.increment('client-a', 60_000, 1, 0, 'default');
      expect(r1.isBlocked).toBe(false);
      expect(r2.isBlocked).toBe(true);
      expect(r2.timeToBlockExpire).toBeGreaterThanOrEqual(1);

      for (let i = 0; i < 10_050; i += 1) {
        await storage.increment(`flood-${i}`, 60_000, 5, 0, 'default');
      }
      const internalMap = (storage as unknown as { memory: Map<string, unknown> }).memory;
      expect(internalMap.size).toBeLessThanOrEqual(10_000);
    });
  });

  describe('GlobalHttpExceptionFilter string response errorCode', () => {
    it('maps string HttpException responses to HTTP_<statusCode> instead of INTERNAL_SERVER_ERROR', async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [StringErrorTestController],
      }).compile();
      const app = moduleRef.createNestApplication();
      app.useGlobalFilters(new GlobalHttpExceptionFilter());
      await app.init();

      try {
        const res = await request(app.getHttpServer())
          .get('/m8-string-error/forbidden')
          .expect(403);
        expect(res.body.statusCode).toBe(403);
        expect(res.body.errorCode).toBe('HTTP_403');
        expect(res.body.message).toBe('Forbidden action');
      } finally {
        await app.close();
      }
    });
  });
});
