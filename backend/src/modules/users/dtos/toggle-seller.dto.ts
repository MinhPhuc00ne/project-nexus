import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const toggleSellerFields = {
  isSellerActive: nullAsAbsent(
    z
      .boolean()
      .describe(
        'Seller mode flag (true: Seller mode, false: Buyer mode). Toggles current state if omitted.',
      )
      .meta({ example: true }),
  ),
};

export const ToggleSellerSchema = z.object(toggleSellerFields).strict();

export type ToggleSellerInput = z.infer<typeof ToggleSellerSchema>;
