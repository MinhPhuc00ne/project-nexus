import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis, type RedisOptions } from 'ioredis';

export interface ResolvedRedisConfig {
  url?: string;
  options: RedisOptions;
  displayTarget: string;
}

export function resolveRedisConfig(
  redisUrl: string | undefined,
  host: string,
  port: number,
  password: string | undefined,
): ResolvedRedisConfig {
  const baseOptions: RedisOptions = {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
  };

  const trimmedUrl = redisUrl?.trim();
  if (trimmedUrl) {
    const isTls = trimmedUrl.toLowerCase().startsWith('rediss://');
    let displayTarget = 'REDIS_URL';
    try {
      const parsed = new URL(trimmedUrl);
      const resolvedPort = parsed.port || '6379';
      displayTarget = `${parsed.protocol}//${parsed.hostname}:${resolvedPort}`;
    } catch {
      displayTarget = isTls ? 'rediss://<configured>' : 'redis://<configured>';
    }

    return {
      url: trimmedUrl,
      options: {
        ...baseOptions,
        ...(isTls ? { tls: {} } : {}),
      },
      displayTarget,
    };
  }

  return {
    options: {
      ...baseOptions,
      host,
      port,
      password: password || undefined,
    },
    displayTarget: `${host}:${port}`,
  };
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD');

    const resolved = resolveRedisConfig(redisUrl, host, port, password);
    this.client = resolved.url
      ? new Redis(resolved.url, resolved.options)
      : new Redis(resolved.options);

    this.client
      .connect()
      .then(() => {
        this.logger.log(`Connected to Redis at ${resolved.displayTarget}`);
      })
      .catch((err: unknown) => {
        this.logger.warn(
          `Redis connection failed at ${resolved.displayTarget}: ${(err as Error).message}`,
        );
      });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async getDel(key: string): Promise<string | null> {
    return this.client.getdel(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<string | null> {
    if (ttlSeconds) {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }
    return this.client.set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }
}
