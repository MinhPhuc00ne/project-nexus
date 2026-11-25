import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { ProductStatus } from '@prisma/client';
import { ProductOptionSchema } from './product-features.dto';

const updateProductFields = {
  options: nullAsAbsent(z.array(ProductOptionSchema).max(6)),
  title: nullAsAbsent(z.string().meta({ example: 'Đồng Hồ Audemars Piguet Skeleton New Edition' })),
  description: nullAsAbsent(z.string().meta({ example: 'Mô tả cập nhật' })),
  basePrice: nullAsAbsent(z.coerce.number().min(1000).meta({ example: 130000000 })),
  categoryId: nullAsAbsent(z.string().meta({ example: 'uuid-category-id' })),
  quantity: nullAsAbsent(
    z.coerce
      .number()
      .int()
      .min(0)
      .describe('Số lượng tồn kho cập nhật (thay đổi số lượng thực tế trong kho)')
      .meta({ example: 10 }),
  ),
  images: nullAsAbsent(
    z
      .array(z.string())
      .max(5)
      .meta({ example: ['https://res.cloudinary.com/demo/image/upload/v1/watch.jpg'] }),
  ),
  status: nullAsAbsent(z.enum(ProductStatus).meta({ example: ProductStatus.ACTIVE })),
  weightGrams: nullAsAbsent(z.coerce.number().int().min(1).meta({ example: 500 })),
  lengthCm: nullAsAbsent(z.coerce.number().int().min(1).meta({ example: 15 })),
  widthCm: nullAsAbsent(z.coerce.number().int().min(1).meta({ example: 10 })),
  heightCm: nullAsAbsent(z.coerce.number().int().min(1).meta({ example: 8 })),
  threeModelKey: nullAsAbsent(z.string().meta({ example: 'watch' })),
};

export const UpdateProductSchema = z.object(updateProductFields).strict();

export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
