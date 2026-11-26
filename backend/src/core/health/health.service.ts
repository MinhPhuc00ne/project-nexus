import { Injectable } from '@nestjs/common';
import type { DependencyHealth, HealthCheck, HealthStatus } from '@nexus/contracts';
import { OutboxEventStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SocketMetricsService } from '../realtime/socket-metrics.service';

/** Beyond this, a dependency still answers but is not healthy. */
const SLOW_DEPENDENCY_MS = 500;

/** Beyond this many undelivered rows, the outbox worker is not keeping up. */
const OUTBOX_BACKLOG_THRESHOLD = 100;

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
   * @returns The health of PostgreSQL, Redis, the realtime namespaces and the
   *   outbox backlog, plus an overall status derived from them.
   */
  async check(): Promise<HealthCheck> {
    const [db, redis] = await Promise.all([this.probeDatabase(), this.probeRedis()]);
    const pendingCount = await this.countPendingOutbox();

    const statuses: HealthStatus[] = [db.status, redis.status];
    if (pendingCount > OUTBOX_BACKLOG_THRESHOLD) statuses.push('degraded');

    return {
      status: worstOf(statuses),
      db,
      redis,
      sockets: { connectedClients: this.socketMetrics.connectedClients() },
      outbox: { pendingCount },
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

  /**
   * Counts outbox rows still waiting for delivery.
   *
   * A backlog means financial and fulfillment side effects are committed but
   * not yet acted on, so it is reported rather than hidden.
   */
  private async countPendingOutbox(): Promise<number> {
    try {
      return await this.prisma.outboxEvent.count({
        where: { status: { in: [OutboxEventStatus.PENDING, OutboxEventStatus.PROCESSING] } },
      });
    } catch {
      // The database probe already reports the connection itself; a failure
      // here must not turn the whole response into an error.
      return 0;
    }
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
