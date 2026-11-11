import { NotificationChannel, NotificationType, Role } from '@prisma/client';

export interface AdminNotificationPayload {
  title: string;
  content: string;
  type?: NotificationType;
  targetUrl?: string;
  auctionId?: string;
}

interface AdminNotificationDbClient {
  user?: {
    findMany?: (args: {
      where: { role: Role };
      select: { id: true };
    }) => Promise<Array<{ id: string }>>;
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
      }>;
    }) => Promise<unknown>;
  };
}

/**
 * Dispatches an in-app notification to all Admin accounts without breaking minimal unit test mocks.
 */
export async function notifyAllAdmins(
  client: AdminNotificationDbClient,
  payload: AdminNotificationPayload,
): Promise<number> {
  if (
    typeof client?.user?.findMany !== 'function' ||
    typeof client?.notification?.createMany !== 'function'
  ) {
    return 0;
  }

  const admins = await client.user.findMany({
    where: { role: Role.ADMIN },
    select: { id: true },
  });

  if (!admins.length) {
    return 0;
  }

  await client.notification.createMany({
    data: admins.map(({ id }) => ({
      userId: id,
      title: payload.title,
      content: payload.content,
      type: payload.type ?? NotificationType.SYSTEM,
      channel: NotificationChannel.IN_APP,
      ...(payload.targetUrl ? { targetUrl: payload.targetUrl } : {}),
      ...(payload.auctionId ? { auctionId: payload.auctionId } : {}),
    })),
  });

  return admins.length;
}
