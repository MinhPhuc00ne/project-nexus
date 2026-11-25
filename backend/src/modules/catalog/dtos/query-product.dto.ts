import {
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsIn,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ProductStatus } from '@prisma/client';

export class QueryProductDto {
  @ApiPropertyOptional({ example: 'Ho Chi Minh', description: 'Filter by seller city/province' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    example: 4,
    description: 'Filter by minimum average product rating (0-5)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({
    enum: ['true', 'false'],
    example: 'true',
    description: 'Filter by stock availability (true = in stock only, false = out of stock only)',
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  inStock?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Filter only trending products (have qualifying purchases and are not excluded from trending)',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  trendingOnly?: boolean;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter products with at least this minimum qualifying purchase count',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPurchaseCount?: number;

  @ApiPropertyOptional({
    example: 'Audemars',
    description: 'Search keyword matching product title, description, or shop name',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'uuid-category-id', description: 'Filter by category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'uuid-seller-id', description: 'Filter by seller ID' })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @ApiPropertyOptional({ enum: ProductStatus, example: ProductStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ example: 1000000, description: 'Minimum effective price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 500000000, description: 'Maximum effective price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Page number (1-indexed)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 12, default: 12, description: 'Items per page (1-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 12;

  @ApiPropertyOptional({
    example: 'newest',
    enum: ['newest', 'price_asc', 'price_desc', 'best_selling', 'trending', 'top_rated'],
    description: 'Sort order for product results',
  })
  @IsOptional()
  @IsString()
  @IsIn(['newest', 'price_asc', 'price_desc', 'best_selling', 'trending', 'top_rated'])
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'best_selling' | 'trending' | 'top_rated';
}
