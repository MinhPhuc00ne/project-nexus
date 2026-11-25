import { Global, Module } from '@nestjs/common';
import { SocketMetricsService } from '../realtime/socket-metrics.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/**
 * Serves `GET /api/v1/health` and owns the realtime client counter the
 * gateways report into.
 *
 * It is global so the gateways can register their namespace counts without the
 * health check having to import three domain modules.
 */
@Global()
@Module({
  controllers: [HealthController],
  providers: [HealthService, SocketMetricsService],
  exports: [SocketMetricsService],
})
export class HealthModule {}
