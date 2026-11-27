import { z } from 'zod';
import { PaymentProviderSchema } from '../enums/index.js';

export const ShippingAddressSchema = z
  .object({
    country: z.enum(['VN']).default('VN'),
    recipientName: z
      .string()
      .trim()
      .min(1)
      .describe('Recipient full name')
      .meta({ example: 'Alex Morgan' }),
    phone: z
      .string()
      .trim()
      .min(1)
      .describe('Recipient phone number')
      .meta({ example: '0987654321' }),
    city: z
      .string()
      .trim()
      .min(1)
      .describe('Province or city')
      .meta({ example: 'Ho Chi Minh City' }),
    district: z.string().describe('District').meta({ example: 'District 1' }).optional(),
    ward: z.string().describe('Ward or commune').meta({ example: 'Ben Nghe Ward' }).optional(),
    street: z
      .string()
      .trim()
      .min(1)
      .describe('Street address and building number')
      .meta({ example: '123 Le Loi Street' }),
  })
  .strict();

export type ShippingAddressInput = z.infer<typeof ShippingAddressSchema>;

export const CheckoutSchema = z
  .object({
    shippingAddress: ShippingAddressSchema.describe('Shipping address details'),
    itemIds: z
      .array(z.string())
      .describe('List of CartItem IDs to check out (defaults to the entire cart when omitted)')
      .meta({ example: ['item-uuid-1', 'item-uuid-2'] })
      .optional(),
    shippingFee: z
      .number()
      .min(0)
      .describe(
        'Retained for legacy request compatibility only. Backend ignores this value and calculates shipping via GHN.',
      )
      .optional(),
    paymentMethod: PaymentProviderSchema.describe('Initial payment method')
      .meta({ example: 'PAYOS' })
      .default('PAYOS'),
    returnUrl: z
      .string()
      .describe('Redirect URL when PayOS payment succeeds')
      .meta({ example: 'http://localhost:5173/payment/success' })
      .optional(),
    cancelUrl: z
      .string()
      .describe('Redirect URL when the user cancels on PayOS')
      .meta({ example: 'http://localhost:5173/payment/cancel' })
      .optional(),
  })
  .strict();

export type CheckoutInput = z.infer<typeof CheckoutSchema>;
