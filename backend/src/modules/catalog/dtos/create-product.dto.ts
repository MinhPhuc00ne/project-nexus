import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { ProductOptionSchema } from './product-features.dto';

const createProductFields = {
  options: nullAsAbsent(
    z
      .array(ProductOptionSchema)
      .max(6)
      .describe('Product options (e.g., color, size) sharing price and stock'),
  ),
  title: z.string().trim().min(1).meta({ example: 'Audemars Piguet Skeleton Watch' }),
  description: z.string().trim().min(1).meta({ example: 'Swiss luxury skeleton mechanical watch' }),
  basePrice: z.coerce.number().min(1000).describe('Base price (VND)').meta({ example: 125000000 }),
  categoryId: z
    .string()
    .trim()
    .min(1)
    .describe('Product category ID')
    .meta({ example: 'uuid-category-id' }),
  quantity: z.coerce.number().int().min(1).describe('Initial stock quantity').meta({ example: 4 }),
  images: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe('Product image URLs (max 5)')
    .meta({ example: ['https://res.cloudinary.com/demo/image/upload/v1/watch.jpg'] }),
  weightGrams: nullAsAbsent(
    z.coerce.number().int().min(1).describe('Weight (grams)').meta({ example: 500 }),
  ),
  lengthCm: nullAsAbsent(
    z.coerce.number().int().min(1).describe('Length (cm)').meta({ example: 15 }),
  ),
  widthCm: nullAsAbsent(
    z.coerce.number().int().min(1).describe('Width (cm)').meta({ example: 10 }),
  ),
  heightCm: nullAsAbsent(
    z.coerce.number().int().min(1).describe('Height (cm)').meta({ example: 8 }),
  ),
  threeModelKey: nullAsAbsent(
    z.string().describe('3D model key (optional)').meta({ example: 'watch' }),
  ),
};

export const CreateProductSchema = z.object(createProductFields).strict();

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
