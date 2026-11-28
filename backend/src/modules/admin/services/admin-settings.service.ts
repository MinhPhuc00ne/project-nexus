import {
  NotificationPublisher,
  publishNotifications,
} from '../../../core/notifications/notification-publisher.service';
import { AuditLogService } from '../../../core/audit/audit-log.service';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { Role } from '@nexus/contracts';
import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  PlatformSettingsService,
  type PlatformSettings,
} from '../../../core/settings/platform-settings.service';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { UpdateSystemSettingsInput } from '../dtos/update-system-settings.dto';

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
    @Optional() private readonly notifications?: NotificationPublisher,
    @Optional() private readonly auditLog?: AuditLogService,
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
    dto: UpdateSystemSettingsInput,
  ): Promise<{
    success: boolean;
    message: string;
    settings: SystemSettings;
  }> {
    const current = await this.getSettings();
    // Stored in the database, so the change survives a cache flush.
    const updated = await this.platformSettings.update(dto, adminId);

    this.logger.log(`Admin (${adminId}) updated platform settings.`);
    await this.auditLog?.record({
      eventName: 'admin.settings.updated',
      operatorId: adminId,
      payload: {
        changes: dto,
        previousPlatformFeePercentage: current.platformFeePercentage,
        nextPlatformFeePercentage: updated.platformFeePercentage,
      },
    });

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
          const nowLabel = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
          await publishNotifications(
            this.prisma,
            sellers.map((s) => ({
              userId: s.id,
              title: 'Platform fee schedule update 📢',
              content: `NEXUS notice: The platform fee rate has been adjusted from ${oldFee}% to ${newFee}%, effective for all new orders created from ${nowLabel}. Please review your Seller Finance dashboard to optimize product pricing.`,
              targetUrl: '/seller/finance',
              type: NotificationType.SYSTEM,
              channel: NotificationChannel.IN_APP,
            })),
            this.notifications,
          );
          this.logger.log(`Sent platform fee change notifications to ${sellers.length} sellers.`);
        }
      } catch (err) {
        this.logger.error(
          `Failed to send platform fee change notifications: ${(err as Error).message}`,
        );
      }
    }

    return {
      success: true,
      message: 'Platform settings updated successfully!',
      settings: updated,
    };
  }
}
