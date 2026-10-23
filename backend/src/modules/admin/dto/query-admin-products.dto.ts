import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryAdminProductsDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Số trang (mặc định 1)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'Số lượng sản phẩm mỗi trang (mặc định 10)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 'đồng hồ',
    description: 'Từ khóa tìm kiếm theo tên sản phẩm hoặc tên/email người bán',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ProductStatus,
    description: 'Lọc theo trạng thái sản phẩm: ACTIVE, INACTIVE, DRAFT',
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({
    description: 'Lọc theo ID người bán (Seller ID)',
  })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo ID danh mục (Category ID)',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;
}

