import i18n from '@/i18n';
import { apiRequest } from '@/services/api';
import { getStoredToken } from '@/features/auth/services/auth';
import type {
  AdminNotificationSummary,
  NotificationQuery,
  NotificationsPage,
  ReadAllNotificationsResult,
  ReadNotificationResult,
  NotificationPreference,
  NotificationPreferences,
  SaveNotificationPreferencesResult,
} from '@/features/notifications/types/notification.types';

const pending = new Map<string, Promise<unknown>>();

export function getAdminNotificationSummary(): Promise<AdminNotificationSummary> {
  return getNotificationResource('/notifications/admin/summary');
}

function getNotificationResource<T>(path: string): Promise<T> {
  const token = getStoredToken();
  if (!token) return Promise.reject(new Error(i18n.t('errors:services.notificationsAuthRequired')));
  const key = JSON.stringify([token, path]);
  const existing = pending.get(key);
  if (existing) return existing as Promise<T>;
  const request = apiRequest<T>(path, { requireAuth: true }).finally(() => {
    if (pending.get(key) === request) pending.delete(key);
  });
  pending.set(key, request);
  return request;
}

export function getNotifications(query: NotificationQuery = {}): Promise<NotificationsPage> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  return getNotificationResource(`/notifications${params.size ? `?${params}` : ''}`);
}

export function getNotificationUnreadCount(): Promise<{ unreadCount: number }> {
  return getNotificationResource('/notifications/unread-count');
}

export async function markNotificationRead(id: string): Promise<ReadNotificationResult> {
  const result = await apiRequest<ReadNotificationResult>(
    `/notifications/${encodeURIComponent(id)}/read`,
    { method: 'PATCH', requireAuth: true },
  );
  if (!result?.success)
    throw new Error(result?.message || i18n.t('errors:services.notificationMarkFailed'));
  return result;
}

export async function markAllNotificationsRead(): Promise<ReadAllNotificationsResult> {
  const result = await apiRequest<ReadAllNotificationsResult>('/notifications/read-all', {
    method: 'PATCH',
    requireAuth: true,
  });
  if (!result?.success)
    throw new Error(result?.message || i18n.t('errors:services.notificationsMarkAllFailed'));
  return result;
}

export function getNotificationPreferences(): Promise<NotificationPreferences> {
  return getNotificationResource('/notifications/preferences');
}

export async function saveNotificationPreferences(
  preferences: NotificationPreference[],
): Promise<SaveNotificationPreferencesResult> {
  const result = await apiRequest<SaveNotificationPreferencesResult>('/notifications/preferences', {
    method: 'PUT',
    body: { preferences },
    requireAuth: true,
  });
  if (!result.success)
    throw new Error(result.message || i18n.t('errors:services.notificationPrefsSaveFailed'));
  return result;
}
