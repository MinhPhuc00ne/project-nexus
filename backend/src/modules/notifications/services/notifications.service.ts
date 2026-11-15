import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuctionItemStatus,
  DisputeStatus,
  NotificationChannel,
  NotificationType,
  Prisma,
  SellerRequestStatus,
  ViolationStatus,
  WithdrawalStatus,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { publishUnreadCountSync } from '../../../core/notifications/notification-realtime.bus';
import { auctionTargetUrl } from '../../../core/navigation/auction-navigation';
import { QueryNotificationDto } from '../dtos/query-notification.dto';
import { UpdateNotificationPreferencesDto } from '../dtos/update-notification-preferences.dto';
import {
  AdminNotificationSummaryDto,
  NotificationPageDto,
} from '../dtos/notification-response.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves paginated notifications for a user with read status filtering.
   *
   * @param userId - Target user identifier
   * @param query - Query filter and pagination parameters
   * @returns Paginated notification items, unread counters, and pagination metadata
   */
  async getUserNotifications(
    userId: string,
    query: QueryNotificationDto,
  ): Promise<NotificationPageDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(50, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
    };

    if (query.isRead !== undefined) {
      where.isRead = query.isRead;
    }

    if (query.type !== undefined) {
      where.type = query.type;
    }

    const [total, unreadCount, items] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items: items.map((n) => ({
        id: n.id,
        title: n.title,
        auctionId: n.auctionId,
        targetUrl: n.targetUrl,
        metadata: (n.metadata as Record<string, unknown> | null) ?? null,
        content: n.content,
        type: n.type,
        channel: n.channel,
        isRead: n.isRead,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Counts unread notifications for a user to display header badge indicators.
   *
   * @param userId - Target user identifier
   * @returns Total unread notification count
   */
  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return { unreadCount };
  }

  /**
   * Aggregates unread Admin notifications alongside live pending operational queue counts.
   */
  async getAdminNotificationSummary(adminUserId: string): Promise<AdminNotificationSummaryDto> {
    const [
      unreadCount,
      recentNotifications,
      sellerUpgradeRequests,
      auctionConsignments,
      withdrawalRequests,
      openDisputes,
      violationReports,
      pendingAfterSales,
      pendingExternalRefunds,
      pendingPickupPoints,
    ] = await Promise.all([
      this.prisma.notification.count({ where: { userId: adminUserId, isRead: false } }),
      this.prisma.notification.findMany({
        where: { userId: adminUserId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.sellerUpgradeRequest.count({
        where: { status: SellerRequestStatus.PENDING },
      }),
      this.prisma.auctionItem.count({
        where: { status: AuctionItemStatus.PENDING_REVIEW },
      }),
      this.prisma.withdrawalRequest.count({
        where: { status: WithdrawalStatus.PENDING },
      }),
      this.prisma.dispute.count({
        where: { status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] } },
      }),
      this.prisma.shopViolation.count({
        where: { status: { in: [ViolationStatus.PENDING, ViolationStatus.INVESTIGATING] } },
      }),
      this.prisma.afterSalesRequest.count({
        where: { status: { in: ['REQUESTED', 'APPROVING'] } },
      }),
      this.prisma.orderRefund.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.sellerGhnAccount.count({
        where: { status: 'PENDING' },
      }),
    ]);

    const pendingRefunds = pendingAfterSales + pendingExternalRefunds;
    const totalPendingActions =
      sellerUpgradeRequests +
      auctionConsignments +
      withdrawalRequests +
      openDisputes +
      violationReports +
      pendingRefunds +
      pendingPickupPoints;

    return {
      unreadCount,
      totalPendingActions,
      pendingQueues: {
        sellerUpgradeRequests,
        auctionConsignments,
        withdrawalRequests,
        openDisputes,
        violationReports,
        pendingRefunds,
        pendingPickupPoints,
      },
      recentNotifications: recentNotifications.map((n) => ({
        id: n.id,
        title: n.title,
        auctionId: n.auctionId,
        targetUrl: n.targetUrl,
        metadata: (n.metadata as Record<string, unknown> | null) ?? null,
        content: n.content,
        type: n.type,
        channel: n.channel,
        isRead: n.isRead,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
    };
  }

  /**
   * Marks a specific user notification as read.
   *
   * @param userId - Target user identifier
   * @param notificationId - Target notification identifier
   * @returns Confirmation result and updated Notification entity
   * @throws NotFoundException when notification does not exist for the user
   */
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Không tìm thấy thông báo này.');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });

    const { unreadCount } = await this.getUnreadCount(userId);
    publishUnreadCountSync(userId, unreadCount);

    return {
      success: true,
      message: 'Đã đánh dấu thông báo là đã đọc.',
      notification: updated,
    };
  }

  /**
   * Marks all unread notifications for a user as read.
   *
   * @param userId - Target user identifier
   * @returns Confirmation result and updated record count
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });

    publishUnreadCountSync(userId, 0);

    return {
      success: true,
      message: `Đã đánh dấu tất cả ${result.count} thông báo là đã đọc.`,
      count: result.count,
    };
  }

  /**
   * Internal helper to create a system or event notification for a user.
   *
   * @param params - Notification creation parameters
   * @returns Created Notification entity
   */
  async createNotification(params: {
    userId: string;
    title: string;
    content: string;
    type?: NotificationType;
    channel?: NotificationChannel;
    auctionId?: string;
    targetUrl?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: params.userId,
        auctionId: params.auctionId,
        targetUrl: params.auctionId ? auctionTargetUrl(params.auctionId) : params.targetUrl,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
        title: params.title,
        content: params.content,
        type: params.type || NotificationType.SYSTEM,
        channel: params.channel || NotificationChannel.IN_APP,
      },
    });
  }

  /**
   * Retrieves channel preferences for a user across in-app, email, and push.
   *
   * @param userId - Target user identifier
   * @returns User notification preferences per channel
   */
  async getPreferences(userId: string) {
    const preferences = await this.prisma.notificationPreference.findMany({
      where: { userId },
    });

    const prefMap = new Map<NotificationChannel, boolean>();
    for (const p of preferences) {
      prefMap.set(p.channel, p.isEnabled);
    }

    const allChannels = [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      NotificationChannel.PUSH,
    ];

    return {
      userId,
      preferences: allChannels.map((channel) => ({
        channel,
        isEnabled: prefMap.has(channel) ? prefMap.get(channel)! : true,
      })),
    };
  }

  /**
   * Upserts notification preferences across channels for a user.
   *
   * @param userId - Target user identifier
   * @param dto - Updated channel preference settings
   * @returns Confirmation and refreshed preferences
   */
  async updatePreferences(userId: string, dto: UpdateNotificationPreferencesDto) {
    const operations = dto.preferences.map((item) =>
      this.prisma.notificationPreference.upsert({
        where: {
          userId_channel: {
            userId,
            channel: item.channel,
          },
        },
        create: {
          userId,
          channel: item.channel,
          isEnabled: item.isEnabled,
        },
        update: {
          isEnabled: item.isEnabled,
        },
      }),
    );

    await this.prisma.$transaction(operations);

    return {
      success: true,
      message: 'Lưu tùy chọn nhận thông báo thành công!',
      ...(await this.getPreferences(userId)),
    };
  }
}
