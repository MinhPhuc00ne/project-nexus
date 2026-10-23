import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationChannel, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { QueryNotificationDto } from '../dtos/query-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách thông báo của người dùng kèm phân trang & lọc trạng thái đã đọc
   */
  async getUserNotifications(userId: string, query: QueryNotificationDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(50, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
    };

    if (query.isRead !== undefined) {
      where.isRead = query.isRead;
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
   * Đếm số lượng thông báo chưa đọc của người dùng (phục vụ biểu tượng quả chuông ở Header)
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
   * Đánh dấu một thông báo cụ thể là đã đọc
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

    return {
      success: true,
      message: 'Đã đánh dấu thông báo là đã đọc.',
      notification: updated,
    };
  }

  /**
   * Đánh dấu toàn bộ thông báo của người dùng là đã đọc
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });

    return {
      success: true,
      message: `Đã đánh dấu tất cả ${result.count} thông báo là đã đọc.`,
      count: result.count,
    };
  }

  /**
   * Hàm tạo thông báo nội bộ cho các module khác dùng
   */
  async createNotification(params: {
    userId: string;
    title: string;
    content: string;
    type?: NotificationType;
    channel?: NotificationChannel;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        content: params.content,
        type: params.type || NotificationType.SYSTEM,
        channel: params.channel || NotificationChannel.IN_APP,
      },
    });
  }
}
