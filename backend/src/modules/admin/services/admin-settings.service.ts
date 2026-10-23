import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../core/redis/redis.service';
import { UpdateSystemSettingsDto } from '../dto/update-system-settings.dto';

export interface SystemSettings {
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

const DEFAULT_SETTINGS: SystemSettings = {
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

const REDIS_SETTINGS_KEY = 'nexus:system:settings';

@Injectable()
export class AdminSettingsService {
  private readonly logger = new Logger(AdminSettingsService.name);
  private cachedSettings: SystemSettings = { ...DEFAULT_SETTINGS };

  constructor(private readonly redisService: RedisService) {}

  /**
   * Lấy cấu hình hệ thống hiện tại (từ Redis hoặc cache bộ nhớ)
   */
  async getSettings(): Promise<SystemSettings> {
    try {
      const raw = await this.redisService.get(REDIS_SETTINGS_KEY);
      if (raw) {
        this.cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch (err) {
      this.logger.warn(
        `Không thể đọc cấu hình từ Redis, dùng bộ nhớ đệm: ${(err as Error).message}`,
      );
    }

    return this.cachedSettings;
  }

  /**
   * Cập nhật các thông số vận hành sàn runtime
   */
  async updateSettings(
    adminId: string,
    dto: UpdateSystemSettingsDto,
  ): Promise<{
    success: boolean;
    message: string;
    settings: SystemSettings;
  }> {
    const current = await this.getSettings();
    const updated: SystemSettings = {
      ...current,
      ...Object.fromEntries(Object.entries(dto).filter(([_, v]) => v !== undefined)),
    };

    this.cachedSettings = updated;

    try {
      const client = this.redisService.getClient();
      if (client) {
        await client.set(REDIS_SETTINGS_KEY, JSON.stringify(updated));
      }
    } catch (err) {
      this.logger.warn(`Lưu cấu hình vào Redis thất bại: ${(err as Error).message}`);
    }

    this.logger.log(`Admin (${adminId}) đã cập nhật cấu hình hệ thống.`);

    return {
      success: true,
      message: 'Cập nhật cấu hình sàn giao dịch thành công!',
      settings: updated,
    };
  }
}
