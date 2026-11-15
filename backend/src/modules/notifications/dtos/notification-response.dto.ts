import { ApiProperty } from '@nestjs/swagger';
import { NotificationChannel, NotificationType } from '@prisma/client';

/** Account-owned notification content, including an optional auction deep link. */
export class NotificationResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() content!: string;
  @ApiProperty({ enum: NotificationType }) type!: NotificationType;
  @ApiProperty({ enum: NotificationChannel }) channel!: NotificationChannel;
  @ApiProperty() isRead!: boolean;
  @ApiProperty({ type: String, nullable: true, format: 'date-time' }) readAt!: Date | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, nullable: true, format: 'uuid' }) auctionId!: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    example: '/auction/00000000-0000-4000-8000-000000000001',
    description:
      'Frontend destination. New auction notifications use the same route as auction banners and manual browsing. Legacy notifications may have no destination.',
  })
  targetUrl!: string | null;
  @ApiProperty({ type: Object, nullable: true, required: false })
  metadata?: Record<string, unknown> | null;
}

/** Paginated notifications belonging exclusively to the authenticated account. */
export class NotificationPageDto {
  @ApiProperty({ type: [NotificationResponseDto] }) items!: NotificationResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() unreadCount!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() totalPages!: number;
}

/** Pending administrative task counts mapped directly to Admin Dashboard modules. */
export class AdminPendingQueuesDto {
  @ApiProperty({
    example: 2,
    description: 'Pending buyer-to-seller upgrade requests (/admin/sellers)',
  })
  sellerUpgradeRequests!: number;

  @ApiProperty({
    example: 3,
    description: 'Pending auction consignment items awaiting review (/admin/auctions)',
  })
  auctionConsignments!: number;

  @ApiProperty({ example: 1, description: 'Pending seller withdrawal requests (/admin/finance)' })
  withdrawalRequests!: number;

  @ApiProperty({ example: 1, description: 'Open or under-review order disputes (/admin/reports)' })
  openDisputes!: number;

  @ApiProperty({
    example: 2,
    description: 'Pending or investigating shop/product violation reports (/admin/reports)',
  })
  violationReports!: number;

  @ApiProperty({
    example: 1,
    description: 'Pending after-sales requests and external refunds (/admin/refunds)',
  })
  pendingRefunds!: number;

  @ApiProperty({
    example: 0,
    description: 'Pending GHN seller pickup point verifications (/admin/stores)',
  })
  pendingPickupPoints!: number;
}

/** Aggregated Admin notification bell + live pending moderation queue counters. */
export class AdminNotificationSummaryDto {
  @ApiProperty({
    example: 5,
    description: 'Total unread in-app notifications for current Admin user',
  })
  unreadCount!: number;

  @ApiProperty({
    example: 10,
    description: 'Sum of all pending operational tasks across Admin queues',
  })
  totalPendingActions!: number;

  @ApiProperty({ type: AdminPendingQueuesDto })
  pendingQueues!: AdminPendingQueuesDto;

  @ApiProperty({ type: [NotificationResponseDto], description: 'Latest 10 Admin notifications' })
  recentNotifications!: NotificationResponseDto[];
}
