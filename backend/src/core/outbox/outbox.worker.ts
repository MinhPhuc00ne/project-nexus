import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxEventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Handles one kind of queued side effect. */
export type OutboxHandler = (payload: Prisma.JsonValue, eventId: string) => Promise<void>;

/** How often the worker looks for new rows. */
const POLL_INTERVAL_MS = 2000;

/** How many rows one pass claims. */
const BATCH_SIZE = 20;

/** How many times a row is retried before it is parked as FAILED. */
const MAX_ATTEMPTS = 5;

/** Backoff before a failed row becomes available again. */
function retryDelayMs(attempts: number): number {
  return Math.min(60_000, 1000 * 2 ** attempts);
}

interface ClaimedRow {
  id: string;
  event_name: string;
  payload: Prisma.JsonValue;
  attempts: number;
}

/**
 * Delivers queued side effects, one process-safe batch at a time.
 *
 * Rows are claimed with `FOR UPDATE SKIP LOCKED`, so several instances can run
 * the worker without two of them performing the same side effect. A row that
 * throws is retried with backoff and parked as FAILED after five attempts,
 * where the health endpoint's pending count makes the backlog visible instead
 * of it being silently dropped.
 */
@Injectable()
export class OutboxWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorker.name);
  private readonly handlers = new Map<string, OutboxHandler>();
  private timer?: NodeJS.Timeout;
  private draining = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Registers the handler for one event name, replacing any earlier one.
   *
   * @param eventName - The queued event this handler performs.
   * @param handler - The side effect.
   * @returns Completion.
   */
  register(eventName: string, handler: OutboxHandler): void {
    this.handlers.set(eventName, handler);
  }

  onModuleInit(): void {
    // Tests boot the application repeatedly and assert on exact queries; a timer
    // firing underneath them would make those runs non-deterministic.
    if (this.configService.get<string>('NODE_ENV') === 'test') {
      this.logger.log('Outbox worker idle: NODE_ENV=test');
      return;
    }
    this.timer = setInterval(() => void this.drain(), POLL_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Claims and performs one batch of due side effects.
   *
   * @returns How many rows were processed.
   */
  async drain(): Promise<number> {
    if (this.draining) return 0;
    this.draining = true;
    try {
      const rows = await this.claimBatch();
      for (const row of rows) {
        await this.perform(row);
      }
      return rows.length;
    } catch (error) {
      this.logger.error(
        `Outbox drain failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return 0;
    } finally {
      this.draining = false;
    }
  }

  /**
   * Takes ownership of up to BATCH_SIZE due rows.
   *
   * The claim and the status change happen in one statement, so a row is either
   * ours or somebody else's, never both.
   */
  private async claimBatch(): Promise<ClaimedRow[]> {
    return this.prisma.$queryRaw<ClaimedRow[]>(Prisma.sql`
      WITH due AS (
        SELECT "id"
        FROM "outbox_events"
        WHERE "status" = ${OutboxEventStatus.PENDING}::"OutboxEventStatus"
          AND "available_at" <= NOW()
        ORDER BY "available_at" ASC, "created_at" ASC
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "outbox_events" AS o
      SET "status" = ${OutboxEventStatus.PROCESSING}::"OutboxEventStatus",
          "updated_at" = NOW()
      FROM due
      WHERE o."id" = due."id"
      RETURNING o."id", o."event_name", o."payload", o."attempts"
    `);
  }

  private async perform(row: ClaimedRow): Promise<void> {
    const handler = this.handlers.get(row.event_name);
    if (!handler) {
      // An unknown event name means a handler was removed while rows were still
      // queued. Parking it keeps the payload for inspection.
      await this.park(row, `no handler registered for "${row.event_name}"`);
      return;
    }

    try {
      await handler(row.payload, row.id);
      await this.prisma.outboxEvent.update({
        where: { id: row.id },
        data: {
          status: OutboxEventStatus.PROCESSED,
          processedAt: new Date(),
          attempts: { increment: 1 },
          lastError: null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      const attempts = row.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await this.park(row, message);
        return;
      }
      await this.prisma.outboxEvent.update({
        where: { id: row.id },
        data: {
          status: OutboxEventStatus.PENDING,
          attempts,
          lastError: message,
          availableAt: new Date(Date.now() + retryDelayMs(attempts)),
        },
      });
      this.logger.warn(
        `Outbox ${row.event_name} (${row.id}) attempt ${attempts} failed: ${message}`,
      );
    }
  }

  private async park(row: ClaimedRow, reason: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id: row.id },
      data: {
        status: OutboxEventStatus.FAILED,
        attempts: { increment: 1 },
        lastError: reason,
      },
    });
    this.logger.error(`Outbox ${row.event_name} (${row.id}) parked as FAILED: ${reason}`);
  }
}
