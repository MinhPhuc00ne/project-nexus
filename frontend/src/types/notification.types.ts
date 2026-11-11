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
