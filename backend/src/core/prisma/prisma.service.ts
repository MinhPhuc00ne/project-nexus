import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { DOMAIN_EVENTS, type NotificationCreatedEvent } from '../events/domain-events.service';

/** The columns a realtime notification push needs from a created row. */
interface NotificationCreateInputRow {
  id?: string;
  userId?: string;
  title?: string;
  content?: string;
  type?: string;
  channel?: string;
  isRead?: boolean;
  readAt?: Date | string | null;
  createdAt?: Date | string;
  auctionId?: string | null;
  targetUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** What a wrapped delegate reports: deliverable events, and rows it could not address. */
export interface CapturedNotifications {
  events: NotificationCreatedEvent[];
  unaddressed: number;
}

/**
 * Builds the realtime event for a created notification.
 *
 * @param row - The created row, or the data it was created from.
 * @returns The event, or null when the row names no recipient.
 */
function toRealtimeEvent(row: NotificationCreateInputRow): NotificationCreatedEvent | null {
  if (typeof row.userId !== 'string' || row.userId.length === 0) return null;

  return {
    id: row.id ?? randomUUID(),
    userId: row.userId,
    title: row.title ?? '',
    content: row.content ?? '',
    type: row.type ?? 'SYSTEM',
    channel: row.channel ?? 'IN_APP',
    isRead: row.isRead ?? false,
    readAt: row.readAt ?? null,
    createdAt: row.createdAt ?? new Date(),
    auctionId: row.auctionId ?? null,
    targetUrl: row.targetUrl ?? null,
    metadata: row.metadata ?? null,
  };
}

/**
 * Wraps the notification delegate so every created row is reported for a
 * realtime push.
 *
 * Sixty-six call sites across every domain write notifications directly, so
 * capturing them here is what keeps realtime delivery working without each of
 * those sites publishing by hand. Converting them to publish explicitly, and
 * retiring this wrapper, belongs with the module split that rewrites those
 * files.
 *
 * @param delegate - The real Prisma notification delegate.
 * @param onCaptured - Receives the captured rows; the caller decides when to
 *   publish, which for a transaction must be after the commit.
 * @returns A delegate that behaves identically and reports what it created.
 */
export function wrapNotificationDelegate<TDelegate extends object>(
  delegate: TDelegate,
  onCaptured: (captured: CapturedNotifications) => void,
): TDelegate {
  const report = (rows: NotificationCreateInputRow[]): void => {
    const events: NotificationCreatedEvent[] = [];
    let unaddressed = 0;
    for (const row of rows) {
      const event = toRealtimeEvent(row);
      if (event) events.push(event);
      else unaddressed += 1;
    }
    if (events.length || unaddressed) onCaptured({ events, unaddressed });
  };

  return new Proxy(delegate, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver) as unknown;

      if (prop === 'create' && typeof value === 'function') {
        return async (args: { data: NotificationCreateInputRow; [key: string]: unknown }) => {
          const created = (await (value as (...a: unknown[]) => Promise<unknown>).apply(target, [
            args,
          ])) as NotificationCreateInputRow;
          // Prefer the returned row, but fall back to the input when a `select`
          // left the recipient out of the result.
          report([{ ...args?.data, ...created }]);
          return created;
        };
      }

      if (prop === 'createMany' || prop === 'createManyAndReturn') {
        if (typeof value !== 'function') return value;
        return async (args: {
          data: NotificationCreateInputRow | NotificationCreateInputRow[];
          [key: string]: unknown;
        }) => {
          const rows = Array.isArray(args?.data) ? args.data : args?.data ? [args.data] : [];
          // Ids and timestamps are assigned up front so the realtime event and
          // the stored row describe the same notification.
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
          report(Array.isArray(result) && result.length > 0 ? result : enriched);
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
  private readonly pool: Pool;
  private readonly wrappedNotificationDelegate: Prisma.NotificationDelegate | null = null;

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

    const baseNotification = this.notification;
    if (baseNotification) {
      // Writes outside a transaction are already durable when they return, so
      // they publish immediately.
      this.wrappedNotificationDelegate = wrapNotificationDelegate(baseNotification, (captured) =>
        this.publish(captured),
      );
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

    const pending: CapturedNotifications = { events: [], unaddressed: 0 };
    const callback = arg as (tx: Prisma.TransactionClient) => Promise<unknown>;

    const result = await super.$transaction(
      async (tx) => {
        const txProxy = new Proxy(tx, {
          get(target, prop, receiver) {
            if (prop === 'notification') {
              return wrapNotificationDelegate(target.notification, (captured) => {
                pending.events.push(...captured.events);
                pending.unaddressed += captured.unaddressed;
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

    // Only a committed notification is announced: a push for a row that rolled
    // back would show the recipient something that does not exist.
    this.publish(pending);
    return result;
  }

  /** Emits captured notifications and reports any that named no recipient. */
  private publish(captured: CapturedNotifications): void {
    if (captured.unaddressed > 0) {
      // The previous implementation pushed these with `userId: undefined`, so
      // they reached nobody and said nothing about it.
      this.logger.warn(
        `Skipped ${captured.unaddressed} realtime notification push(es) with no recipient id; ` +
          'include userId when creating notifications.',
      );
    }
    if (captured.events.length > 0) {
      this.emitter.emit(DOMAIN_EVENTS.NOTIFICATIONS_CREATED, captured.events);
    }
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
