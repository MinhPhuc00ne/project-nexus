import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { WithdrawalStatus } from '@prisma/client';

const REVIEWABLE_WITHDRAWAL_STATUSES = [
  WithdrawalStatus.APPROVED,
  WithdrawalStatus.REJECTED,
  WithdrawalStatus.COMPLETED,
] as const;

const reviewWithdrawalFields = {
  status: z
    .enum(REVIEWABLE_WITHDRAWAL_STATUSES)
    .describe(
      'Review status: APPROVED, REJECTED (refunds wallet), or COMPLETED (bank transfer completed)',
    )
    .meta({ example: WithdrawalStatus.COMPLETED }),
  rejectionReason: nullAsAbsent(
    z
      .string()
      .describe('Rejection reason (required when status = REJECTED)')
      .meta({ example: 'Bank account number does not match the beneficiary account name' }),
  ),
  adminNote: nullAsAbsent(
    z
      .string()
      .describe('Administrator note')
      .meta({ example: 'Transferred via Vietcombank, ref: VCB12345678' }),
  ),
};

export const ReviewWithdrawalSchema = z.object(reviewWithdrawalFields).strict();

export type ReviewWithdrawalInput = z.infer<typeof ReviewWithdrawalSchema>;
