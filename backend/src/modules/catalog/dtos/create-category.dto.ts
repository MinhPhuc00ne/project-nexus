import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'Laptop & Máy tính xách tay',
    description: 'Tên danh mục hàng hóa',
  })
  @IsString({ message: 'Tên danh mục phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @MaxLength(100, { message: 'Tên danh mục tối đa 100 ký tự' })
  name!: string;

  @ApiPropertyOptional({
    example: 'laptop-may-tinh-xach-tay',
    description: 'Đường dẫn định danh slug (nếu để trống hệ thống sẽ tự sinh từ tên)',
  })
  @IsOptional()
  @IsString({ message: 'Slug phải là chuỗi ký tự' })
  slug?: string;

  @ApiPropertyOptional({
    example: 'cat-parent-uuid-123',
    description: 'ID của danh mục cha (để trống nếu là danh mục gốc cấp 1)',
  })
  @IsOptional()
  @IsString({ message: 'Parent ID phải là chuỗi ký tự' })
  parentId?: string | null;
}

