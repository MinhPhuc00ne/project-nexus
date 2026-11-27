import { Global, Module } from '@nestjs/common';
import { NotificationPublisher } from '../notifications/notification-publisher.service';
import { DomainEventsService } from './domain-events.service';

/**
 * Owns in-process best-effort domain events and explicit notification publishing.
 */
@Global()
@Module({
  providers: [DomainEventsService, NotificationPublisher],
  exports: [DomainEventsService, NotificationPublisher],
})
export class EventsModule {}
