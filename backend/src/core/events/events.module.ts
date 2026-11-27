import { Global, Module } from '@nestjs/common';
import { DomainEventsService } from './domain-events.service';

/**
 * Owns best-effort in-process domain event pub/sub across modules.
 */
@Global()
@Module({
  providers: [DomainEventsService],
  exports: [DomainEventsService],
})
export class EventsModule {}
