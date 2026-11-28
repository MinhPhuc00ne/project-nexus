import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { AuctionStatus } from '@prisma/client';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { assertNotProduction } from '../prisma/seeds/demo/index';
import { DomainEventsService } from '../src/core/events/domain-events.service';
import { GlobalHttpExceptionFilter } from '../src/core/filters/global-http-exception.filter';
import { HealthController } from '../src/core/health/health.controller';
import { HealthService } from '../src/core/health/health.service';
import { TransformResponseInterceptor } from '../src/core/interceptors/transform-response.interceptor';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { SocketMetricsService } from '../src/core/realtime/socket-metrics.service';
import { DistributedLockService } from '../src/core/redis/distributed-lock.service';
import { RedisService } from '../src/core/redis/redis.service';
import { AuctionGateway } from '../src/modules/auction/gateways/auction.gateway';
import { AuctionCheckoutService } from '../src/modules/auction/services/auction-checkout.service';
import { AuctionLifecycleService } from '../src/modules/auction/services/auction-lifecycle.service';
import { AuctionService } from '../src/modules/auction/services/auction.service';
import { ChatbotAiService } from '../src/modules/chat/services/chatbot-ai.service';

describe('M7 Deploy, Health Probes, Auction Idle Polling & Demo Seed Guard', () => {
  describe('HealthController & HealthService (/health, /health/live, /health/ready)', () => {
    it('returns /health diagnostics without outbox and zero-I/O /health/live', async () => {
      const queryRaw = vi.fn().mockResolvedValue([{ '?column?': 1 }]);
      const ping = vi.fn().mockResolvedValue('PONG');
      const socketMetrics = new SocketMetricsService();
      socketMetrics.register('/ws/auctions', () => 3);

      const service = new HealthService(
        { $queryRaw: queryRaw } as unknown as PrismaService,
        { ping } as unknown as RedisService,
        socketMetrics,
      );

      const live = service.liveness();
      expect(live.status).toBe('ok');
      expect(live.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(queryRaw).not.toHaveBeenCalled();
      expect(ping).not.toHaveBeenCalled();

      const health = await service.check();
      expect(health).not.toHaveProperty('outbox');
      expect(health.status).toBe('ok');
      expect(health.sockets.connectedClients).toBe(3);
      expect(queryRaw).toHaveBeenCalledTimes(1);
      expect(ping).toHaveBeenCalledTimes(1);
    });

    it('throws ServiceUnavailableException on /health/ready when DB or Redis is down', async () => {
      const queryRaw = vi.fn().mockResolvedValue([{ '?column?': 1 }]);
      const ping = vi.fn().mockResolvedValue('PONG');
      const socketMetrics = new SocketMetricsService();
      const service = new HealthService(
        { $queryRaw: queryRaw } as unknown as PrismaService,
        { ping } as unknown as RedisService,
        socketMetrics,
      );
      const controller = new HealthController(service);

      const readyOk = await controller.ready();
      expect(readyOk.status).toBe('ok');

      ping.mockRejectedValueOnce(new Error('Redis connection refused'));
      await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);

      queryRaw.mockRejectedValueOnce(new Error('Postgres offline'));
      await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('serves /api/v1/health/live (200) and /api/v1/health/ready (200 / 503) over HTTP', async () => {
      let dbDown = false;
      const queryRaw = vi.fn(async () => {
        if (dbDown) throw new Error('DB down');
        return [{ '?column?': 1 }];
      });
      const ping = vi.fn(async () => 'PONG');

      const moduleRef = await Test.createTestingModule({
        controllers: [HealthController],
        providers: [
          HealthService,
          SocketMetricsService,
          { provide: PrismaService, useValue: { $queryRaw: queryRaw } },
          { provide: RedisService, useValue: { ping } },
        ],
      }).compile();

      const app = moduleRef.createNestApplication();
      app.setGlobalPrefix('api/v1');
      app.useGlobalFilters(new GlobalHttpExceptionFilter());
      app.useGlobalInterceptors(new TransformResponseInterceptor());
      await app.init();

      try {
        const liveRes = await request(app.getHttpServer()).get('/api/v1/health/live');
        expect(liveRes.status).toBe(200);
        expect(liveRes.body.data.status).toBe('ok');
        expect(queryRaw).not.toHaveBeenCalled();

        const readyOkRes = await request(app.getHttpServer()).get('/api/v1/health/ready');
        expect(readyOkRes.status).toBe(200);
        expect(readyOkRes.body.data.status).toBe('ok');

        dbDown = true;
        const readyDownRes = await request(app.getHttpServer()).get('/api/v1/health/ready');
        expect(readyDownRes.status).toBe(503);
        expect(readyDownRes.body.statusCode).toBe(503);
      } finally {
        await app.close();
      }
    });

    it('serves /api/v1/health (200 ok, 503 on Redis error or non-PONG reply) and flags degraded >500ms', async () => {
      let redisReply = 'PONG';
      let redisShouldThrow = false;
      const queryRaw = vi.fn(async () => [{ '?column?': 1 }]);
      const ping = vi.fn(async () => {
        if (redisShouldThrow) {
          throw new Error('Redis timeout');
        }
        return redisReply;
      });

      const moduleRef = await Test.createTestingModule({
        controllers: [HealthController],
        providers: [
          HealthService,
          SocketMetricsService,
          { provide: PrismaService, useValue: { $queryRaw: queryRaw } },
          { provide: RedisService, useValue: { ping } },
        ],
      }).compile();

      const app = moduleRef.createNestApplication();
      app.setGlobalPrefix('api/v1');
      app.useGlobalFilters(new GlobalHttpExceptionFilter());
      app.useGlobalInterceptors(new TransformResponseInterceptor());
      await app.init();

      try {
        const okRes = await request(app.getHttpServer()).get('/api/v1/health');
        expect(okRes.status).toBe(200);
        expect(okRes.body.data.status).toBe('ok');

        redisReply = 'LOADING';
        const nonPongRes = await request(app.getHttpServer()).get('/api/v1/health');
        expect(nonPongRes.status).toBe(503);
        expect(nonPongRes.body.data.status).toBe('down');
        expect(nonPongRes.body.data.redis.message).toContain('unexpected PING reply: LOADING');

        redisShouldThrow = true;
        const downRes = await request(app.getHttpServer()).get('/api/v1/health');
        expect(downRes.status).toBe(503);
        expect(downRes.body.data.status).toBe('down');

        redisShouldThrow = false;
        redisReply = 'PONG';
        const healthService = moduleRef.get(HealthService);
        let tick = 1000;
        const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => {
          const current = tick;
          tick += 650;
          return current;
        });
        try {
          const degraded = await healthService.check();
          expect(degraded.status).toBe('degraded');
          expect(degraded.db.status).toBe('degraded');
          expect(degraded.redis.status).toBe('degraded');
        } finally {
          nowSpy.mockRestore();
        }
      } finally {
        await app.close();
      }
    });
  });

  describe('AuctionLifecycleService idle DB polling elimination', () => {
    function createLifecycleHarness() {
      let clientsCount = 0;
      const findMany = vi.fn().mockResolvedValue([]);
      const awardFindMany = vi.fn().mockResolvedValue([]);
      const endDueLots = vi.fn().mockResolvedValue(undefined);
      const broadcastTimerSync = vi.fn();

      const socketMetrics = new SocketMetricsService();
      socketMetrics.register('/ws/auctions', () => clientsCount);

      const domainEvents = new DomainEventsService(new EventEmitter2());

      const service = new AuctionLifecycleService(
        {
          auction: { findMany },
          auctionAward: { findMany: awardFindMany },
        } as unknown as PrismaService,
        { endDueLots } as unknown as AuctionService,
        { expire: vi.fn() } as unknown as AuctionCheckoutService,
        { broadcastTimerSync } as unknown as AuctionGateway,
        {
          runExclusively: vi.fn((_k, _t, fn: () => Promise<void>) => fn()),
        } as unknown as DistributedLockService,
        socketMetrics,
        domainEvents,
      );

      return {
        service,
        findMany,
        broadcastTimerSync,
        domainEvents,
        setClientsCount: (count: number) => {
          clientsCount = count;
        },
      };
    }

    it('executes 0 DB queries on 1s syncActiveTimers() when 0 /ws/auctions sockets are connected', async () => {
      const h = createLifecycleHarness();
      h.setClientsCount(0);

      await h.service.syncActiveTimers();
      await h.service.syncActiveTimers();
      await h.service.syncActiveTimers();

      expect(h.findMany).not.toHaveBeenCalled();
      expect(h.broadcastTimerSync).not.toHaveBeenCalled();
    });

    it('executes 0 DB queries on repeated 1s syncActiveTimers() calls when idle even with sockets connected', async () => {
      const h = createLifecycleHarness();
      h.setClientsCount(2);

      // First tick loads empty cache once; subsequent 1s syncs hit cache with 0 DB queries.
      await h.service.syncActiveTimers();
      await h.service.syncActiveTimers();
      await h.service.syncActiveTimers();

      expect(h.findMany).toHaveBeenCalledTimes(1);
      expect(h.broadcastTimerSync).not.toHaveBeenCalled();
    });

    it('broadcasts timer_sync from cache without DB queries and invalidates on AUCTION_STATE_CHANGED', async () => {
      const h = createLifecycleHarness();
      h.service.onModuleInit();
      try {
        h.setClientsCount(1);

        // Initially idle
        await h.service.tick();
        expect(h.findMany).toHaveBeenCalledTimes(1);

        await h.service.syncActiveTimers();
        expect(h.findMany).toHaveBeenCalledTimes(1);
        expect(h.broadcastTimerSync).not.toHaveBeenCalled();

        // Auction starts -> domain event invalidates and reloads cache
        const futureEnd = new Date(Date.now() + 60_000);
        h.findMany.mockResolvedValueOnce([
          {
            id: 'auction-1',
            endTime: futureEnd,
            status: AuctionStatus.ACTIVE,
            isExtended: false,
            items: [
              {
                id: 'lot-1',
                endTime: futureEnd,
                lotStatus: AuctionStatus.ACTIVE,
                isExtended: false,
              },
            ],
          },
        ]);

        h.domainEvents.publishAuctionStateChanged({ auctionId: 'auction-1', reason: 'STARTED' });
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(h.findMany).toHaveBeenCalledTimes(2);

        // Multiple 1s sync calls read strictly from memory cache -> 0 new DB queries!
        await h.service.syncActiveTimers();
        await h.service.syncActiveTimers();
        expect(h.findMany).toHaveBeenCalledTimes(2);
        expect(h.broadcastTimerSync).toHaveBeenCalledTimes(2);
        expect(h.broadcastTimerSync).toHaveBeenCalledWith(
          expect.objectContaining({
            auctionId: 'auction-1',
            lotTimers: expect.arrayContaining([
              expect.objectContaining({ auctionItemId: 'lot-1' }),
            ]),
          }),
        );
      } finally {
        await h.service.onModuleDestroy();
      }
    });

    it('skips interval timers when NODE_ENV=test while keeping domain event subscription active', async () => {
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
      const h = createLifecycleHarness();
      try {
        h.service.onModuleInit();
        expect(setIntervalSpy).not.toHaveBeenCalled();

        h.setClientsCount(1);
        h.domainEvents.publishAuctionStateChanged({ auctionId: 'auction-1', reason: 'STARTED' });
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(h.findMany).toHaveBeenCalledTimes(1);
      } finally {
        await h.service.onModuleDestroy();
        setIntervalSpy.mockRestore();
      }
    });

    it('refreshes active auction cache after the 15s TTL expires without local domain events', async () => {
      const h = createLifecycleHarness();
      h.setClientsCount(1);

      let nowMs = 1_000_000;
      const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => nowMs);
      try {
        await h.service.syncActiveTimers();
        expect(h.findMany).toHaveBeenCalledTimes(1);

        nowMs += 5_000;
        await h.service.syncActiveTimers();
        expect(h.findMany).toHaveBeenCalledTimes(1);

        nowMs += 15_000;
        await h.service.syncActiveTimers();
        expect(h.findMany).toHaveBeenCalledTimes(2);
      } finally {
        nowSpy.mockRestore();
      }
    });
  });

  describe('seed:demo assertNotProduction guard', () => {
    it('blocks APP_ENV=production and legacy NODE_ENV=production without override', () => {
      expect(() => assertNotProduction({ APP_ENV: 'production', NODE_ENV: 'development' })).toThrow(
        /Refusing to seed demo data/,
      );
      expect(() => assertNotProduction({ NODE_ENV: 'production' })).toThrow(
        /Refusing to seed demo data/,
      );
    });

    it('allows APP_ENV=demo with NODE_ENV=production and allows explicit ALLOW_DEMO_SEED=true', () => {
      expect(() => assertNotProduction({ APP_ENV: 'demo', NODE_ENV: 'production' })).not.toThrow();
      expect(() =>
        assertNotProduction({
          APP_ENV: 'production',
          NODE_ENV: 'production',
          ALLOW_DEMO_SEED: 'true',
        }),
      ).not.toThrow();
    });
  });

  describe('ChatbotAiService boolean & string CHATBOT_AI_ENABLED support', () => {
    it('accepts both boolean true and string "true" from ConfigService', () => {
      const withBoolean = new ChatbotAiService({
        get: (key: string) =>
          ({
            CHATBOT_AI_ENABLED: true,
            GEMINI_API_KEY: 'test-gemini-key',
            CHATBOT_GEMINI_MODEL: 'gemini-3.1-flash-lite',
          })[key],
      } as unknown as ConfigService);
      expect(withBoolean.isConfigured()).toBe(true);

      const withString = new ChatbotAiService({
        get: (key: string) =>
          ({
            CHATBOT_AI_ENABLED: 'true',
            GEMINI_API_KEY: 'test-gemini-key',
            CHATBOT_GEMINI_MODEL: 'gemini-3.1-flash-lite',
          })[key],
      } as unknown as ConfigService);
      expect(withString.isConfigured()).toBe(true);

      const disabledBoolean = new ChatbotAiService({
        get: (key: string) =>
          ({
            CHATBOT_AI_ENABLED: false,
            GEMINI_API_KEY: 'test-gemini-key',
            CHATBOT_GEMINI_MODEL: 'gemini-3.1-flash-lite',
          })[key],
      } as unknown as ConfigService);
      expect(disabledBoolean.isConfigured()).toBe(false);
    });
  });
});
