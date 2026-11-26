import { z } from 'zod';
import { httpUrl, nullAsAbsent } from '../../../core/validation/query-schemas';

const updateShopProfileFields = {
  shopAvatarUrl: nullAsAbsent(
    httpUrl.nullable().describe('Avatar riêng của gian hàng, không đổi avatar cá nhân'),
  ),
  storeName: nullAsAbsent(
    z
      .string()
      .describe('Tên gian hàng / thương hiệu của người bán')
      .meta({ example: 'Gốm Sứ Bát Tràng Store - Chi nhánh HCM' }),
  ),
  storeDescription: nullAsAbsent(
    z.string().describe('Mô tả chi tiết gian hàng').meta({
      example:
        'Chuyên cung cấp các sản phẩm gốm sứ phong thủy, bình hoa mỹ nghệ cao cấp chuẩn Bát Tràng.',
    }),
  ),
  phone: nullAsAbsent(
    z
      .string()
      .describe('Số điện thoại liên hệ của cửa hàng / hotline')
      .meta({ example: '0987654321' }),
  ),
  businessEmail: nullAsAbsent(
    z
      .email()
      .describe('Email liên hệ kinh doanh của shop')
      .meta({ example: 'contact@battrangceramics.vn' }),
  ),
  street: nullAsAbsent(
    z
      .string()
      .describe('Địa chỉ cụ thể / số nhà, tên đường của kho / cửa hàng')
      .meta({ example: '720A Điện Biên Phủ' }),
  ),
  ward: nullAsAbsent(z.string().describe('Phường/Xã').meta({ example: 'Phường 22' })),
  district: nullAsAbsent(z.string().describe('Quận/Huyện').meta({ example: 'Quận Bình Thạnh' })),
  city: nullAsAbsent(z.string().describe('Tỉnh/Thành phố').meta({ example: 'TP. Hồ Chí Minh' })),
  latitude: nullAsAbsent(z.coerce.number().describe('Vĩ độ GPS bản đồ').meta({ example: 10.795 })),
  longitude: nullAsAbsent(
    z.coerce.number().describe('Kinh độ GPS bản đồ').meta({ example: 106.721 }),
  ),
  formattedAddress: nullAsAbsent(
    z
      .string()
      .describe('Địa chỉ đầy đủ định dạng chuẩn bản đồ')
      .meta({ example: 'Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP. Hồ Chí Minh' }),
  ),
  placeId: nullAsAbsent(z.string().describe('Place ID').meta({ example: 'ChIJ_landmark81_hcm' })),
};

export const UpdateShopProfileSchema = z.object(updateShopProfileFields).strict();

export type UpdateShopProfileInput = z.infer<typeof UpdateShopProfileSchema>;
