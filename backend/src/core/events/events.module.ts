import { Global, Module } from '@nestjs/common';
import { OutboxService } from '../outbox/outbox.service';
import { OutboxWorker } from '../outbox/outbox.worker';
import { DomainEventsService } from './domain-events.service';

/**
 * Owns both ways the platform reacts to its own writes.
 *
 * `DomainEventsService` carries best-effort, in-process events such as a socket
 * push. `OutboxService` plus `OutboxWorker` carry the ones that must survive a
 * crash, because they move money or goods.
 */
@Global()
@Module({
  providers: [DomainEventsService, OutboxService, OutboxWorker],
  exports: [DomainEventsService, OutboxService, OutboxWorker],
})
export class EventsModule {}
