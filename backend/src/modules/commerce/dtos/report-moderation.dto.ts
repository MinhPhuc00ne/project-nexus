import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PenaltyType, ViolationStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';

/** Bounds report queues and exposes the existing moderation lifecycle. */
export class QueryReportsDto {
  @ApiPropertyOptional({ enum: ViolationStatus })
  @IsOptional()
  @IsEnum(ViolationStatus)
  status?: ViolationStatus;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}

/** Records an explicit, auditable report decision; financial refunds remain separate. */
export class ReviewReportDto {
  @ApiProperty({ enum: ['INVESTIGATING', 'CONFIRMED', 'DISMISSED'] })
  @IsIn(['INVESTIGATING', 'CONFIRMED', 'DISMISSED'])
  status: 'INVESTIGATING' | 'CONFIRMED' | 'DISMISSED';

  @ApiProperty({ description: 'Rationale retained in the moderation audit trail' })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  reason: string;

  @ApiPropertyOptional({
    enum: [PenaltyType.FRAUD, PenaltyType.MISREPRESENTATION],
    description:
      'Admin-only confirmed fraud or counterfeit finding: minus 50 points and immediate suspension',
  })
  @IsOptional()
  @IsIn([PenaltyType.FRAUD, PenaltyType.MISREPRESENTATION])
  penaltyType?: 'FRAUD' | 'MISREPRESENTATION';
}
