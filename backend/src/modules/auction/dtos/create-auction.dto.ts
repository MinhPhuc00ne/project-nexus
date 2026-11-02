import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Data transfer object for initiating a new auction room.
 */
export class CreateAuctionDto {
  @ApiProperty({
    description: 'Unique identifier of the catalog product for auction',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Public title of the auction listing',
    example: 'Audemars Piguet Royal Oak Chronograph 41mm',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Starting bid price in VND currency',
    example: 100000000,
    minimum: 10000,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(10000)
  startingPrice: number;

  @ApiPropertyOptional({
    description: 'Minimum reserve price required for settlement',
    example: 120000000,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  reservePrice?: number;

  @ApiPropertyOptional({
    description: 'Minimum required price increment per bid step in VND',
    example: 1000000,
    default: 100000,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1000)
  bidIncrement?: number;

  @ApiProperty({
    description: 'Scheduled start timestamp in ISO 8601 format',
    example: '2026-11-05T10:00:00.000Z',
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    description: 'Scheduled conclusion timestamp in ISO 8601 format',
    example: '2026-11-05T18:00:00.000Z',
  })
  @IsDateString()
  endTime: string;
}
