import { Injectable } from '@nestjs/common';
import type {
  DependencyHealth,
  HealthCheck,
  HealthStatus,
  LivenessHealth,
  ReadinessHealth,
} from '@nexus/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SocketMetricsService } from '../realtime/socket-metrics.service';

/** Beyond this, a dependency still answers but is not healthy. */
const SLOW_DEPENDENCY_MS = 500;

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly socketMetrics: SocketMetricsService,
  ) {}

  /**
   * Probes every dependency the platform needs to serve traffic.
   *
   * @returns The health of PostgreSQL, Redis, and realtime namespaces, plus an
   *   overall status derived from them.
   */
  async check(): Promise<HealthCheck> {
    const [db, redis] = await Promise.all([this.probeDatabase(), this.probeRedis()]);

    return {
      status: worstOf([db.status, redis.status]),
      db,
      redis,
      sockets: { connectedClients: this.socketMetrics.connectedClients() },
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reports zero-I/O process liveness when the Node.js event loop is responsive.
   */
  liveness(): LivenessHealth {
    return {
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Probes PostgreSQL and Redis to determine whether the instance can serve traffic.
   */
  async readiness(): Promise<ReadinessHealth> {
    const [db, redis] = await Promise.all([this.probeDatabase(), this.probeRedis()]);
    return {
      status: worstOf([db.status, redis.status]),
      db,
      redis,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  private async probeDatabase(): Promise<DependencyHealth> {
    return timed(async () => {
      await this.prisma.$queryRaw`SELECT 1`;
    });
  }

  private async probeRedis(): Promise<DependencyHealth> {
    return timed(async () => {
      const reply = await this.redis.ping();
      if (reply !== 'PONG') {
        throw new Error(`unexpected PING reply: ${reply}`);
      }
    });
  }
}

/** Runs a probe, reporting how long it took and why it failed. */
async function timed(probe: () => Promise<void>): Promise<DependencyHealth> {
  const startedAt = Date.now();
  try {
    await probe();
    const latencyMs = Date.now() - startedAt;
    return {
      status: latencyMs > SLOW_DEPENDENCY_MS ? 'degraded' : 'ok',
      latencyMs,
    };
  } catch (error) {
    return {
      status: 'down',
      latencyMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : 'probe failed',
    };
  }
}

/** The overall status is the worst any single dependency reports. */
function worstOf(statuses: HealthStatus[]): HealthStatus {
  if (statuses.includes('down')) return 'down';
  if (statuses.includes('degraded')) return 'degraded';
  return 'ok';
}
