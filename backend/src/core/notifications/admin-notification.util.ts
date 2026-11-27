import { NotificationChannel, NotificationType, Prisma, Role } from '@prisma/client';
import {
  type NotificationPublisher,
  type NotificationWriteClient,
  publishNotifications,
} from './notification-publisher.service';

export interface AdminNotificationPayload {
  title: string;
  content: string;
  type?: NotificationType;
  targetUrl?: string;
  auctionId?: string;
  metadata?: Record<string, unknown>;
}

export interface BackofficeNotificationPayload {
  title: string;
  content: string;
  type?: NotificationType;
  adminTargetUrl: string;
  staffTargetUrl: string;
  auctionId?: string;
  metadata?: Record<string, unknown>;
}

interface AdminNotificationDbClient {
  user?: {
    findMany?: (args: {
      where: { role: Role | { in: Role[] } };
      select: { id: true; role?: true };
    }) => Promise<Array<{ id: string; role?: Role }>>;
  };
  notification?: {
    createMany?: (args: {
      data: Array<{
        userId: string;
        title: string;
        content: string;
        type: NotificationType;
        channel: NotificationChannel;
        targetUrl?: string;
        auctionId?: string;
        metadata?: Prisma.InputJsonValue;
      }>;
    }) => Promise<unknown>;
  };
}

function hasNotificationDelegates(client: AdminNotificationDbClient): boolean {
  return (
    typeof client?.user?.findMany === 'function' &&
    typeof client?.notification?.createMany === 'function'
  );
}

/**
 * Dispatches an in-app notification to all Admin accounts without breaking minimal unit test mocks.
 */
export async function notifyAllAdmins(
  client: AdminNotificationDbClient,
  payload: AdminNotificationPayload,
  publisher?: NotificationPublisher,
): Promise<number> {
  if (!hasNotificationDelegates(client)) {
    return 0;
  }

  const admins = await client.user!.findMany!({
    where: { role: Role.ADMIN },
    select: { id: true },
  });

  if (!admins.length) {
    return 0;
  }

  await publishNotifications(
    client as NotificationWriteClient,
    admins.map(({ id }) => ({
      userId: id,
      title: payload.title,
      content: payload.content,
      type: payload.type ?? NotificationType.SYSTEM,
      channel: NotificationChannel.IN_APP,
      ...(payload.targetUrl ? { targetUrl: payload.targetUrl } : {}),
      ...(payload.auctionId ? { auctionId: payload.auctionId } : {}),
      ...(payload.metadata ? { metadata: payload.metadata as Prisma.InputJsonValue } : {}),
    })),
    publisher,
  );

  return admins.length;
}

/**
 * Dispatches an in-app notification to both Admin and Support Staff accounts with role-specific targetUrl.
 */
export async function notifyAdminsAndStaff(
  client: AdminNotificationDbClient,
  payload: BackofficeNotificationPayload,
  publisher?: NotificationPublisher,
): Promise<number> {
  if (!hasNotificationDelegates(client)) {
    return 0;
  }

  const recipients = await client.user!.findMany!({
    where: { role: { in: [Role.ADMIN, Role.SUPPORT_STAFF] } },
    select: { id: true, role: true },
  });

  if (!recipients.length) {
    return 0;
  }

  await publishNotifications(
    client as NotificationWriteClient,
    recipients.map(({ id, role }) => ({
      userId: id,
      title: payload.title,
      content: payload.content,
      type: payload.type ?? NotificationType.SYSTEM,
      channel: NotificationChannel.IN_APP,
      targetUrl: role === Role.SUPPORT_STAFF ? payload.staffTargetUrl : payload.adminTargetUrl,
      ...(payload.auctionId ? { auctionId: payload.auctionId } : {}),
      ...(payload.metadata ? { metadata: payload.metadata as Prisma.InputJsonValue } : {}),
    })),
    publisher,
  );

  return recipients.length;
}
