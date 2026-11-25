import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { ApiProperty } from '@nestjs/swagger';
import { PenaltyType, ReputationTrustLevel } from '@prisma/client';

/**
 * Data transfer object for adjusting a user's reputation score.
 */
const adjustReputationFields = {
  userId: z.string().describe('Target user unique identifier').meta({ example: 'usr_abc123' }),
  deltaPoints: z
    .number()
    .int()
    .min(-2147483648)
    .max(2147483647)
    .describe('Score delta to increment (positive) or decrement (negative)')
    .meta({ example: 2 }),
  reason: z
    .string()
    .describe('Audit explanation reason for score modification')
    .meta({ example: 'Completed escrow order delivery #ord_123' }),
  penaltyType: nullAsAbsent(
    z
      .enum(PenaltyType)
      .describe('Infraction category when applying a penalty deduction')
      .meta({ example: PenaltyType.ORDER_CANCELLATION }),
  ),
  referenceId: nullAsAbsent(
    z
      .string()
      .describe('Associated domain entity identifier (e.g. orderId, auctionId)')
      .meta({ example: 'ord_123' }),
  ),
  skipNotification: nullAsAbsent(
    z
      .boolean()
      .describe('Whether to suppress sending an in-app notification to the user')
      .meta({ example: false }),
  ),
};

export const AdjustReputationSchema = z.object(adjustReputationFields).strict();

export type AdjustReputationInput = z.infer<typeof AdjustReputationSchema>;

/**
 * Category keys for granular profile completion reputation rewards.
 */
export type ProfileCompletionField = 'FULL_NAME' | 'AVATAR' | 'PHONE' | 'BANK' | 'KYC_SELLER';

/**
 * Data transfer object for awarding profile completion reputation milestones.
 */
const awardProfileCompletionFields = {
  userId: z.string().describe('Target user unique identifier').meta({ example: 'usr_abc123' }),
  fieldKey: z
    .enum(['FULL_NAME', 'AVATAR', 'PHONE', 'BANK', 'KYC_SELLER'])
    .describe('Profile milestone attribute key')
    .meta({ example: 'PHONE' }),
  points: z
    .number()
    .min(1)
    .max(50)
    .describe('Points awarded for completing this milestone')
    .meta({ example: 10 }),
  reason: z
    .string()
    .describe('Descriptive reason recorded in reputation audit log')
    .meta({ example: 'Completed valid phone number profile registration' }),
};

export const AwardProfileCompletionSchema = z.object(awardProfileCompletionFields).strict();

export type AwardProfileCompletionInput = z.infer<typeof AwardProfileCompletionSchema>;

/**
 * Response payload summarizing a user's reputation standing and privileges.
 */
export class ReputationSummaryResponse {
  @ApiProperty({ description: 'Target user unique identifier', example: 'usr_abc123' })
  userId!: string;

  @ApiProperty({ description: 'Current nonnegative reputation score', example: 100 })
  score!: number;

  @ApiProperty({
    description: 'Current trust level tier classification',
    enum: ReputationTrustLevel,
    example: ReputationTrustLevel.GOOD,
  })
  trustLevel!: ReputationTrustLevel;

  @ApiProperty({
    description: 'Whether the seller store is administratively or automatically suspended',
    example: false,
  })
  isSuspended!: boolean;

  @ApiProperty({
    description:
      'Whether the user possesses active selling permissions (score >= 50 and not suspended)',
    example: true,
  })
  canSell!: boolean;

  @ApiProperty({
    description: 'Whether the shop possesses the excellent reputation badge (score >= 120)',
    example: true,
  })
  isVerifiedShop!: boolean;
}

/**
 * Query filter parameters for retrieving paginated user reputation audit logs.
 */
const queryReputationLogsFields = {
  page: z.number().min(1).describe('Page offset number (1-based)').meta({ example: 1 }).default(1),
  limit: z
    .number()
    .min(1)
    .max(100)
    .describe('Number of records per page')
    .meta({ example: 20 })
    .default(20),
};

export const QueryReputationLogsSchema = z.object(queryReputationLogsFields).strict();

export type QueryReputationLogsInput = z.infer<typeof QueryReputationLogsSchema>;
