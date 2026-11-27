import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from '../redis/redis.service';

interface ThrottlerRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

interface MemoryBucket {
  hits: number;
  expiresAt: number;
  blockedUntil: number;
}

/**
 * Redis-backed throttler storage with an in-memory fallback when Redis is
 * unreachable or omitted in isolated unit tests.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly memory = new Map<string, MemoryBucket>();

  constructor(private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerRecord> {
    const storageKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `${storageKey}:blocked`;

    try {
      const client = this.redis.getClient();
      const blockedTtlMs = await client.pttl(blockKey);
      if (blockedTtlMs > 0) {
        return {
          totalHits: limit + 1,
          timeToExpire: Math.ceil(blockedTtlMs / 1000),
          isBlocked: true,
          timeToBlockExpire: Math.ceil(blockedTtlMs / 1000),
        };
      }

      const hits = await client.incr(storageKey);
      let pttl = await client.pttl(storageKey);
      if (hits === 1 || pttl < 0) {
        await client.pexpire(storageKey, ttl);
        pttl = ttl;
      }

      if (hits > limit && blockDuration > 0) {
        await client.psetex(blockKey, blockDuration, '1');
        return {
          totalHits: hits,
          timeToExpire: Math.ceil(pttl / 1000),
          isBlocked: true,
          timeToBlockExpire: Math.ceil(blockDuration / 1000),
        };
      }

      return {
        totalHits: hits,
        timeToExpire: Math.max(1, Math.ceil(pttl / 1000)),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    } catch {
      return this.incrementInMemory(storageKey, ttl, limit, blockDuration);
    }
  }

  private incrementInMemory(
    storageKey: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): ThrottlerRecord {
    const now = Date.now();
    const existing = this.memory.get(storageKey);

    if (existing && existing.blockedUntil > now) {
      const blockSec = Math.ceil((existing.blockedUntil - now) / 1000);
      return {
        totalHits: limit + 1,
        timeToExpire: blockSec,
        isBlocked: true,
        timeToBlockExpire: blockSec,
      };
    }

    const bucket: MemoryBucket =
      !existing || existing.expiresAt <= now
        ? { hits: 0, expiresAt: now + ttl, blockedUntil: 0 }
        : existing;

    bucket.hits += 1;
    if (bucket.hits > limit && blockDuration > 0) {
      bucket.blockedUntil = now + blockDuration;
    }
    this.memory.set(storageKey, bucket);

    const timeToExpire = Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000));
    const isBlocked = bucket.blockedUntil > now;
    const timeToBlockExpire = isBlocked ? Math.ceil((bucket.blockedUntil - now) / 1000) : 0;

    return {
      totalHits: bucket.hits,
      timeToExpire,
      isBlocked,
      timeToBlockExpire,
    };
  }
}
