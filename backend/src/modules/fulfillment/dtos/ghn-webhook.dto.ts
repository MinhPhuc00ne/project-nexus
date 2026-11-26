import { z } from 'zod';

/**
 * The GHN delivery callback payload.
 *
 * The handler took `Record<string, unknown>` and re-checked every field by hand
 * inside the request, so the shape the carrier actually sends lived in a chain
 * of `typeof` guards rather than anywhere a reader could see it. GHN sends
 * PascalCase keys and more fields than the platform uses; anything not listed
 * here is accepted and ignored, because a carrier adding a field must not break
 * delivery updates.
 */
export const GhnWebhookSchema = z
  .object({
    /** The waybill, which is how the shipment is found. */
    OrderCode: z.string().trim().min(1, 'OrderCode is required'),

    /** Which GHN shop the waybill belongs to; checked against the shipment. */
    ShopID: z.coerce.number().int().positive('ShopID must be a positive integer'),

    /**
     * The carrier's status. Only honoured when SHIPPING_PROVIDER=sandbox: with a
     * real carrier the status is re-read from GHN rather than trusted from a
     * caller holding the webhook secret.
     */
    Status: z.string().trim().optional(),

    /** Total shipping fee, in VND, when the carrier reports one. */
    TotalFee: z.coerce.number().nonnegative().optional(),

    /** The client order code the platform supplied when booking. */
    ClientOrderCode: z.string().trim().optional(),

    /** Chargeable weight in grams, when the carrier reports one. */
    Weight: z.coerce.number().nonnegative().optional(),

    /** When the carrier recorded the change. */
    Time: z.string().trim().optional(),
  })
  .passthrough();

export type GhnWebhookPayload = z.infer<typeof GhnWebhookSchema>;
