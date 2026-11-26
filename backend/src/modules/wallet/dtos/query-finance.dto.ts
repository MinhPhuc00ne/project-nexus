import { WalletTransactionStatus, WalletTransactionType } from '@prisma/client';
import { z } from 'zod';

/**
 * Filters for a wallet's transaction list.
 *
 * `page` and `limit` carried a TypeScript default and no validation at all, so
 * `?page=abc` reached the query as NaN and `?page=-5` as a negative offset.
 * They are coerced and floored here, which is what the other paged queries in
 * the codebase already did.
 */
export const QueryFinanceSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1).meta({ example: 1 }),
    limit: z.coerce.number().int().min(1).max(100).default(10).meta({ example: 10 }),
    type: z
      .enum(WalletTransactionType)
      .optional()
      .describe(
        'Lọc theo loại giao dịch ví: DEPOSIT, WITHDRAW, ESCROW_LOCK, ESCROW_PAYOUT, ESCROW_REFUND',
      ),
    status: z
      .enum(WalletTransactionStatus)
      .optional()
      .describe('Lọc theo trạng thái: PENDING, SUCCESS, FAILED'),
  })
  .strict();

export type QueryFinanceInput = z.infer<typeof QueryFinanceSchema>;
