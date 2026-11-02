import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryAdminShopsDto {
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
    description: 'Số lượng gian hàng mỗi trang (mặc định 10)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 'Gốm sứ',
    description: 'Tìm kiếm theo tên gian hàng, mô tả hoặc tên/email/sđt chủ shop',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['ACTIVE', 'SUSPENDED'],
    description:
      'Lọc theo trạng thái hoạt động của gian hàng: ACTIVE (đang mở) hoặc SUSPENDED (bị đình chỉ)',
  })
  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status?: 'ACTIVE' | 'SUSPENDED';

  @ApiPropertyOptional({
    example: 'TP. Hồ Chí Minh',
    description: 'Lọc theo Tỉnh / Thành phố của gian hàng',
  })
  @IsOptional()
  @IsString()
  city?: string;
}
