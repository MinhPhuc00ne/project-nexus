import { Injectable, Logger, Optional } from '@nestjs/common';
import { Role } from '@nexus/types';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { RedisService } from '../../../core/redis/redis.service';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { UpdateSystemSettingsDto } from '../dtos/update-system-settings.dto';

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

  constructor(
    private readonly redisService: RedisService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  /**
   * Retrieves active platform operational settings from Redis or local memory fallback.
   *
   * @returns Active system settings configuration object
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
   * Updates platform operational configuration parameters at runtime.
   *
   * @param adminId - Administrative actor identifier
   * @param dto - Updated configuration values
   * @returns Update confirmation with active settings
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

    if (
      this.prisma &&
      dto.platformFeePercentage !== undefined &&
      Number(dto.platformFeePercentage) !== Number(current.platformFeePercentage)
    ) {
      try {
        const sellers = await this.prisma.user.findMany({
          where: {
            OR: [{ role: Role.SELLER }, { isSellerActive: true }],
          },
          select: { id: true },
        });

        if (sellers.length > 0) {
          const oldFee = current.platformFeePercentage;
          const newFee = updated.platformFeePercentage;
          const nowLabel = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
          await this.prisma.notification.createMany({
            data: sellers.map((s) => ({
              userId: s.id,
              title: 'Thông báo điều chỉnh biểu phí sàn giao dịch 📢',
              content: `Sàn NEXUS thông báo: Tỷ lệ phí sàn đã được điều chỉnh từ ${oldFee}% sang ${newFee}%, áp dụng cho tất cả các đơn hàng mới phát sinh từ ${nowLabel}. Vui lòng kiểm tra lại mục Tài chính người bán để tối ưu giá bán sản phẩm.`,
              targetUrl: '/seller/finance',
              type: NotificationType.SYSTEM,
              channel: NotificationChannel.IN_APP,
            })),
          });
          this.logger.log(`Đã gửi thông báo thay đổi phí sàn tới ${sellers.length} người bán.`);
        }
      } catch (err) {
        this.logger.error(`Gửi thông báo thay đổi phí sàn thất bại: ${(err as Error).message}`);
      }
    }

    return {
      success: true,
      message: 'Cập nhật cấu hình sàn giao dịch thành công!',
      settings: updated,
    };
  }
}
