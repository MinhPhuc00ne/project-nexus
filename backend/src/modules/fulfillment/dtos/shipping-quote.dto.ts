import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const shippingItemFields = {
  productId: z.string().describe('Mã ID sản phẩm'),
  quantity: z.number().int().min(1).describe('Số lượng món hàng').default(1),
  weightGrams: z.number().min(1).describe('Khối lượng tính theo gram').default(500),
  lengthCm: z.number().describe('Chiều dài (cm)').default(10),
  widthCm: z.number().describe('Chiều rộng (cm)').default(10),
  heightCm: z.number().describe('Chiều cao (cm)').default(10),
};

export const ShippingItemSchema = z.object(shippingItemFields).strict();

export type ShippingItemInput = z.infer<typeof ShippingItemSchema>;

const shippingQuoteFields = {
  addressId: nullAsAbsent(
    z.string().describe('Mã địa chỉ người nhận trong sổ địa chỉ (UserAddress)'),
  ),
  warehouseId: nullAsAbsent(z.string().describe('Mã kho gửi hàng (mặc định WH_001)')),
  sellerId: nullAsAbsent(z.string().describe('Mã người bán (để tính khoảng cách từ gian hàng)')),
  originLatitude: nullAsAbsent(z.number().describe('Vĩ độ điểm gửi (GPS Latitude)')),
  originLongitude: nullAsAbsent(z.number().describe('Kinh độ điểm gửi (GPS Longitude)')),
  destLatitude: nullAsAbsent(z.number().describe('Vĩ độ điểm nhận (GPS Latitude)')),
  destLongitude: nullAsAbsent(z.number().describe('Kinh độ điểm nhận (GPS Longitude)')),
  fromDistrictId: nullAsAbsent(z.number().describe('Mã quận/huyện người gửi GHN')),
  fromWardCode: nullAsAbsent(z.string().describe('Mã phường/xã người gửi GHN')),
  toDistrictId: nullAsAbsent(z.number().describe('Mã quận/huyện người nhận GHN')),
  toWardCode: nullAsAbsent(z.string().describe('Mã phường/xã người nhận GHN')),
  items: z.array(ShippingItemSchema).describe('Danh sách sản phẩm cần tính cước vận chuyển'),
};

export const ShippingQuoteSchema = z.object(shippingQuoteFields).strict();

export type ShippingQuoteInput = z.infer<typeof ShippingQuoteSchema>;

const directDistanceFields = {
  originLat: z.number().describe('Vĩ độ điểm xuất phát (Latitude)').meta({ example: 10.7769 }),
  originLon: z.number().describe('Kinh độ điểm xuất phát (Longitude)').meta({ example: 106.7009 }),
  destLat: z.number().describe('Vĩ độ điểm đến (Latitude)').meta({ example: 10.7327 }),
  destLon: z.number().describe('Kinh độ điểm đến (Longitude)').meta({ example: 106.717 }),
  weightGrams: z
    .number()
    .describe('Tổng trọng lượng hàng hóa (gram) để tính cước kèm theo')
    .default(500),
};

export const DirectDistanceSchema = z.object(directDistanceFields).strict();

export type DirectDistanceInput = z.infer<typeof DirectDistanceSchema>;

const ghnFeeItemFields = {
  name: z.string().trim().min(1),
  quantity: z.number().int().min(1),
  weight: z.number().int().min(1).describe('Khối lượng một sản phẩm/kiện, gram'),
  length: z.number().int().min(1).describe('Chiều dài, cm'),
  width: z.number().int().min(1).describe('Chiều rộng, cm'),
  height: z.number().int().min(1).describe('Chiều cao, cm'),
  price: z.number().int().min(0),
};

export const GhnFeeItemSchema = z.object(ghnFeeItemFields).strict();

export type GhnFeeItemInput = z.infer<typeof GhnFeeItemSchema>;

const calculateGhnFeeFields = {
  toDistrictId: z
    .number()
    .int()
    .min(1)
    .describe('Mã Quận/Huyện nhận hàng (GHN District ID)')
    .meta({ example: 1444 }),
  toWardCode: z
    .string()
    .trim()
    .min(1)
    .describe('Mã Phường/Xã nhận hàng (GHN Ward Code)')
    .meta({ example: '20308' }),
  fromDistrictId: nullAsAbsent(
    z
      .number()
      .describe('Mã Quận/Huyện gửi hàng (nếu bỏ trống hệ thống tự lấy theo kho/shop người bán)')
      .meta({ example: 1442 }),
  ),
  fromWardCode: nullAsAbsent(
    z.string().describe('Mã Phường/Xã gửi hàng').meta({ example: '20101' }),
  ),
  weightGrams: z
    .number()
    .int()
    .min(1)
    .describe('Trọng lượng gói hàng tính theo gram')
    .meta({ example: 1000 })
    .default(500),
  lengthCm: z
    .number()
    .min(1)
    .describe('Chiều dài kiện hàng (cm)')
    .meta({ example: 20 })
    .default(10),
  widthCm: z
    .number()
    .min(1)
    .describe('Chiều rộng kiện hàng (cm)')
    .meta({ example: 15 })
    .default(10),
  heightCm: z
    .number()
    .min(1)
    .describe('Chiều cao kiện hàng (cm)')
    .meta({ example: 10 })
    .default(10),
  insuranceValue: z
    .number()
    .min(0)
    .describe('Giá trị khai giá / bảo hiểm hàng hóa (VNĐ)')
    .meta({ example: 500000 })
    .default(0),
  serviceTypeId: nullAsAbsent(
    z
      .union([z.literal(2), z.literal(5)])
      .describe(
        'Dịch vụ GHN: 2 (hàng nhẹ), 5 (hàng nặng/nhiều kiện). Bỏ trống để chọn theo khối lượng.',
      )
      .meta({ example: 2 }),
  ),
  items: nullAsAbsent(z.array(GhnFeeItemSchema).describe('Bắt buộc với dịch vụ hàng nặng GHN')),
};

export const CalculateGhnFeeSchema = z.object(calculateGhnFeeFields).strict();

export type CalculateGhnFeeInput = z.infer<typeof CalculateGhnFeeSchema>;
