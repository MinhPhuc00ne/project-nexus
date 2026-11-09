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
    description: 'Updated public banner or avatar image URL of the auction session',
    example:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

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
    example: 40,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  minBuyerReputation?: number;

  @ApiPropertyOptional({
    description: 'Updated minimum seller reputation score required to consign items',
    example: 50,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  minSellerReputation?: number;
}
