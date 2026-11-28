import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { GlobalHttpExceptionFilter } from '../src/core/filters/global-http-exception.filter';
import { TransformResponseInterceptor } from '../src/core/interceptors/transform-response.interceptor';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { RedisService } from '../src/core/redis/redis.service';
import { TokenAuthService } from '../src/core/security/token-auth.service';

describe('M9 AppModule RequestTrace & AuditLogService integration', () => {
  const savedEnv: Record<string, string | undefined> = {};
  const requiredKeys = {
    NODE_ENV: 'test',
    APP_ENV: 'development',
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/nexus',
    JWT_SECRET: 'm9-request-trace-jwt-secret-key-2026',
    REFRESH_TOKEN_SECRET: 'm9-request-trace-refresh-secret-key-2026',
  };

  let AppModuleClass: typeof import('../src/app.module').AppModule;

  beforeAll(async () => {
    for (const [key, value] of Object.entries(requiredKeys)) {
      savedEnv[key] = process.env[key];
      process.env[key] = value;
    }
    ({ AppModule: AppModuleClass } = await import('../src/app.module'));
  });

  afterAll(() => {
    for (const [key, prev] of Object.entries(savedEnv)) {
      if (prev === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prev;
      }
    }
  });

  it('propagates explicit and auto-generated traceId identically across HTTP headers, envelope, and AuditLogService', async () => {
    const adminId = '11111111-1111-4111-8111-111111111111';
    const eventLogCreate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'event-log-1',
      ...data,
    }));

    const txMock = {
      wallet: {
        update: vi.fn().mockResolvedValue({ id: 'wallet-admin', balance: 1500, currency: 'VND' }),
      },
      walletTransaction: {
        create: vi.fn().mockResolvedValue({
          id: 'wtx-admin-1',
          amount: 500,
          type: 'DEPOSIT',
          status: 'SUCCESS',
          description: 'Trace audit check',
          createdAt: new Date('2026-11-28T00:00:00Z'),
        }),
      },
      eventLog: { create: eventLogCreate },
    };

    const prismaMock = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: adminId,
          email: 'admin@nexus.test',
          role: Role.ADMIN,
          isSellerActive: false,
          isShopSuspended: false,
          trustLevel: 'NORMAL',
        }),
      },
      wallet: {
        findUnique: vi.fn().mockResolvedValue({ id: 'wallet-admin', userId: adminId }),
      },
      eventLog: { create: eventLogCreate },
      $transaction: vi.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    const redisClientMock = {
      pttl: vi.fn().mockResolvedValue(-1),
      incr: vi.fn().mockResolvedValue(1),
      pexpire: vi.fn().mockResolvedValue(1),
      psetex: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      eval: vi.fn().mockResolvedValue([1, 60_000, 0, 0]),
    };

    const redisMock = {
      getClient: () => redisClientMock,
      ping: vi.fn().mockResolvedValue('PONG'),
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModuleClass],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(RedisService)
      .useValue(redisMock)
      .compile();

    const app = moduleRef.createNestApplication();
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    await app.init();

    try {
      const tokenAuth = moduleRef.get(TokenAuthService);
      const token = await tokenAuth.signAccessToken({
        id: adminId,
        email: 'admin@nexus.test',
        role: Role.ADMIN,
      });

      const explicitTrace = 'trace-app-explicit-001';
      const explicitRes = await request(app.getHttpServer())
        .post('/admin/wallet/deposit')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Request-Id', explicitTrace)
        .send({ amount: 50000, description: 'Explicit trace deposit' })
        .expect(200);

      expect(explicitRes.headers['x-request-id']).toBe(explicitTrace);
      expect(explicitRes.body.traceId).toBe(explicitTrace);
      expect(eventLogCreate).toHaveBeenNthCalledWith(1, {
        data: expect.objectContaining({
          eventName: 'admin.wallet.deposited',
          operatorId: adminId,
          traceId: explicitTrace,
        }),
      });

      const autoRes = await request(app.getHttpServer())
        .post('/admin/wallet/deposit')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 50000, description: 'Auto trace deposit' })
        .expect(200);

      const generatedTrace = autoRes.headers['x-request-id'];
      expect(typeof generatedTrace).toBe('string');
      expect(generatedTrace.length).toBeGreaterThan(10);
      expect(autoRes.body.traceId).toBe(generatedTrace);
      expect(eventLogCreate).toHaveBeenNthCalledWith(2, {
        data: expect.objectContaining({
          eventName: 'admin.wallet.deposited',
          operatorId: adminId,
          traceId: generatedTrace,
        }),
      });
    } finally {
      await app.close();
    }
  });
});
