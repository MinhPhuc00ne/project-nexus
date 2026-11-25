import { Injectable, Logger, Optional } from '@nestjs/common';
import { Role } from '@nexus/types';
import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  PlatformSettingsService,
  type PlatformSettings,
} from '../../../core/settings/platform-settings.service';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { UpdateSystemSettingsDto } from '../dtos/update-system-settings.dto';

/**
 * The administrative view of platform settings.
 *
 * The settings used to be held in a Redis key and a field on this service, so
 * a cache flush reverted every change an administrator had made and nothing
 * outside admin could read them without importing this module. They are now
 * owned by `PlatformSettingsService` in core, backed by the database.
 */
export type SystemSettings = PlatformSettings;

@Injectable()
export class AdminSettingsService {
  private readonly logger = new Logger(AdminSettingsService.name);

  constructor(
    private readonly platformSettings: PlatformSettingsService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  /**
   * Retrieves active platform operational settings from Redis or local memory fallback.
   *
   * @returns Active system settings configuration object
   */
  async getSettings(): Promise<SystemSettings> {
    return this.platformSettings.getAll();
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
    // Stored in the database, so the change survives a cache flush.
    const updated = await this.platformSettings.update(dto, adminId);

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
