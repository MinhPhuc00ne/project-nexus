import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PenaltyType, ReputationTrustLevel } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Data transfer object for adjusting a user's reputation score.
 */
export class AdjustReputationDto {
  @ApiProperty({ description: 'Target user unique identifier', example: 'usr_abc123' })
  @IsString()
  userId!: string;

  @ApiProperty({
    description: 'Score delta to increment (positive) or decrement (negative)',
    example: 2,
  })
  @IsNumber()
  deltaPoints!: number;

  @ApiProperty({
    description: 'Audit explanation reason for score modification',
    example: 'Completed escrow order delivery #ord_123',
  })
  @IsString()
  reason!: string;

  @ApiPropertyOptional({
    description: 'Infraction category when applying a penalty deduction',
    enum: PenaltyType,
    example: PenaltyType.ORDER_CANCELLATION,
  })
  @IsOptional()
  @IsEnum(PenaltyType)
  penaltyType?: PenaltyType;

  @ApiPropertyOptional({
    description: 'Associated domain entity identifier (e.g. orderId, auctionId)',
    example: 'ord_123',
  })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional({
    description: 'Whether to suppress sending an in-app notification to the user',
    example: false,
  })
  @IsOptional()
  skipNotification?: boolean;
}

/**
 * Category keys for granular profile completion reputation rewards.
 */
export type ProfileCompletionField = 'FULL_NAME' | 'AVATAR' | 'PHONE' | 'BANK' | 'KYC_SELLER';

/**
 * Data transfer object for awarding profile completion reputation milestones.
 */
export class AwardProfileCompletionDto {
  @ApiProperty({ description: 'Target user unique identifier', example: 'usr_abc123' })
  @IsString()
  userId!: string;

  @ApiProperty({
    description: 'Profile milestone attribute key',
    example: 'PHONE',
    enum: ['FULL_NAME', 'AVATAR', 'PHONE', 'BANK', 'KYC_SELLER'],
  })
  @IsString()
  fieldKey!: ProfileCompletionField;

  @ApiProperty({ description: 'Points awarded for completing this milestone', example: 10 })
  @IsNumber()
  @Min(1)
  @Max(50)
  points!: number;

  @ApiProperty({
    description: 'Descriptive reason recorded in reputation audit log',
    example: 'Completed valid phone number profile registration',
  })
  @IsString()
  reason!: string;
}

/**
 * Response payload summarizing a user's reputation standing and privileges.
 */
export class ReputationSummaryResponse {
  @ApiProperty({ description: 'Target user unique identifier', example: 'usr_abc123' })
  userId!: string;

  @ApiProperty({ description: 'Current normalized reputation score (0 - 100)', example: 85 })
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
      'Whether the user possesses active selling permissions (score >= 20 and not suspended)',
    example: true,
  })
  canSell!: boolean;

  @ApiProperty({
    description: 'Whether the shop possesses the trusted merchant verified badge (score >= 80)',
    example: true,
  })
  isVerifiedShop!: boolean;
}

/**
 * Query filter parameters for retrieving paginated user reputation audit logs.
 */
export class QueryReputationLogsDto {
  @ApiPropertyOptional({ description: 'Page offset number (1-based)', example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of records per page', example: 20, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
