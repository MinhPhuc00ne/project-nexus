import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    example: 'Laptop Gaming & Workstation',
    description: 'Tên danh mục hàng hóa mới',
  })
  @IsOptional()
  @IsString({ message: 'Tên danh mục phải là chuỗi ký tự' })
  @MaxLength(100, { message: 'Tên danh mục tối đa 100 ký tự' })
  name?: string;

  @ApiPropertyOptional({
    example: 'laptop-gaming-workstation',
    description: 'Đường dẫn định danh slug mới',
  })
  @IsOptional()
  @IsString({ message: 'Slug phải là chuỗi ký tự' })
  slug?: string;

  @ApiPropertyOptional({
    example: 'cat-parent-uuid-456',
    description: 'ID của danh mục cha mới (truyền null nếu muốn đưa về danh mục gốc cấp 1)',
  })
  @IsOptional()
  @IsString({ message: 'Parent ID phải là chuỗi ký tự' })
  parentId?: string | null;
}
