import { type ArgumentsHost, BadRequestException, Controller, Get, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { NumericCodeParamSchema, PositiveIntParamSchema, UuidParamSchema } from '@nexus/contracts';
import { ZodParam, ZodQuery } from '@nexus/contracts/nest';
import helmet from 'helmet';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createCorsOriginCallback, validateBackendEnv } from '../src/core/config/env.schema';
import { GlobalHttpExceptionFilter } from '../src/core/filters/global-http-exception.filter';
import { TransformResponseInterceptor } from '../src/core/interceptors/transform-response.interceptor';
import type { RedisService } from '../src/core/redis/redis.service';
import { RedisThrottlerStorage } from '../src/core/security/redis-throttler.storage';
import {
  StandardPaginationQuery,
  StandardPaginationQuerySchema,
} from '../src/core/validation/query-schemas';

@Controller('m8-test')
class M8TestController {
  @Get('items/:id')
  getItem(
    @ZodParam('id', UuidParamSchema) id: string,
    @ZodQuery(StandardPaginationQuerySchema) query: StandardPaginationQuery,
  ) {
    return { id, page: query.page, limit: query.limit };
  }

  @Get('districts/:provinceId')
  getDistrict(@ZodParam('provinceId', PositiveIntParamSchema) provinceId: number) {
    return { provinceId };
  }

  @Get('deposits/:orderCode')
  getDeposit(@ZodParam('orderCode', NumericCodeParamSchema) orderCode: string) {
    return { orderCode };
  }

  @Get('error-code')
  throwWithCode(): never {
    throw new BadRequestException({
      errorCode: 'CANNOT_PURCHASE_OWN_PRODUCT',
      message: 'Cannot purchase your own product',
    });
  }
}

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 3 }],
      storage: new RedisThrottlerStorage({
        getClient: () => {
          throw new Error('use memory fallback in isolated test');
        },
      } as unknown as RedisService),
    }),
  ],
  controllers: [M8TestController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
class M8TestModule {}

describe('M8 Production Hardening, Validation & Unified Contracts', () => {
  it('enforces helmet headers, X-Request-Id propagation, ZodParam/ZodQuery, errorCode, and 429 rate-limit', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [M8TestModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
    app.use(
      (
        req: { headers: Record<string, string>; id?: string },
        res: { setHeader: (k: string, v: string) => void },
        next: () => void,
      ) => {
        const id = req.headers['x-request-id'] || 'generated-req-id';
        req.id = id;
        res.setHeader('X-Request-Id', id);
        next();
      },
    );
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    await app.init();

    const server = app.getHttpServer();
    const validUuid = '11111111-1111-4111-8111-111111111111';

    // 1. Valid UUID + coerced query params + helmet + X-Request-Id
    const okRes = await request(server)
      .get(`/m8-test/items/${validUuid}?page=2&limit=15`)
      .set('X-Request-Id', 'trace-m8-123')
      .expect(200);
    expect(okRes.headers['x-content-type-options']).toBe('nosniff');
    expect(okRes.headers['x-request-id']).toBe('trace-m8-123');
    expect(okRes.body.traceId).toBe('trace-m8-123');
    expect(okRes.body.data).toEqual({ id: validUuid, page: 2, limit: 15 });

    // 2. Invalid UUID rejected with 400
    await request(server).get('/m8-test/items/not-a-uuid').expect(400);

    // 3. ErrorCode forwarded by GlobalHttpExceptionFilter (4th request triggers 429 after this if limit=3, so test limit=3 cleanly)
    const errRes = await request(server)
      .get('/m8-test/error-code')
      .set('X-Request-Id', 'trace-m8-err')
      .expect(400);
    expect(errRes.body.errorCode).toBe('CANNOT_PURCHASE_OWN_PRODUCT');
    expect(errRes.body.traceId).toBe('trace-m8-err');

    // 4. Exceeding limit=3 on the same route triggers 429 Too Many Requests
    await request(server).get('/m8-test/districts/202').expect(200);
    await request(server).get('/m8-test/districts/202').expect(200);
    await request(server).get('/m8-test/districts/202').expect(200);
    await request(server).get('/m8-test/districts/202').expect(429);

    await app.close();
  });

  it('validates PositiveIntParamSchema and NumericCodeParamSchema via @ZodParam', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [M8TestController],
    }).compile();
    const app = moduleRef.createNestApplication();
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    await app.init();

    const server = app.getHttpServer();
    await request(server).get('/m8-test/districts/202').expect(200);
    await request(server).get('/m8-test/districts/abc').expect(400);
    await request(server).get('/m8-test/deposits/123456').expect(200);
    await request(server).get('/m8-test/deposits/abc-123').expect(400);

    await app.close();
  });

  it('ignores non-HTTP contexts in GlobalHttpExceptionFilter', () => {
    const filter = new GlobalHttpExceptionFilter();
    const switchToHttp = vi.fn();
    const wsHost = {
      getType: () => 'ws',
      switchToHttp,
    } as unknown as ArgumentsHost;

    expect(() => filter.catch(new Error('ws error'), wsHost)).not.toThrow();
    expect(switchToHttp).not.toHaveBeenCalled();
  });

  it('validates CORS origins consistently for HTTP and WebSocket gateways', () => {
    const callback = createCorsOriginCallback(() => ['https://nexus.vercel.app']);

    const allowResult: Array<[Error | null, boolean | undefined]> = [];
    callback('https://nexus.vercel.app', (err, allow) => allowResult.push([err, allow]));
    expect(allowResult[0]).toEqual([null, true]);

    const denyResult: Array<[Error | null, boolean | undefined]> = [];
    callback('https://evil.example.com', (err, allow) => denyResult.push([err, allow]));
    expect(denyResult[0]?.[0]).toBeInstanceOf(Error);
    expect(denyResult[0]?.[1]).toBe(false);
  });

  it('defaults SWAGGER_ENABLED to false in production and true in development/demo', () => {
    const base = {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/nexus',
      JWT_SECRET: 'super-secret-jwt-key-123456',
      REFRESH_TOKEN_SECRET: 'super-secret-refresh-key-123456',
    };
    expect(validateBackendEnv({ ...base, APP_ENV: 'development' }).SWAGGER_ENABLED).toBe(true);
    expect(validateBackendEnv({ ...base, APP_ENV: 'demo' }).SWAGGER_ENABLED).toBe(true);
    expect(
      validateBackendEnv({
        ...base,
        APP_ENV: 'production',
        APP_PUBLIC_URL: 'https://api.nexus.example.com',
        PAYMENT_PROVIDER: 'payos',
        PAYOS_CLIENT_ID: 'client-id',
        PAYOS_API_KEY: 'api-key',
        PAYOS_CHECKSUM_KEY: 'checksum-key',
        SHIPPING_PROVIDER: 'ghn',
        GHN_API_URL: 'https://online-gateway.ghn.vn/shiip/public-api/v2',
        GHN_TOKEN: 'ghn-token',
        GHN_SHOP_ID: '123456',
        GHN_WEBHOOK_SECRET: 'ghn-secret',
        STORAGE_PROVIDER: 'cloudinary',
        CLOUDINARY_CLOUD_NAME: 'cloud',
        CLOUDINARY_API_KEY: 'key',
        CLOUDINARY_API_SECRET: 'secret',
        MAIL_PROVIDER: 'smtp',
        SMTP_HOST: 'smtp.example.com',
        SMTP_USER: 'mailer@example.com',
        SMTP_PASS: 'app-password',
      }).SWAGGER_ENABLED,
    ).toBe(false);
  });
});
