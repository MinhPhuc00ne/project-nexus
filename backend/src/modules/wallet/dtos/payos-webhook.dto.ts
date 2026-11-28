import { z } from 'zod';

export const PayosWebhookDataSchema = z.looseObject({
  orderCode: z.number().int(),
});

export const PayosWebhookSchema = z.looseObject({
  code: z.string().optional(),
  desc: z.string().optional(),
  success: z.boolean().optional(),
  data: PayosWebhookDataSchema,
  signature: z.string().optional(),
});

export type PayosWebhookInput = z.infer<typeof PayosWebhookSchema>;
