import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AuctionStatus } from '@prisma/client';

/**
 * Filter and pagination parameters for auction listing queries.
 */
export class AuctionQueryDto {
  @ApiPropertyOptional({
    description: 'Filter auctions by operational state',
    enum: AuctionStatus,
  })
  @IsEnum(AuctionStatus)
  @IsOptional()
  status?: AuctionStatus;

  @ApiPropertyOptional({
    description: 'Filter auctions by owner seller account identifier',
  })
  @IsString()
  @IsOptional()
  sellerId?: string;

  @ApiPropertyOptional({
    description: 'Search string for auction or product title',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Target page number for pagination',
    default: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Maximum item count per page',
    default: 20,
    minimum: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}
