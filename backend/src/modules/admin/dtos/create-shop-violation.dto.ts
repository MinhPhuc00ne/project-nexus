import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { ShopViolationPenaltyLevel, ViolationStatus } from '@prisma/client';

const createShopViolationFields = {
  title: z
    .string()
    .trim()
    .min(1)
    .describe('Shop violation title')
    .meta({ example: 'Selling counterfeit trademarked goods' }),
  description: z.string().trim().min(1).describe('Detailed violation description').meta({
    example:
      'The shop listed trademark-infringing products without providing authentic supplier invoices.',
  }),
  evidenceUrls: nullAsAbsent(
    z
      .array(z.string())
      .describe('List of image or document URLs evidencing the violation')
      .meta({ example: ['https://example.com/evidence1.jpg', 'https://example.com/report.pdf'] }),
  ),
  penaltyLevel: nullAsAbsent(
    z
      .enum(ShopViolationPenaltyLevel)
      .describe(
        'Violation penalty level: WARNING, PENALTY_POINTS, TEMPORARY_SUSPENSION, PERMANENT_BAN, MISREPRESENTATION, FRAUD',
      )
      .meta({ example: ShopViolationPenaltyLevel.TEMPORARY_SUSPENSION }),
  ),
  status: z
    .enum(ViolationStatus)
    .describe('Violation status: PENDING, INVESTIGATING, CONFIRMED, DISMISSED')
    .meta({ example: ViolationStatus.CONFIRMED })
    .default(ViolationStatus.CONFIRMED),
  resolutionNotes: nullAsAbsent(
    z.string().describe('Administrator resolution notes').meta({
      example:
        'Verified with brand owner, temporarily hid infringing listings, and issued a shop warning.',
    }),
  ),
};

export const CreateShopViolationSchema = z.object(createShopViolationFields).strict();

export type CreateShopViolationInput = z.infer<typeof CreateShopViolationSchema>;
