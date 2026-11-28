import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const shippingItemFields = {
  productId: z.string().describe('Product ID'),
  quantity: z.number().int().min(1).describe('Item quantity').default(1),
  weightGrams: z.number().min(1).describe('Weight in grams').default(500),
  lengthCm: z.number().describe('Length (cm)').default(10),
  widthCm: z.number().describe('Width (cm)').default(10),
  heightCm: z.number().describe('Height (cm)').default(10),
};

export const ShippingItemSchema = z.object(shippingItemFields).strict();

export type ShippingItemInput = z.infer<typeof ShippingItemSchema>;

const shippingQuoteFields = {
  addressId: nullAsAbsent(z.string().describe('Saved recipient address ID (UserAddress)')),
  warehouseId: nullAsAbsent(z.string().describe('Origin warehouse ID (defaults to WH_001)')),
  sellerId: nullAsAbsent(z.string().describe('Seller ID for shop origin lookup')),
  originLatitude: nullAsAbsent(z.number().describe('Origin GPS latitude')),
  originLongitude: nullAsAbsent(z.number().describe('Origin GPS longitude')),
  destLatitude: nullAsAbsent(z.number().describe('Destination GPS latitude')),
  destLongitude: nullAsAbsent(z.number().describe('Destination GPS longitude')),
  fromDistrictId: nullAsAbsent(z.number().describe('Origin GHN district ID')),
  fromWardCode: nullAsAbsent(z.string().describe('Origin GHN ward code')),
  toDistrictId: nullAsAbsent(z.number().describe('Destination GHN district ID')),
  toWardCode: nullAsAbsent(z.string().describe('Destination GHN ward code')),
  items: z.array(ShippingItemSchema).describe('Items to quote shipping fees for'),
};

export const ShippingQuoteSchema = z.object(shippingQuoteFields).strict();

export type ShippingQuoteInput = z.infer<typeof ShippingQuoteSchema>;

const directDistanceFields = {
  originLat: z.number().describe('Origin latitude').meta({ example: 10.7769 }),
  originLon: z.number().describe('Origin longitude').meta({ example: 106.7009 }),
  destLat: z.number().describe('Destination latitude').meta({ example: 10.7327 }),
  destLon: z.number().describe('Destination longitude').meta({ example: 106.717 }),
  weightGrams: z.number().describe('Total parcel weight (grams)').default(500),
};

export const DirectDistanceSchema = z.object(directDistanceFields).strict();

export type DirectDistanceInput = z.infer<typeof DirectDistanceSchema>;

const ghnFeeItemFields = {
  name: z.string().trim().min(1),
  quantity: z.number().int().min(1),
  weight: z.number().int().min(1).describe('Item or parcel weight, grams'),
  length: z.number().int().min(1).describe('Length, cm'),
  width: z.number().int().min(1).describe('Width, cm'),
  height: z.number().int().min(1).describe('Height, cm'),
  price: z.number().int().min(0),
};

export const GhnFeeItemSchema = z.object(ghnFeeItemFields).strict();

export type GhnFeeItemInput = z.infer<typeof GhnFeeItemSchema>;

const calculateGhnFeeFields = {
  toDistrictId: z
    .number()
    .int()
    .min(1)
    .describe('Destination GHN District ID')
    .meta({ example: 1444 }),
  toWardCode: z
    .string()
    .trim()
    .min(1)
    .describe('Destination GHN Ward Code')
    .meta({ example: '20308' }),
  fromDistrictId: nullAsAbsent(
    z
      .number()
      .describe('Origin GHN District ID (auto-resolved from seller shop/warehouse if omitted)')
      .meta({ example: 1442 }),
  ),
  fromWardCode: nullAsAbsent(
    z.string().describe('Origin GHN Ward Code').meta({ example: '20101' }),
  ),
  weightGrams: z
    .number()
    .int()
    .min(1)
    .describe('Parcel weight in grams')
    .meta({ example: 1000 })
    .default(500),
  lengthCm: z.number().min(1).describe('Parcel length (cm)').meta({ example: 20 }).default(10),
  widthCm: z.number().min(1).describe('Parcel width (cm)').meta({ example: 15 }).default(10),
  heightCm: z.number().min(1).describe('Parcel height (cm)').meta({ example: 10 }).default(10),
  insuranceValue: z
    .number()
    .min(0)
    .describe('Declared insurance value (VND)')
    .meta({ example: 500000 })
    .default(0),
  serviceTypeId: nullAsAbsent(
    z
      .union([z.literal(2), z.literal(5)])
      .describe(
        'GHN service type: 2 (light goods), 5 (heavy or multi-parcel). Omit to auto-select by weight.',
      )
      .meta({ example: 2 }),
  ),
  items: nullAsAbsent(
    z.array(GhnFeeItemSchema).describe('Required for GHN heavy-goods service type 5'),
  ),
};

export const CalculateGhnFeeSchema = z.object(calculateGhnFeeFields).strict();

export type CalculateGhnFeeInput = z.infer<typeof CalculateGhnFeeSchema>;
