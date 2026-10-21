import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Đồng Hồ Audemars Piguet Skeleton' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'Phiên bản lộ cơ cao cấp chuẩn Thụy Sĩ' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 125000000, description: 'Giá bán cơ sở (VNĐ)' })
  @Type(() => Number)
  @IsNumber()
  @Min(1000)
  basePrice!: number;

  @ApiProperty({ example: 'uuid-category-id', description: 'ID danh mục sản phẩm' })
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @ApiProperty({ example: 4, description: 'Số lượng tồn kho ban đầu' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({
    example: ['https://res.cloudinary.com/demo/image/upload/v1/watch.jpg'],
    description: 'Danh sách URL ảnh sản phẩm (tối đa 5 ảnh)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  images!: string[];

  @ApiPropertyOptional({ example: 500, description: 'Khối lượng (grams)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  weightGrams?: number;

  @ApiPropertyOptional({ example: 15, description: 'Chiều dài (cm)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lengthCm?: number;

  @ApiPropertyOptional({ example: 10, description: 'Chiều rộng (cm)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  widthCm?: number;

  @ApiPropertyOptional({ example: 8, description: 'Chiều cao (cm)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  heightCm?: number;

  @ApiPropertyOptional({ example: 'watch', description: 'Key model 3D (nếu có)' })
  @IsOptional()
  @IsString()
  threeModelKey?: string;
}
