import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

/**
 * Data transfer object for Admin post-auction confirmation actions on an auction award.
 */
const adminAwardActionFields = {
  confirmed: z
    .boolean()
    .describe('Explicit admin confirmation flag for irreversible award actions')
    .meta({ example: true }),
  note: nullAsAbsent(
    z
      .string()
      .max(1000)
      .describe('Optional administrative note describing the action')
      .meta({ example: 'Người mua không hoàn tất thanh toán phần còn lại trong thời hạn 24 giờ.' }),
  ),
};

export const AdminAwardActionSchema = z.object(adminAwardActionFields).strict();

export type AdminAwardActionInput = z.infer<typeof AdminAwardActionSchema>;
