import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Data transfer object used by Admin to create a new auction session/event.
 * Note: Real date constraint (startTime > now) is omitted per demo requirements.
 */
export class AdminCreateAuctionDto {
  @ApiProperty({
    description: 'Public title of the auction session',
    example: 'Audemars Piguet & Swiss Luxury Watches November Session',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Detailed description, guidelines, and rules of the auction session',
    example:
      'Curated auction event for certified luxury timepieces and fine jewelry with authenticated certificates.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Scheduled start timestamp in ISO 8601 format',
    example: '2026-11-08T20:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({
    description: 'Scheduled conclusion timestamp in ISO 8601 format',
    example: '2026-11-08T22:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @ApiPropertyOptional({
    description: 'Minimum buyer reputation score required to place bids',
    example: 40,
    default: 40,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  minBuyerReputation?: number = 40;

  @ApiPropertyOptional({
    description: 'Minimum seller reputation score required to consign items',
    example: 50,
    default: 50,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  minSellerReputation?: number = 50;
}
