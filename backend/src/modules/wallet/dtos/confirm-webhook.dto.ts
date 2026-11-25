import { z } from 'zod';

export const ConfirmWebhookSchema = z
  .object({
    webhookUrl: z
      .url()
      .describe('URL Webhook công khai để đăng ký và xác nhận với PayOS')
      .meta({ example: 'https://xxxx.ngrok-free.app/api/v1/commerce/webhooks/payos' }),
  })
  .strict();

export type ConfirmWebhookInput = z.infer<typeof ConfirmWebhookSchema>;
