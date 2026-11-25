import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryShopDto {
  @ApiPropertyOptional({
    example: 'Hoàng Gia',
    description: 'Từ khóa tìm kiếm theo tên gian hàng, mô tả hoặc tên chủ shop',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'Hồ Chí Minh',
    description: 'Lọc shop theo tỉnh / thành phố',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Số trang hiện tại' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 12, default: 12, description: 'Số lượng kết quả mỗi trang' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 12;

  @ApiPropertyOptional({
    example: 'reputation',
    enum: ['reputation', 'newest', 'products_count'],
    description: 'Tiêu chí sắp xếp kết quả',
  })
  @IsOptional()
  @IsString()
  @IsIn(['reputation', 'newest', 'products_count'])
  sortBy?: 'reputation' | 'newest' | 'products_count' = 'reputation';
}
