/**
 * Deterministic randomness and time arithmetic for the demo seed.
 *
 * Every timestamp is derived from the moment the seed runs rather than written
 * as a fixed date, so a demo looks current whenever it is shown: the auctions
 * that should be live are live, the ones awaiting payment are still inside
 * their window, and the revenue chart covers the last thirty days. The random
 * choices come from a seeded generator, so two runs produce the same catalogue
 * and the same bid history and a reviewer can compare them.
 */

/** Vietnam has no daylight saving, so the offset is a constant. */
const VIETNAM_UTC_OFFSET_HOURS = 7;

/**
 * A small, fast, well-distributed PRNG (mulberry32).
 *
 * `Math.random()` cannot be seeded, which would make every run produce a
 * different catalogue and different bid amounts.
 */
export class SeededRandom {
  private state: number;

  constructor(seed = 20261125) {
    this.state = seed >>> 0;
  }

  /** A float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** An integer in [min, max], inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** A VND amount in [min, max], rounded to the nearest `step`. */
  money(min: number, max: number, step = 1000): number {
    return Math.round(this.int(min, max) / step) * step;
  }

  /** One element of a non-empty array. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('pick() needs a non-empty array');
    return items[this.int(0, items.length - 1)];
  }

  /** `count` distinct elements, or all of them when the array is shorter. */
  sample<T>(items: readonly T[], count: number): T[] {
    const pool = [...items];
    const taken: T[] = [];
    while (taken.length < count && pool.length > 0) {
      taken.push(pool.splice(this.int(0, pool.length - 1), 1)[0]);
    }
    return taken;
  }

  /** True with the given probability. */
  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

/**
 * The clock a demo run is built around.
 *
 * Created once at the start of a run so every module places its data on the
 * same timeline.
 */
export class DemoClock {
  readonly now: Date;

  constructor(now = new Date()) {
    this.now = now;
  }

  /** `minutes` before the run started. */
  minutesAgo(minutes: number): Date {
    return new Date(this.now.getTime() - minutes * 60_000);
  }

  /** `minutes` after the run started. */
  minutesFromNow(minutes: number): Date {
    return new Date(this.now.getTime() + minutes * 60_000);
  }

  /** `hours` before the run started. */
  hoursAgo(hours: number): Date {
    return this.minutesAgo(hours * 60);
  }

  /** `hours` after the run started. */
  hoursFromNow(hours: number): Date {
    return this.minutesFromNow(hours * 60);
  }

  /** `days` before the run started. */
  daysAgo(days: number): Date {
    return this.hoursAgo(days * 24);
  }

  /** `days` after the run started. */
  daysFromNow(days: number): Date {
    return this.hoursFromNow(days * 24);
  }

  /** The run's start, written in Vietnam local time, for printing. */
  localLabel(): string {
    const shifted = new Date(this.now.getTime() + VIETNAM_UTC_OFFSET_HOURS * 3_600_000);
    return `${shifted.toISOString().replace('T', ' ').slice(0, 19)} (UTC+7)`;
  }
}
