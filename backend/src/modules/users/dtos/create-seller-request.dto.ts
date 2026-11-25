import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const createSellerRequestFields = {
  /**
   * The proof document, when it is uploaded rather than linked.
   *
   * Multer takes the file off the body before the schema sees it, so there is
   * nothing here to validate — but the field has to appear in the schema, or
   * the upload disappears from the published API: `@ZodBody` replaces whatever
   * `@ApiBody` documented, and `ApiBodyOptions` has no `standardSchema`.
   */
  file: z.any().optional().meta({
    type: 'string',
    format: 'binary',
    description: 'File chứng minh (ảnh CCCD/CMND, giấy phép kinh doanh, hợp đồng thương nhân...)',
  }),
  storeName: z
    .string()
    .trim()
    .min(1)
    .describe('Tên gian hàng / thương hiệu của người bán')
    .meta({ example: 'Cổ Vật Hoàng Gia Store' }),
  storeDescription: nullAsAbsent(
    z.string().describe('Mô tả ngắn gọn về gian hàng và sản phẩm dự định kinh doanh').meta({
      example: 'Chuyên cung cấp đồ cổ sưu tầm, kỷ vật lịch sử và các tác phẩm gốm sứ độc bản.',
    }),
  ),
  phone: z
    .string()
    .trim()
    .min(1)
    .describe('Số điện thoại liên hệ của cửa hàng / người bán')
    .meta({ example: '0987654321' }),
  businessEmail: nullAsAbsent(
    z
      .email()
      .describe('Email liên hệ công việc / cửa hàng (nếu khác email tài khoản)')
      .meta({ example: 'shop@hoanggiavintage.com' }),
  ),
  identityCardNumber: nullAsAbsent(
    z
      .string()
      .describe('Số CMND/CCCD hoặc Mã số định danh doanh nghiệp để xác minh danh tính')
      .meta({ example: '001202008888' }),
  ),
  attachmentUrl: nullAsAbsent(
    z
      .string()
      .describe(
        'Đường dẫn file hoặc tài liệu chứng minh đã tải lên (nếu không tải qua multipart form-data)',
      )
      .meta({ example: '/uploads/seller-proofs/proof-1728123456789.png' }),
  ),
  street: z
    .string()
    .trim()
    .min(1)
    .describe('Địa chỉ cụ thể / số nhà, tên đường của cửa hàng hoặc kho lấy hàng')
    .meta({ example: '720A Điện Biên Phủ' }),
  ward: nullAsAbsent(
    z.string().describe('Phường / Xã của cửa hàng').meta({ example: 'Phường 22' }),
  ),
  district: nullAsAbsent(
    z.string().describe('Quận / Huyện của cửa hàng').meta({ example: 'Quận Bình Thạnh' }),
  ),
  city: z
    .string()
    .trim()
    .min(1)
    .describe('Tỉnh / Thành phố của cửa hàng')
    .meta({ example: 'TP. Hồ Chí Minh' }),
  latitude: nullAsAbsent(
    z.coerce
      .number()
      .describe('Vĩ độ GPS (Latitude) định vị gian hàng trên bản đồ')
      .meta({ example: 10.795 }),
  ),
  longitude: nullAsAbsent(
    z.coerce
      .number()
      .describe('Kinh độ GPS (Longitude) định vị gian hàng trên bản đồ')
      .meta({ example: 106.721 }),
  ),
  formattedAddress: nullAsAbsent(
    z
      .string()
      .describe('Địa chỉ chuẩn hóa đầy đủ từ bản đồ toàn cầu (Google Maps / OSM)')
      .meta({ example: 'Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP. Hồ Chí Minh' }),
  ),
  placeId: nullAsAbsent(z.string().describe('Place ID bản đồ').meta({ example: 'ChIJw8qV...' })),
};

export const CreateSellerRequestSchema = z.object(createSellerRequestFields).strict();

export type CreateSellerRequestInput = z.infer<typeof CreateSellerRequestSchema>;
