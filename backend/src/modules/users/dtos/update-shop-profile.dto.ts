import { z } from 'zod';
import { httpUrl, nullAsAbsent } from '../../../core/validation/query-schemas';

const updateShopProfileFields = {
  shopAvatarUrl: nullAsAbsent(
    httpUrl.nullable().describe('Dedicated shop avatar URL (does not alter personal avatar)'),
  ),
  storeName: nullAsAbsent(
    z
      .string()
      .describe('Seller shop or brand name')
      .meta({ example: 'Bat Trang Ceramics Store - HCM Branch' }),
  ),
  storeDescription: nullAsAbsent(
    z.string().describe('Detailed shop description').meta({
      example: 'Curated ceramic art, handcrafted vases, and authentic collector pieces.',
    }),
  ),
  phone: nullAsAbsent(
    z.string().describe('Shop contact phone or hotline').meta({ example: '0987654321' }),
  ),
  businessEmail: nullAsAbsent(
    z
      .email()
      .describe('Shop business contact email')
      .meta({ example: 'contact@battrangceramics.vn' }),
  ),
  street: nullAsAbsent(
    z.string().describe('Warehouse or shop street address').meta({ example: '720A Dien Bien Phu' }),
  ),
  ward: nullAsAbsent(z.string().describe('Ward').meta({ example: 'Ward 22' })),
  district: nullAsAbsent(z.string().describe('District').meta({ example: 'Binh Thanh District' })),
  city: nullAsAbsent(z.string().describe('Province or city').meta({ example: 'Ho Chi Minh City' })),
  latitude: nullAsAbsent(z.coerce.number().describe('Map GPS latitude').meta({ example: 10.795 })),
  longitude: nullAsAbsent(
    z.coerce.number().describe('Map GPS longitude').meta({ example: 106.721 }),
  ),
  formattedAddress: nullAsAbsent(
    z
      .string()
      .describe('Full standardized map address')
      .meta({ example: 'Landmark 81, 720A Dien Bien Phu, Ward 22, Binh Thanh, Ho Chi Minh City' }),
  ),
  placeId: nullAsAbsent(z.string().describe('Place ID').meta({ example: 'ChIJ_landmark81_hcm' })),
};

export const UpdateShopProfileSchema = z.object(updateShopProfileFields).strict();

export type UpdateShopProfileInput = z.infer<typeof UpdateShopProfileSchema>;
