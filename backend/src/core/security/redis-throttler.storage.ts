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

const MEMORY_PRUNE_INTERVAL_MS = 60_000;
const MAX_MEMORY_BUCKETS = 10_000;

const THROTTLE_INCREMENT_SCRIPT = `
local storageKey = KEYS[1]
local blockKey = KEYS[2]
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blockDuration = tonumber(ARGV[3])

local blockedTtl = redis.call('PTTL', blockKey)
if blockedTtl > 0 then
  return { limit + 1, blockedTtl, 1, blockedTtl }
end

local hits = redis.call('INCR', storageKey)
local pttl = redis.call('PTTL', storageKey)
if hits == 1 or pttl < 0 then
  redis.call('PEXPIRE', storageKey, ttl)
  pttl = ttl
end

if hits > limit then
  if blockDuration > 0 then
    redis.call('PSETEX', blockKey, blockDuration, '1')
    return { hits, pttl, 1, blockDuration }
  end
  return { hits, pttl, 1, pttl }
end

return { hits, pttl, 0, 0 }
`;

/**
 * Redis-backed throttler storage with an in-memory fallback when Redis is
 * unreachable or omitted in isolated unit tests.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly memory = new Map<string, MemoryBucket>();
  private lastPrunedAt = 0;

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
      const client = this.redis.getClient() as {
        eval?: (
          script: string,
          numKeys: number,
          ...args: Array<string | number>
        ) => Promise<unknown>;
        pttl: (k: string) => Promise<number>;
        incr: (k: string) => Promise<number>;
        pexpire: (k: string, ms: number) => Promise<number>;
        psetex: (k: string, ms: number, val: string) => Promise<unknown>;
      };

      if (typeof client.eval === 'function') {
        const raw = await client.eval(
          THROTTLE_INCREMENT_SCRIPT,
          2,
          storageKey,
          blockKey,
          ttl,
          limit,
          blockDuration,
        );
        if (Array.isArray(raw) && raw.length >= 4) {
          const hits = Number(raw[0]);
          const pttlMs = Number(raw[1]);
          const blockedFlag = Number(raw[2]);
          const blockTtlMs = Number(raw[3]);
          const timeToExpire = Math.max(1, Math.ceil(pttlMs / 1000));
          const isBlocked = blockedFlag === 1;
          return {
            totalHits: hits,
            timeToExpire,
            isBlocked,
            timeToBlockExpire: isBlocked ? Math.max(1, Math.ceil(blockTtlMs / 1000)) : 0,
          };
        }
      }

      const blockedTtlMs = await client.pttl(blockKey);
      if (blockedTtlMs > 0) {
        const blockSec = Math.max(1, Math.ceil(blockedTtlMs / 1000));
        return {
          totalHits: limit + 1,
          timeToExpire: blockSec,
          isBlocked: true,
          timeToBlockExpire: blockSec,
        };
      }

      const hits = await client.incr(storageKey);
      let pttl = await client.pttl(storageKey);
      if (hits === 1 || pttl < 0) {
        await client.pexpire(storageKey, ttl);
        pttl = ttl;
      }

      const timeToExpire = Math.max(1, Math.ceil(pttl / 1000));
      if (hits > limit) {
        if (blockDuration > 0) {
          await client.psetex(blockKey, blockDuration, '1');
          return {
            totalHits: hits,
            timeToExpire,
            isBlocked: true,
            timeToBlockExpire: Math.max(1, Math.ceil(blockDuration / 1000)),
          };
        }
        return {
          totalHits: hits,
          timeToExpire,
          isBlocked: true,
          timeToBlockExpire: timeToExpire,
        };
      }

      return {
        totalHits: hits,
        timeToExpire,
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    } catch {
      return this.incrementInMemory(storageKey, ttl, limit, blockDuration);
    }
  }

  private pruneExpiredMemoryBuckets(now: number): void {
    this.lastPrunedAt = now;
    for (const [bucketKey, bucket] of this.memory.entries()) {
      if (bucket.expiresAt <= now && bucket.blockedUntil <= now) {
        this.memory.delete(bucketKey);
      }
    }
    while (this.memory.size >= MAX_MEMORY_BUCKETS) {
      const oldestKey = this.memory.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      this.memory.delete(oldestKey);
    }
  }

  private incrementInMemory(
    storageKey: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): ThrottlerRecord {
    const now = Date.now();
    if (
      now - this.lastPrunedAt >= MEMORY_PRUNE_INTERVAL_MS ||
      this.memory.size >= MAX_MEMORY_BUCKETS
    ) {
      this.pruneExpiredMemoryBuckets(now);
    }

    const existing = this.memory.get(storageKey);

    if (existing && existing.blockedUntil > now) {
      const blockSec = Math.max(1, Math.ceil((existing.blockedUntil - now) / 1000));
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
    const isBlocked = bucket.hits > limit || bucket.blockedUntil > now;
    const timeToBlockExpire =
      bucket.blockedUntil > now
        ? Math.max(1, Math.ceil((bucket.blockedUntil - now) / 1000))
        : isBlocked
          ? timeToExpire
          : 0;

    return {
      totalHits: bucket.hits,
      timeToExpire,
      isBlocked,
      timeToBlockExpire,
    };
  }
}
