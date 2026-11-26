import { z } from 'zod';
import { NotificationChannel } from '@prisma/client';

const notificationPreferenceItemFields = {
  channel: z
    .enum(NotificationChannel)
    .describe('Kênh nhận thông báo: EMAIL, PUSH, IN_APP')
    .meta({ example: NotificationChannel.EMAIL }),
  isEnabled: z
    .boolean()
    .describe('Bật (true) hoặc tắt (false) nhận thông báo qua kênh này')
    .meta({ example: true }),
};

export const NotificationPreferenceItemSchema = z.object(notificationPreferenceItemFields).strict();

export type NotificationPreferenceItemInput = z.infer<typeof NotificationPreferenceItemSchema>;

const updateNotificationPreferencesFields = {
  preferences: z
    .array(NotificationPreferenceItemSchema)
    .describe('Danh sách cài đặt bật/tắt nhận thông báo cho từng kênh')
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
