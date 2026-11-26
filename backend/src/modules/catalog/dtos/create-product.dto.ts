import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { ProductOptionSchema } from './product-features.dto';

const createProductFields = {
  options: nullAsAbsent(
    z
      .array(ProductOptionSchema)
      .max(6)
      .describe('Màu, size... dùng chung giá và tồn kho của sản phẩm'),
  ),
  title: z.string().trim().min(1).meta({ example: 'Đồng Hồ Audemars Piguet Skeleton' }),
  description: z.string().trim().min(1).meta({ example: 'Phiên bản lộ cơ cao cấp chuẩn Thụy Sĩ' }),
  basePrice: z.coerce
    .number()
    .min(1000)
    .describe('Giá bán cơ sở (VNĐ)')
    .meta({ example: 125000000 }),
  categoryId: z
    .string()
    .trim()
    .min(1)
    .describe('ID danh mục sản phẩm')
    .meta({ example: 'uuid-category-id' }),
  quantity: z.coerce
    .number()
    .int()
    .min(1)
    .describe('Số lượng tồn kho ban đầu')
    .meta({ example: 4 }),
  images: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe('Danh sách URL ảnh sản phẩm (tối đa 5 ảnh)')
    .meta({ example: ['https://res.cloudinary.com/demo/image/upload/v1/watch.jpg'] }),
  weightGrams: nullAsAbsent(
    z.coerce.number().int().min(1).describe('Khối lượng (grams)').meta({ example: 500 }),
  ),
  lengthCm: nullAsAbsent(
    z.coerce.number().int().min(1).describe('Chiều dài (cm)').meta({ example: 15 }),
  ),
  widthCm: nullAsAbsent(
    z.coerce.number().int().min(1).describe('Chiều rộng (cm)').meta({ example: 10 }),
  ),
  heightCm: nullAsAbsent(
    z.coerce.number().int().min(1).describe('Chiều cao (cm)').meta({ example: 8 }),
  ),
  threeModelKey: nullAsAbsent(
    z.string().describe('Key model 3D (nếu có)').meta({ example: 'watch' }),
  ),
};

export const CreateProductSchema = z.object(createProductFields).strict();

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
