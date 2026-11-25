import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ReviewAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

/**
 * Data transfer object used by Admin to approve or reject a consigned auction item.
 */
export class ReviewAuctionItemDto {
  @ApiProperty({
    description: 'Review decision action: APPROVE or REJECT',
    enum: ReviewAction,
    example: ReviewAction.APPROVE,
  })
  @IsEnum(ReviewAction)
  @IsNotEmpty()
  action: ReviewAction;

  @ApiPropertyOptional({
    description: 'Mandatory rejection rationale (required when action is REJECT)',
    example:
      'Appraisal certificate number cannot be verified in the national registry, and serial numbers do not match physical engravings.',
  })
  @ValidateIf((o: ReviewAuctionItemDto) => o.action === ReviewAction.REJECT)
  @IsString()
  @IsNotEmpty({ message: 'rejectionReason must not be empty when rejecting an item' })
  rejectionReason?: string;

  @ApiPropertyOptional({
    description: 'Assigned sequential lot number within the auction session (when approved)',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  lotNumber?: number;

  @ApiPropertyOptional({
    description:
      'Official starting bid price confirmed by admin (optional; defaults to proposed starting price)',
    example: 150000000,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1000)
  @IsOptional()
  startingPrice?: number;

  @ApiPropertyOptional({
    description: 'Official minimum reserve price confirmed by admin',
    example: 180000000,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1000)
  @IsOptional()
  reservePrice?: number;

  @ApiPropertyOptional({
    description: 'Official price increment per bid step confirmed by admin',
    example: 2000000,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1000)
  @IsOptional()
  bidIncrement?: number;
}
