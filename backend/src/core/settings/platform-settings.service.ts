import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

/** Operational settings an administrator can change at runtime. */
export interface PlatformSettings {
  platformFeePercentage: number;
  cartExpirationDays: number;
  checkoutTimeoutMinutes: number;
  inventoryReservationTimeout: number;
  maxActiveCartPerUser: number;
  categoryMaxLevel: number;
  maxProductImages: number;
  antiSnipingTriggerMinutes: number;
  antiSnipingExtendMinutes: number;
}

/** Used only when the database has not been bootstrapped yet. */
export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformFeePercentage: 7.0,
  cartExpirationDays: 7,
  checkoutTimeoutMinutes: 15,
  inventoryReservationTimeout: 30,
  maxActiveCartPerUser: 1,
  categoryMaxLevel: 3,
  maxProductImages: 5,
  antiSnipingTriggerMinutes: 2,
  antiSnipingExtendMinutes: 5,
};

const CACHE_KEY = 'nexus:system:settings';
const CACHE_TTL_SECONDS = 300;

/**
 * The single source of truth for platform configuration.
 *
 * These values decided real money and were read from three different places
 * that could disagree: escrow took the platform fee from a Redis key, the
 * seller revenue page took it from `PLATFORM_FEE_PERCENTAGE` in the
 * environment, and a cache flush silently reverted whatever an administrator
 * had set. They now live in the `system_settings` table, with Redis in front of
 * it as a cache rather than as the record.
 *
 * It sits in `core` so every module can read a setting without importing the
 * admin module, which is what used to point commerce at admin.
 */
@Injectable()
export class PlatformSettingsService {
  private readonly logger = new Logger(PlatformSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Reads the current settings.
   *
   * @returns The stored settings, with defaults filling anything absent.
   */
  async getAll(): Promise<PlatformSettings> {
    const cached = await this.readCache();
    if (cached) return cached;

    const settings = await this.readDatabase();
    await this.writeCache(settings);
    return settings;
  }

  /**
   * Reads one setting.
   *
   * @param key - Which setting to read.
   * @returns Its current value.
   */
  async get<K extends keyof PlatformSettings>(key: K): Promise<PlatformSettings[K]> {
    return (await this.getAll())[key];
  }

  /**
   * Stores changed settings and refreshes the cache.
   *
   * @param changes - The settings to change; anything omitted is left alone.
   * @param updatedById - Who made the change.
   * @returns The settings as they now stand.
   */
  async update(
    changes: Partial<PlatformSettings>,
    updatedById?: string,
  ): Promise<PlatformSettings> {
    const entries = Object.entries(changes).filter(([, value]) => value !== undefined) as Array<
      [keyof PlatformSettings, number]
    >;

    if (entries.length > 0) {
      await this.prisma.$transaction(
        entries.map(([key, value]) =>
          this.prisma.systemSetting.upsert({
            where: { key },
            create: { key, value, updatedById },
            update: { value, updatedById },
          }),
        ),
      );
    }

    const settings = await this.readDatabase();
    await this.writeCache(settings);
    return settings;
  }

  private async readDatabase(): Promise<PlatformSettings> {
    try {
      const rows = await this.prisma.systemSetting.findMany({
        where: { key: { in: Object.keys(DEFAULT_PLATFORM_SETTINGS) } },
        select: { key: true, value: true },
      });

      const settings = { ...DEFAULT_PLATFORM_SETTINGS };
      for (const row of rows) {
        const parsed = Number(row.value);
        if (Number.isFinite(parsed)) {
          settings[row.key as keyof PlatformSettings] = parsed;
        }
      }
      return settings;
    } catch (error) {
      // A platform that cannot read its settings still has to serve traffic, so
      // the documented defaults apply and the failure is loud in the log.
      this.logger.error(
        `Could not read platform settings: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return { ...DEFAULT_PLATFORM_SETTINGS };
    }
  }

  private async readCache(): Promise<PlatformSettings | null> {
    try {
      const raw = await this.redis.get(CACHE_KEY);
      if (!raw) return null;
      return { ...DEFAULT_PLATFORM_SETTINGS, ...(JSON.parse(raw) as Partial<PlatformSettings>) };
    } catch {
      return null;
    }
  }

  private async writeCache(settings: PlatformSettings): Promise<void> {
    try {
      await this.redis.set(CACHE_KEY, JSON.stringify(settings), CACHE_TTL_SECONDS);
    } catch {
      // The database already answered; caching is an optimisation.
    }
  }
}
