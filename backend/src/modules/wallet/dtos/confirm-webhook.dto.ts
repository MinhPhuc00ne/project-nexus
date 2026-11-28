import { z } from 'zod';

export const ConfirmWebhookSchema = z
  .object({
    webhookUrl: z
      .url()
      .describe('Public webhook URL to register and confirm with PayOS')
      .meta({ example: 'https://xxxx.ngrok-free.app/api/v1/commerce/webhooks/payos' }),
  })
  .strict();

export type ConfirmWebhookInput = z.infer<typeof ConfirmWebhookSchema>;
