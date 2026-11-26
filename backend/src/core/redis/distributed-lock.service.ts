import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RedisService } from './redis.service';

/**
 * Releases a lock only if this holder still owns it.
 *
 * A plain DEL would let a holder whose lease had already expired delete a lock
 * another instance has since taken.
 */
const RELEASE_SCRIPT = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
else
  return 0
end
`;

/**
 * A lease on work that must happen once across the whole cluster.
 *
 * Background sweeps ran on a timer in every process, so two instances would
 * both close the same auction lot, both forfeit the same deposit and both
 * notify the same bidder. A lease means exactly one instance does the work and
 * the others skip that round.
 *
 * The lease expires on its own, so an instance that dies mid-sweep does not
 * block the next one. That makes it an optimisation, not a guarantee: the work
 * it guards must still be safe to run twice, which is why the auction sweeps
 * take their own row locks inside their transactions.
 */
@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Runs work while holding a named lease, or skips it when somebody else holds it.
   *
   * @param name - What the lease covers.
   * @param ttlSeconds - How long the lease lives if this process dies.
   * @param work - The work to run while holding it.
   * @returns What the work returned, or null when the lease was not acquired.
   */
  async runExclusively<T>(
    name: string,
    ttlSeconds: number,
    work: () => Promise<T>,
  ): Promise<T | null> {
    const key = `nexus:lock:${name}`;
    const token = randomUUID();

    let acquired = false;
    try {
      acquired = (await this.redis.getClient().set(key, token, 'EX', ttlSeconds, 'NX')) === 'OK';
    } catch (error) {
      // Without Redis there is no way to coordinate. Running anyway risks doing
      // the work twice, so the round is skipped and retried on the next tick.
      this.logger.warn(
        `Could not acquire lock "${name}": ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return null;
    }

    if (!acquired) return null;

    try {
      return await work();
    } finally {
      try {
        await this.redis.getClient().eval(RELEASE_SCRIPT, 1, key, token);
      } catch {
        // The lease expires by itself; the next round simply waits for it.
      }
    }
  }
}
