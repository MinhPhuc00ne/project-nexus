import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import {
  publishCreatedNotifications,
  type RealtimeNotificationRecord,
} from '../notifications/notification-realtime.bus';

interface NotificationCreateInputRow {
  id?: string;
  userId: string;
  title: string;
  content: string;
  type?: string;
  channel?: string;
  isRead?: boolean;
  readAt?: Date | string | null;
  createdAt?: Date | string;
  auctionId?: string | null;
  targetUrl?: string | null;
}

function toRealtimeRecord(row: NotificationCreateInputRow): RealtimeNotificationRecord {
  return {
    id: row.id ?? randomUUID(),
    userId: row.userId,
    title: row.title,
    content: row.content,
    type: row.type ?? 'SYSTEM',
    channel: row.channel ?? 'IN_APP',
    isRead: row.isRead ?? false,
    readAt: row.readAt ?? null,
    createdAt: row.createdAt ?? new Date(),
    auctionId: row.auctionId ?? null,
    targetUrl: row.targetUrl ?? null,
  };
}

export function wrapNotificationDelegate<TDelegate extends object>(
  delegate: TDelegate,
  onEmitted: (records: RealtimeNotificationRecord[]) => void,
): TDelegate {
  return new Proxy(delegate, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver) as unknown;

      if (prop === 'create' && typeof value === 'function') {
        return async (args: { data: NotificationCreateInputRow; [key: string]: unknown }) => {
          const created = (await (
            value as (...a: unknown[]) => Promise<RealtimeNotificationRecord>
          ).apply(target, [args])) as RealtimeNotificationRecord;
          if (created && typeof created.userId === 'string') {
            onEmitted([toRealtimeRecord(created)]);
          }
          return created;
        };
      }

      if (prop === 'createMany' && typeof value === 'function') {
        return async (args: {
          data: NotificationCreateInputRow | NotificationCreateInputRow[];
          [key: string]: unknown;
        }) => {
          const rows = Array.isArray(args?.data) ? args.data : args?.data ? [args.data] : [];
          const enriched = rows.map((row) => ({
            ...row,
            id: row.id ?? randomUUID(),
            createdAt: row.createdAt ?? new Date(),
          }));
          const nextArgs = Array.isArray(args?.data)
            ? { ...args, data: enriched }
            : { ...args, data: enriched[0] };
          const result = await (value as (...a: unknown[]) => Promise<unknown>).apply(target, [
            nextArgs,
          ]);
          if (enriched.length > 0) {
            onEmitted(enriched.map(toRealtimeRecord));
          }
          return result;
        };
      }

      if (prop === 'createManyAndReturn' && typeof value === 'function') {
        return async (args: {
          data: NotificationCreateInputRow | NotificationCreateInputRow[];
          [key: string]: unknown;
        }) => {
          const rows = Array.isArray(args?.data) ? args.data : args?.data ? [args.data] : [];
          const enriched = rows.map((row) => ({
            ...row,
            id: row.id ?? randomUUID(),
            createdAt: row.createdAt ?? new Date(),
          }));
          const nextArgs = Array.isArray(args?.data)
            ? { ...args, data: enriched }
            : { ...args, data: enriched[0] };
          const result = (await (value as (...a: unknown[]) => Promise<unknown>).apply(target, [
            nextArgs,
          ])) as NotificationCreateInputRow[];
          if (Array.isArray(result) && result.length > 0) {
            onEmitted(result.map(toRealtimeRecord));
          } else if (enriched.length > 0) {
            onEmitted(enriched.map(toRealtimeRecord));
          }
          return result;
        };
      }

      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private pool: Pool;
  private wrappedNotificationDelegate: Prisma.NotificationDelegate | null = null;

  constructor(private readonly configService: ConfigService) {
    const connectionString =
      configService.get<string>('DATABASE_URL') ||
      'postgresql://postgres:nexus_secret_2026@localhost:5432/nexus_main?schema=public';

    const pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;

    // Bọc delegate notification trực tiếp (ngoài transaction) để tự phát sự kiện real-time
    const baseNotification = this.notification;
    if (baseNotification) {
      this.wrappedNotificationDelegate = wrapNotificationDelegate(baseNotification, (records) => {
        publishCreatedNotifications(records);
      });
      Object.defineProperty(this, 'notification', {
        get: () => this.wrappedNotificationDelegate ?? baseNotification,
        configurable: true,
        enumerable: true,
      });
    }
  }

  override get notification(): Prisma.NotificationDelegate {
    return (
      this.wrappedNotificationDelegate ??
      (super.notification as unknown as Prisma.NotificationDelegate)
    );
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

    const pendingNotifications: RealtimeNotificationRecord[] = [];
    const callback = arg as (tx: Prisma.TransactionClient) => Promise<unknown>;

    const result = await super.$transaction(
      async (tx) => {
        const txProxy = new Proxy(tx, {
          get(target, prop, receiver) {
            if (prop === 'notification') {
              return wrapNotificationDelegate(target.notification, (records) => {
                pendingNotifications.push(...records);
              });
            }
            const value = Reflect.get(target, prop, receiver) as unknown;
            return typeof value === 'function' ? value.bind(target) : value;
          },
        });
        return callback(txProxy);
      },
      options as {
        maxWait?: number;
        timeout?: number;
        isolationLevel?: Prisma.TransactionIsolationLevel;
      },
    );

    // Chỉ phát WebSocket sau khi PostgreSQL commit transaction thành công
    if (pendingNotifications.length > 0) {
      publishCreatedNotifications(pendingNotifications);
    }

    return result;
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
