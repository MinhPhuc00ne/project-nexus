import { Injectable, Logger, Optional } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { Notification, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { DOMAIN_EVENTS, type NotificationCreatedEvent } from '../events/domain-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { runWithNotificationBatch, txNotificationStorage } from './notification-batch.context';

export { runWithNotificationBatch };

export interface NotificationWriteClient {
  notification?: {
    create?: (args: { data: Prisma.NotificationUncheckedCreateInput }) => Promise<Notification>;
    createMany?: (args: {
      data: Prisma.NotificationUncheckedCreateInput[];
    }) => Promise<{ count: number } | unknown>;
  };
}

export interface NotificationCreateRow {
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

const logger = new Logger('NotificationPublisher');

function toRealtimeEvent(row: NotificationCreateRow): NotificationCreatedEvent | null {
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

function recordOrEmit(rows: NotificationCreateRow[], emitter?: EventEmitter2): void {
  const events: NotificationCreatedEvent[] = [];
  let unaddressed = 0;

  for (const row of rows) {
    const event = toRealtimeEvent(row);
    if (event) events.push(event);
    else unaddressed += 1;
  }

  if (unaddressed > 0) {
    logger.warn(
      `Skipped ${unaddressed} realtime notification push(es) with no recipient id; include userId when creating notifications.`,
    );
  }

  if (events.length === 0) return;

  const activeBatch = txNotificationStorage.getStore();
  if (activeBatch) {
    activeBatch.push(...events);
    return;
  }

  if (!emitter) {
    logger.warn(
      `Dropped ${events.length} realtime notification event(s) because EventEmitter2 is unavailable outside a transaction.`,
    );
    return;
  }

  emitter.emit(DOMAIN_EVENTS.NOTIFICATIONS_CREATED, events);
}

/**
 * Explicit notification persistence and post-commit realtime publisher.
 */
@Injectable()
export class NotificationPublisher {
  constructor(
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly emitter?: EventEmitter2,
  ) {}

  async create(
    data: Prisma.NotificationUncheckedCreateInput,
    client?: NotificationWriteClient,
  ): Promise<Notification> {
    const target = client ?? this.prisma;
    if (!target?.notification?.create) {
      throw new Error('NotificationPublisher requires a Prisma notification.create delegate');
    }
    const created = await target.notification.create({ data });
    recordOrEmit(
      [
        {
          ...(data as unknown as NotificationCreateRow),
          ...(created as unknown as NotificationCreateRow),
        },
      ],
      this.emitter,
    );
    return created;
  }

  async createMany(
    rows: Prisma.NotificationUncheckedCreateInput[],
    client?: NotificationWriteClient,
  ): Promise<number> {
    if (!rows.length) return 0;
    const target = client ?? this.prisma;
    if (!target?.notification?.createMany) {
      throw new Error('NotificationPublisher requires a Prisma notification.createMany delegate');
    }
    const result = (await target.notification.createMany({ data: rows })) as { count?: number };
    const enriched = rows.map((row) => ({
      ...row,
      id: row.id ?? randomUUID(),
      createdAt: row.createdAt ?? new Date(),
    }));
    recordOrEmit(enriched as unknown as NotificationCreateRow[], this.emitter);
    return result?.count ?? enriched.length;
  }
}

/**
 * Helper allowing services with an optional NotificationPublisher (e.g. in legacy
 * positional-constructor unit tests) to persist and emit notifications cleanly.
 */
export async function publishNotification(
  client: NotificationWriteClient,
  data: Prisma.NotificationUncheckedCreateInput,
  publisher?: NotificationPublisher,
): Promise<Notification | undefined> {
  if (publisher) {
    return publisher.create(data, client);
  }
  if (typeof client?.notification?.create !== 'function') {
    return undefined;
  }
  const created = await client.notification.create({ data });
  recordOrEmit([
    {
      ...(data as unknown as NotificationCreateRow),
      ...(created as unknown as NotificationCreateRow),
    },
  ]);
  return created;
}

/**
 * Helper allowing batch notification creation with an optional NotificationPublisher.
 */
export async function publishNotifications(
  client: NotificationWriteClient,
  rows: Prisma.NotificationUncheckedCreateInput[],
  publisher?: NotificationPublisher,
): Promise<number> {
  if (!rows.length) return 0;
  if (publisher) {
    return publisher.createMany(rows, client);
  }
  if (typeof client?.notification?.createMany !== 'function') {
    return 0;
  }
  const result = (await client.notification.createMany({ data: rows })) as { count?: number };
  const enriched = rows.map((row) => ({
    ...row,
    id: row.id ?? randomUUID(),
    createdAt: row.createdAt ?? new Date(),
  }));
  recordOrEmit(enriched as unknown as NotificationCreateRow[]);
  return result?.count ?? enriched.length;
}
