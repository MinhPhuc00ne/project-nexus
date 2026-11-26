import { NotificationChannel, NotificationType } from '@prisma/client';
import { z } from 'zod';

export const NotificationResponseSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  content: z.string(),
  type: z.enum(NotificationType),
  channel: z.enum(NotificationChannel),
  isRead: z.boolean(),
  readAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  auctionId: z.uuid().nullable(),
  targetUrl: z
    .string()
    .nullable()
    .describe(
      'Frontend destination. New auction notifications use the same route as auction banners and manual browsing. Legacy notifications may have no destination.',
    )
    .meta({ example: '/auction/00000000-0000-4000-8000-000000000001' }),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type NotificationResponseDto = Omit<
  z.infer<typeof NotificationResponseSchema>,
  'readAt' | 'createdAt'
> & {
  readAt: Date | string | null;
  createdAt: Date | string;
};

export const NotificationPageSchema = z.object({
  items: z.array(NotificationResponseSchema),
  total: z.number(),
  unreadCount: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type NotificationPageDto = {
  items: NotificationResponseDto[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
};

export const AdminPendingQueuesSchema = z.object({
  sellerUpgradeRequests: z
    .number()
    .describe('Pending buyer-to-seller upgrade requests (/admin/sellers)')
    .meta({ example: 2 }),
  auctionConsignments: z
    .number()
    .describe('Pending auction consignment items awaiting review (/admin/auctions)')
    .meta({ example: 3 }),
  withdrawalRequests: z
    .number()
    .describe('Pending seller withdrawal requests (/admin/finance)')
    .meta({ example: 1 }),
  openDisputes: z
    .number()
    .describe('Open or under-review order disputes (/admin/reports)')
    .meta({ example: 1 }),
  violationReports: z
    .number()
    .describe('Pending or investigating shop/product violation reports (/admin/reports)')
    .meta({ example: 2 }),
  pendingRefunds: z
    .number()
    .describe('Pending after-sales requests and external refunds (/admin/refunds)')
    .meta({ example: 1 }),
  pendingPickupPoints: z
    .number()
    .describe('Pending GHN seller pickup point verifications (/admin/stores)')
    .meta({ example: 0 }),
});

export type AdminPendingQueuesDto = z.infer<typeof AdminPendingQueuesSchema>;

export const AdminNotificationSummarySchema = z.object({
  unreadCount: z
    .number()
    .describe('Total unread in-app notifications for current Admin user')
    .meta({ example: 5 }),
  totalPendingActions: z
    .number()
    .describe('Sum of all pending operational tasks across Admin queues')
    .meta({ example: 10 }),
  pendingQueues: AdminPendingQueuesSchema,
  recentNotifications: z
    .array(NotificationResponseSchema)
    .describe('Latest 10 Admin notifications'),
});

export type AdminNotificationSummaryDto = Omit<
  z.infer<typeof AdminNotificationSummarySchema>,
  'recentNotifications'
> & {
  recentNotifications: NotificationResponseDto[];
};
