import type { EventEmitter2 } from '@nestjs/event-emitter';
import { AsyncLocalStorage } from 'node:async_hooks';
import { DOMAIN_EVENTS, type NotificationCreatedEvent } from '../events/domain-events.service';

export const txNotificationStorage = new AsyncLocalStorage<NotificationCreatedEvent[]>();

/**
 * Buffers realtime notification events created during an interactive
 * transaction and publishes them only after the transaction resolves cleanly.
 */
export async function runWithNotificationBatch<T>(
  emitter: EventEmitter2,
  fn: () => Promise<T>,
): Promise<T> {
  const batch: NotificationCreatedEvent[] = [];
  const result = await txNotificationStorage.run(batch, fn);
  if (batch.length > 0) {
    emitter.emit(DOMAIN_EVENTS.NOTIFICATIONS_CREATED, batch);
  }
  return result;
}
