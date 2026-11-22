import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProductCategoryDto {
  @ApiProperty({
    example: 'uuid-category-id',
    description: 'ID danh mục mới muốn gắn cho sản phẩm',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'categoryId phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Danh mục không được để trống' })
  categoryId!: string;

  @ApiPropertyOptional({
    example: 'Phân loại lại vào danh mục mới phù hợp hơn với sản phẩm',
    description: 'Ghi chú hoặc lý do gắn/đổi danh mục gửi tới Seller',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Lý do phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Lý do tối đa 500 ký tự' })
  reason?: string;
}
