import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const updateSystemSettingsFields = {
  platformFeePercentage: nullAsAbsent(
    z
      .number()
      .min(0)
      .max(100)
      .describe('Platform commission fee percentage collected from sellers (%)')
      .meta({ example: 7.0 }),
  ),
  cartExpirationDays: nullAsAbsent(
    z
      .number()
      .min(1)
      .max(90)
      .describe('Inactive cart expiration duration (days)')
      .meta({ example: 7 }),
  ),
  checkoutTimeoutMinutes: nullAsAbsent(
    z
      .number()
      .min(5)
      .max(120)
      .describe('Temporary inventory hold duration during checkout (minutes)')
      .meta({ example: 15 }),
  ),
  inventoryReservationTimeout: nullAsAbsent(
    z
      .number()
      .min(5)
      .max(240)
      .describe('Inventory reservation lock expiration duration (minutes)')
      .meta({ example: 30 }),
  ),
  maxActiveCartPerUser: nullAsAbsent(
    z.number().min(1).max(5).describe('Maximum active carts per user').meta({ example: 1 }),
  ),
  categoryMaxLevel: nullAsAbsent(
    z
      .number()
      .min(1)
      .max(5)
      .describe('Maximum product category hierarchy depth (levels)')
      .meta({ example: 3 }),
  ),
  maxProductImages: nullAsAbsent(
    z
      .number()
      .min(1)
      .max(20)
      .describe('Maximum number of images per product listing')
      .meta({ example: 5 }),
  ),
  antiSnipingTriggerMinutes: nullAsAbsent(
    z
      .number()
      .min(1)
      .max(30)
      .describe('Remaining time threshold that triggers auction anti-sniping extension (minutes)')
      .meta({ example: 2 }),
  ),
  antiSnipingExtendMinutes: nullAsAbsent(
    z
      .number()
      .min(1)
      .max(30)
      .describe('Extension duration added when anti-sniping triggers (minutes)')
      .meta({ example: 5 }),
  ),
};

export const UpdateSystemSettingsSchema = z.object(updateSystemSettingsFields).strict();

export type UpdateSystemSettingsInput = z.infer<typeof UpdateSystemSettingsSchema>;
