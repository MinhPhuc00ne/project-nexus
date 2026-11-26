import type { UserNotification } from '@/features/notifications/types/notification.types';

/** Use the backend destination without inferring a route from notification content. */
export function resolveAdminNotificationTarget(item: UserNotification): string | null {
  const target = item.targetUrl?.trim();
  if (!target?.startsWith('/') || target.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(target))
    return null;
  return target;
}
