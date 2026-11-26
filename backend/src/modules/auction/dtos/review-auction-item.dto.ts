import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

export enum ReviewAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

/**
 * Data transfer object used by Admin to approve or reject a consigned auction item.
 */
const reviewAuctionItemFields = {
  action: z
    .enum(ReviewAction)
    .describe('Review decision action: APPROVE or REJECT')
    .meta({ example: ReviewAction.APPROVE }),
  rejectionReason: nullAsAbsent(
    z
      .string()
      .trim()
      .min(1)
      .describe('Mandatory rejection rationale (required when action is REJECT)')
      .meta({
        example:
          'Appraisal certificate number cannot be verified in the national registry, and serial numbers do not match physical engravings.',
      }),
  ),
  lotNumber: nullAsAbsent(
    z.coerce
      .number()
      .int()
      .min(1)
      .describe('Assigned sequential lot number within the auction session (when approved)')
      .meta({ example: 1 }),
  ),
  startingPrice: nullAsAbsent(
    z.coerce
      .number()
      .min(1000)
      .describe(
        'Official starting bid price confirmed by admin (optional; defaults to proposed starting price)',
      )
      .meta({ example: 150000000 }),
  ),
  reservePrice: nullAsAbsent(
    z.coerce
      .number()
      .min(1000)
      .describe('Official minimum reserve price confirmed by admin')
      .meta({ example: 180000000 }),
  ),
  bidIncrement: nullAsAbsent(
    z.coerce
      .number()
      .min(1000)
      .describe('Official price increment per bid step confirmed by admin')
      .meta({ example: 2000000 }),
  ),
};

/**
 * A moderator's verdict on a consigned lot.
 *
 * The rejection reason is required only when the verdict is REJECT. The class
 * said so with `@ValidateIf((o) => o.action === REJECT)` on the field, so a rule
 * about two fields sat on one of them. It is one check over the object here.
 */
export const ReviewAuctionItemSchema = z
  .object(reviewAuctionItemFields)
  .strict()
  .superRefine((value, ctx) => {
    if (value.action !== ReviewAction.REJECT) return;
    if (value.rejectionReason && value.rejectionReason.trim().length > 0) return;
    ctx.addIssue({
      code: 'custom',
      path: ['rejectionReason'],
      message: 'rejectionReason must not be empty when rejecting an item',
    });
  });

export type ReviewAuctionItemInput = z.infer<typeof ReviewAuctionItemSchema>;
