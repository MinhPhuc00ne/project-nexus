import { z } from 'zod';
import { ShippingAddressSchema } from '../../orders/dtos/checkout.dto';

/** The three ways a winner can say where their lot should go. */
const addressFields = {
  /** A saved address, which is all that is needed when one is chosen. */
  addressId: z.uuid().optional().describe('Saved user address ID'),

  /** A whole address nested as an object. */
  shippingAddress: ShippingAddressSchema.optional(),

  recipientName: z.string().trim().min(1).optional().meta({ example: 'Nguyễn Văn A' }),
  phone: z.string().trim().min(1).optional().meta({ example: '0987654321' }),
  city: z.string().trim().min(1).optional().meta({ example: 'TP. Hồ Chí Minh' }),
  district: z.string().optional().meta({ example: 'Quận 1' }),
  ward: z.string().optional().meta({ example: 'Phường Bến Nghé' }),
  street: z.string().trim().min(1).optional().meta({ example: '123 Lê Lợi' }),
  country: z.enum(['VN']).optional(),

  /** Kept for older clients; the fee comes from the carrier, not the request. */
  shippingFee: z.coerce.number().min(0).optional(),
};

/** The flat fields that together make up an address spelled out in the body. */
const FLAT_REQUIRED = ['recipientName', 'phone', 'city', 'street'] as const;

/**
 * Quoting or completing checkout of a won auction lot.
 *
 * The address may arrive three ways: a saved `addressId`, a nested
 * `shippingAddress`, or the fields spelled out flat. The class said this with
 * `@ValidateIf(hasFlatAddressFields)` on four fields — a predicate each field
 * re-evaluated over the whole object, which meant the rule "if you spell the
 * address out, spell all of it out" was spread across four decorators and
 * readable from none of them.
 *
 * Here it is one check on the object, and it names the fields it is missing.
 */
export const CheckoutAuctionAwardSchema = z
  .object(addressFields)
  .strict()
  .superRefine((value, ctx) => {
    if (value.addressId || value.shippingAddress) return;
    const given = FLAT_REQUIRED.filter((field) => value[field] !== undefined);
    if (given.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message:
          'Provide addressId, shippingAddress, or the recipient name, phone, city and street.',
      });
      return;
    }
    for (const field of FLAT_REQUIRED) {
      if (value[field] === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: `${field} is required when the address is given as separate fields.`,
        });
      }
    }
  });

export type CheckoutAuctionAwardInput = z.infer<typeof CheckoutAuctionAwardSchema>;
