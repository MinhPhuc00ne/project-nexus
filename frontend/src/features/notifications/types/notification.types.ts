export interface UserNotification {
  id: string;
  title: string;
  content: string;
  type: string;
  channel: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  auctionId?: string | null;
  targetUrl?: string | null;
  metadata?: { actionType?: string; [key: string]: unknown } | null;
}

export interface AdminNotificationSummary {
  unreadCount: number;
  totalPendingActions: number;
  pendingQueues: {
    sellerUpgradeRequests: number;
    auctionConsignments: number;
    withdrawalRequests: number;
    openDisputes: number;
    violationReports: number;
    pendingRefunds: number;
    pendingPickupPoints: number;
  };
  recentNotifications: UserNotification[];
}

export interface NotificationsPage {
  items: UserNotification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationQuery {
  page?: number;
  limit?: number;
  isRead?: boolean;
}

export interface ReadNotificationResult {
  success: boolean;
  message: string;
  notification: UserNotification;
}

export interface ReadAllNotificationsResult {
  success: boolean;
  message: string;
  count: number;
}

export type NotificationChannel = 'EMAIL' | 'PUSH' | 'IN_APP';
export interface NotificationPreference {
  channel: NotificationChannel;
  isEnabled: boolean;
}
export interface NotificationPreferences {
  userId: string;
  preferences: NotificationPreference[];
}
export interface SaveNotificationPreferencesResult extends NotificationPreferences {
  success: boolean;
  message: string;
}

/**
 * A notification as the header's dropdown shows it.
 *
 * Shorter than `UserNotification`, which is what the server sends: the header
 * renders a title, a line of text and whether it has been read, and nothing
 * else. It lived in the `src/types` barrel, which was the only reason that
 * barrel had a body rather than being re-exports.
 */
export interface NotificationItem {
  id: string | number;
  title: string;
  desc?: string;
  time?: string;
  unread?: boolean;
}
