import { Injectable } from '@nestjs/common';
import { OutboxEventStatus, Prisma } from '@prisma/client';

/** The minimum of a Prisma client needed to write an outbox row. */
type OutboxWriter = Pick<Prisma.TransactionClient, 'outboxEvent'>;

/** A side effect to perform once its transaction has committed. */
export interface OutboxEnqueueInput {
  eventName: string;
  payload: Prisma.InputJsonValue;
  /** Hold the row back until this moment; omit to make it available at once. */
  availableAt?: Date;
}

/**
 * Records side effects in the same transaction as the data that caused them.
 *
 * An in-process event emitter drops everything it has not yet delivered when
 * the process dies, which is survivable for a socket push and not survivable
 * for releasing escrow or booking a shipment. A row written inside the business
 * transaction either commits with it or disappears with it, and the worker
 * picks it up afterwards.
 */
@Injectable()
export class OutboxService {
  /**
   * Queues one side effect.
   *
   * Pass the transaction client, not the base client, or the row can commit
   * while the work that justified it rolls back.
   *
   * @param tx - The transaction the causing write belongs to.
   * @param input - What to perform later.
   * @returns The queued row's id.
   */
  async enqueue(tx: OutboxWriter, input: OutboxEnqueueInput): Promise<string> {
    const row = await tx.outboxEvent.create({
      data: {
        eventName: input.eventName,
        payload: input.payload,
        status: OutboxEventStatus.PENDING,
        availableAt: input.availableAt ?? new Date(),
      },
      select: { id: true },
    });
    return row.id;
  }

  /**
   * Queues several side effects at once.
   *
   * @param tx - The transaction the causing write belongs to.
   * @param inputs - What to perform later.
   * @returns How many rows were queued.
   */
  async enqueueMany(tx: OutboxWriter, inputs: OutboxEnqueueInput[]): Promise<number> {
    if (!inputs.length) return 0;
    const result = await tx.outboxEvent.createMany({
      data: inputs.map((input) => ({
        eventName: input.eventName,
        payload: input.payload,
        status: OutboxEventStatus.PENDING,
        availableAt: input.availableAt ?? new Date(),
      })),
    });
    return result.count;
  }
}
