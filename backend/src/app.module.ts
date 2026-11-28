import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { NextFunction, Request, Response } from 'express';
import { AuditModule } from './core/audit/audit.module';
import {
  getCurrentTraceId,
  resolveHeaderTraceId,
  runWithRequestTrace,
} from './core/audit/request-trace.context';
import { PrismaModule } from './core/prisma/prisma.module';
import { validateBackendEnv } from './core/config/env.schema';
import { RedisModule } from './core/redis/redis.module';
import { RedisService } from './core/redis/redis.service';
import { RedisThrottlerStorage } from './core/security/redis-throttler.storage';
import { SecurityModule } from './core/security/security.module';
import { HealthModule } from './core/health/health.module';
import { EventsModule } from './core/events/events.module';
import { ProvidersModule } from './core/providers/providers.module';
import { SettingsModule } from './core/settings/settings.module';
import { MailModule } from './core/mail/mail.module';
import { StorageModule } from './core/storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AdminModule } from './modules/admin/admin.module';
import { MediaModule } from './modules/media/media.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CartModule } from './modules/cart/cart.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { AfterSalesModule } from './modules/after-sales/after-sales.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { TreasuryModule } from './modules/treasury/treasury.module';
import { OrdersModule } from './modules/orders/orders.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FulfillmentModule } from './modules/fulfillment/fulfillment.module';
import { ChatModule } from './modules/chat/chat.module';
import { AuctionModule } from './modules/auction/auction.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env', '../../.env'],
      validate: validateBackendEnv,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
        const appEnv = config.get<string>('APP_ENV') ?? 'development';
        const level = nodeEnv === 'test' ? 'silent' : appEnv === 'development' ? 'debug' : 'info';
        return {
          pinoHttp: {
            level,
            genReqId: (req: IncomingMessage & { id?: string }, res: ServerResponse) => {
              const id =
                (typeof req.id === 'string' && req.id) ||
                getCurrentTraceId() ||
                resolveHeaderTraceId(req.headers) ||
                randomUUID();
              res.setHeader('X-Request-Id', id);
              return id;
            },
            redact: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.body.password',
              'req.body.currentPassword',
              'req.body.newPassword',
              'req.body.refreshToken',
              'req.body.code',
              'req.body.otp',
              'res.headers["set-cookie"]',
            ],
            autoLogging: nodeEnv !== 'test',
          },
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [ConfigService, RedisService],
      useFactory: (config: ConfigService, redis: RedisService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: 60_000,
            limit: 120,
          },
        ],
        skipIf: () =>
          (config.get<string>('NODE_ENV') ?? process.env.NODE_ENV) === 'test' &&
          process.env.THROTTLE_ENABLE_IN_TEST !== 'true',
        storage: new RedisThrottlerStorage(redis),
      }),
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
    }),
    PrismaModule,
    AuditModule,
    RedisModule,
    SecurityModule,
    HealthModule,
    EventsModule,
    ProvidersModule,
    SettingsModule,
    MailModule,
    StorageModule,
    AuthModule,
    UsersModule,
    AdminModule,
    MediaModule,
    CatalogModule,
    CartModule,
    ReviewsModule,
    AfterSalesModule,
    TreasuryModule,
    OrdersModule,
    PaymentsModule,
    WalletModule,
    NotificationsModule,
    FulfillmentModule,
    ChatModule,
    AuctionModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply((req: Request & { id?: string }, res: Response, next: NextFunction) => {
        const traceId =
          (typeof req.id === 'string' && req.id) ||
          resolveHeaderTraceId(req.headers) ||
          randomUUID();
        req.id = traceId;
        res.setHeader('X-Request-Id', traceId);
        runWithRequestTrace(traceId, () => next());
      })
      .forRoutes('*');
  }
}
