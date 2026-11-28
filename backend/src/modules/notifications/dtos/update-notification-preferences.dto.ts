import { z } from 'zod';
import { NotificationChannel } from '@prisma/client';

const notificationPreferenceItemFields = {
  channel: z
    .enum(NotificationChannel)
    .describe('Notification channel: EMAIL, PUSH, IN_APP')
    .meta({ example: NotificationChannel.EMAIL }),
  isEnabled: z
    .boolean()
    .describe('Enable (true) or disable (false) notifications on this channel')
    .meta({ example: true }),
};

export const NotificationPreferenceItemSchema = z.object(notificationPreferenceItemFields).strict();

export type NotificationPreferenceItemInput = z.infer<typeof NotificationPreferenceItemSchema>;

const updateNotificationPreferencesFields = {
  preferences: z
    .array(NotificationPreferenceItemSchema)
    .describe('Channel notification preference settings')
    .meta({
      example: [
        { channel: 'IN_APP', isEnabled: true },
        { channel: 'EMAIL', isEnabled: true },
        { channel: 'PUSH', isEnabled: false },
      ],
    }),
};

export const UpdateNotificationPreferencesSchema = z
  .object(updateNotificationPreferencesFields)
  .strict();

export type UpdateNotificationPreferencesInput = z.infer<
  typeof UpdateNotificationPreferencesSchema
>;
