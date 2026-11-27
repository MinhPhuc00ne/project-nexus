import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { runWithNotificationBatch } from '../notifications/notification-batch.context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;

  constructor(
    configService: ConfigService,
    private readonly emitter: EventEmitter2,
  ) {
    const connectionString = configService.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new Error('DATABASE_URL is required');
    }

    const pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    super({ adapter: new PrismaPg(pool) });
    this.pool = pool;
  }

  override $transaction<R>(
    fn: (prisma: Prisma.TransactionClient) => Promise<R>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    },
  ): Promise<R>;
  override $transaction<P extends Prisma.PrismaPromise<unknown>[]>(
    arg: [...P],
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
  ): Promise<{ [K in keyof P]: Awaited<P[K]> }>;
  override async $transaction(arg: unknown, options?: unknown): Promise<unknown> {
    if (typeof arg !== 'function') {
      return super.$transaction(
        arg as Prisma.PrismaPromise<unknown>[],
        options as { isolationLevel?: Prisma.TransactionIsolationLevel },
      );
    }

    const callback = arg as (tx: Prisma.TransactionClient) => Promise<unknown>;
    return runWithNotificationBatch(this.emitter, () =>
      super.$transaction(
        callback,
        options as {
          maxWait?: number;
          timeout?: number;
          isolationLevel?: Prisma.TransactionIsolationLevel;
        },
      ),
    );
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Prisma Client connected successfully via PrismaPg adapter');
    } catch (error) {
      this.logger.error('Failed to connect Prisma Client to database', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
    this.logger.log('Prisma Client and PG pool disconnected');
  }
}
