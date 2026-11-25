/**
 * An in-memory stand-in for the Redis commands the backend uses.
 *
 * Services that keep shared state in Redis — the support staff queue, session
 * revocation — cannot be exercised with a plain object any more, and spinning
 * up a real server for a unit test is slower than the behaviour being checked.
 * This implements only the commands those services call, with the same return
 * shapes Redis documents, so a test drives the real service logic.
 */
export function createFakeRedis() {
  /** @type {Map<string, Set<string>>} */
  const sets = new Map();
  /** @type {Map<string, Map<string, number>>} */
  const sortedSets = new Map();
  /** @type {Map<string, string>} */
  const strings = new Map();

  const client = {
    async sadd(key, ...members) {
      const set = sets.get(key) ?? new Set();
      const before = set.size;
      for (const member of members.flat()) set.add(member);
      sets.set(key, set);
      return set.size - before;
    },
    async srem(key, member) {
      const set = sets.get(key);
      if (!set) return 0;
      return set.delete(member) ? 1 : 0;
    },
    async scard(key) {
      return sets.get(key)?.size ?? 0;
    },
    async smembers(key) {
      return [...(sets.get(key) ?? [])];
    },

    async zadd(key, ...args) {
      const scores = sortedSets.get(key) ?? new Map();
      sortedSets.set(key, scores);

      // Supports both `zadd(key, score, member)` and `zadd(key, 'NX', score, member)`.
      const onlyIfAbsent = args[0] === 'NX';
      const [score, member] = onlyIfAbsent ? args.slice(1) : args;
      if (onlyIfAbsent && scores.has(member)) return 0;
      const existed = scores.has(member);
      scores.set(member, Number(score));
      return existed ? 0 : 1;
    },
    async zrem(key, member) {
      return sortedSets.get(key)?.delete(member) ? 1 : 0;
    },
    async zscore(key, member) {
      const score = sortedSets.get(key)?.get(member);
      return score === undefined ? null : String(score);
    },
    async zcard(key) {
      return sortedSets.get(key)?.size ?? 0;
    },
    async zrange(key, start, stop, withScores) {
      const entries = [...(sortedSets.get(key) ?? new Map())].sort((a, b) => a[1] - b[1]);
      const end = stop === -1 ? entries.length : stop + 1;
      const window = entries.slice(start, end);
      if (withScores) return window.flatMap(([member, score]) => [member, String(score)]);
      return window.map(([member]) => member);
    },

    async get(key) {
      return strings.get(key) ?? null;
    },
    async set(key, value) {
      strings.set(key, value);
      return 'OK';
    },
    async incr(key) {
      const next = Number(strings.get(key) ?? 0) + 1;
      strings.set(key, String(next));
      return next;
    },
    async del(key) {
      const existed = sets.delete(key) || sortedSets.delete(key) || strings.delete(key);
      return existed ? 1 : 0;
    },
    // Expiry is a no-op: a unit test finishes long before any TTL would matter.
    async expire() {
      return 1;
    },
    async ping() {
      return 'PONG';
    },
  };

  /** Shaped like RedisService, which is what the services actually inject. */
  return {
    getClient: () => client,
    get: (key) => client.get(key),
    set: (key, value) => client.set(key, value),
    del: (key) => client.del(key),
    ping: () => client.ping(),
  };
}
