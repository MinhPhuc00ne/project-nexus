import { Controller, Get, HttpStatus, Res, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  HealthCheckSchema,
  LivenessHealthSchema,
  ReadinessHealthSchema,
  type HealthCheck,
  type LivenessHealth,
  type ReadinessHealth,
} from '@nexus/contracts';
import type { Response } from 'express';
import { Public } from '../security/roles.decorator';
import { HealthService } from './health.service';

@ApiTags('0. HEALTH')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Check system health',
    description:
      'Returns live health diagnostics for PostgreSQL, Redis, active Socket.IO client counts, and process uptime.',
  })
  @ApiOkResponse({ standardSchema: HealthCheckSchema })
  @ApiServiceUnavailableResponse({
    description: 'One or more required dependencies (PostgreSQL or Redis) are unavailable.',
  })
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthCheck> {
    const result = await this.health.check();
    res.status(result.status === 'down' ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK);
    return result;
  }

  @Get('live')
  @Public()
  @ApiOperation({
    summary: 'Process liveness probe',
    description: 'Zero-I/O liveness check returning 200 OK while the Node.js event loop is active.',
  })
  @ApiOkResponse({ standardSchema: LivenessHealthSchema })
  live(): LivenessHealth {
    return this.health.liveness();
  }

  @Get('ready')
  @Public()
  @ApiOperation({
    summary: 'Service readiness probe',
    description:
      'Probes PostgreSQL and Redis connectivity and returns 200 OK when both are ready, or 503 Service Unavailable when either dependency is down.',
  })
  @ApiOkResponse({ standardSchema: ReadinessHealthSchema })
  @ApiServiceUnavailableResponse({
    description: 'PostgreSQL or Redis is down and the service is not ready for traffic.',
  })
  async ready(): Promise<ReadinessHealth> {
    const result = await this.health.readiness();
    if (result.status === 'down' || result.db.status === 'down' || result.redis.status === 'down') {
      throw new ServiceUnavailableException({
        error: 'SERVICE_UNAVAILABLE',
        message: 'Service dependencies are not ready',
        status: 'down',
        db: result.db,
        redis: result.redis,
        uptimeSeconds: result.uptimeSeconds,
        timestamp: result.timestamp,
      });
    }
    return result;
  }
}
