import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const sellerPickupFields = {
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(1).max(20),
  city: z.string().trim().min(1).max(120),
  district: z.string().trim().min(1).max(120),
  ward: z.string().trim().min(1).max(120),
  street: z.string().trim().min(1).max(500),
  latitude: nullAsAbsent(z.number().min(-90).max(90)),
  longitude: nullAsAbsent(z.number().min(-180).max(180)),
};

export const SellerPickupSchema = z.object(sellerPickupFields).strict();

export type SellerPickupInput = z.infer<typeof SellerPickupSchema>;

const verifySellerPickupFields = {
  ghnShopId: z
    .number()
    .int()
    .min(1)
    .describe('GHN Shop ID created for this pickup point under the platform account'),
};

export const VerifySellerPickupSchema = z.object(verifySellerPickupFields).strict();

export type VerifySellerPickupInput = z.infer<typeof VerifySellerPickupSchema>;

const ghnShopPageFields = {
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(100),
};

export const GhnShopPageSchema = z.object(ghnShopPageFields).strict();

export type GhnShopPageInput = z.infer<typeof GhnShopPageSchema>;
