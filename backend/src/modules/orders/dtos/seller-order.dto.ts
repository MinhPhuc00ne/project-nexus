import { z } from 'zod';
import { OrderStatus } from '@prisma/client';

export const QuerySellerOrdersSchema = z
  .object({
    status: z.enum(OrderStatus).describe('Filter by order status').optional(),
    search: z.string().describe('Search by order code, buyer name, or phone number').optional(),
    page: z.coerce.number().int().min(1).describe('Page number (1-based)').default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .describe('Orders per page (1 - 100)')
      .default(10),
  })
  .strict();

export type QuerySellerOrdersInput = z.infer<typeof QuerySellerOrdersSchema>;
