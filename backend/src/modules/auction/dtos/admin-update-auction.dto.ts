import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Data transfer object used by Admin to update an upcoming auction session.
 */
export class AdminUpdateAuctionDto {
  @ApiPropertyOptional({
    description: 'Updated title of the auction session',
    example: 'Audemars Piguet & Swiss Luxury Watches Session (Updated)',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated session rules and description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated start timestamp in ISO 8601 format',
    example: '2026-11-08T20:30:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Updated conclusion timestamp in ISO 8601 format',
    example: '2026-11-08T23:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Updated minimum buyer reputation score required to place bids',
    example: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  minBuyerReputation?: number;

  @ApiPropertyOptional({
    description: 'Updated minimum seller reputation score required to consign items',
    example: 80,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  minSellerReputation?: number;
}
