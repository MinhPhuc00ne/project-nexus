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
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(5) minRating?: number;
  @IsOptional() @IsIn(['true', 'false']) inStock?: string;
  @ApiPropertyOptional({
    example: true,
    description: 'Lọc chỉ các sản phẩm đang xu hướng (có lượt mua và không bị loại khỏi trending)',
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
    description: 'Lọc sản phẩm có tổng lượt mua (đơn đã thanh toán/giao) tối thiểu',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPurchaseCount?: number;
  @ApiPropertyOptional({ example: 'Audemars', description: 'Từ khóa tìm kiếm theo tên hoặc mô tả' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'uuid-category-id', description: 'Lọc theo ID danh mục' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'uuid-seller-id', description: 'Lọc theo ID người bán' })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @ApiPropertyOptional({ enum: ProductStatus, example: ProductStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ example: 1000000, description: 'Giá tối thiểu' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 500000000, description: 'Giá tối đa' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 12, default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 12;

  @ApiPropertyOptional({
    example: 'newest',
    enum: ['newest', 'price_asc', 'price_desc', 'best_selling', 'trending', 'top_rated'],
    description: 'Sắp xếp theo thứ tự',
  })
  @IsOptional()
  @IsString()
  @IsIn(['newest', 'price_asc', 'price_desc', 'best_selling', 'trending', 'top_rated'])
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'best_selling' | 'trending' | 'top_rated';
}
