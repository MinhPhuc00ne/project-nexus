import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  ArrayMaxSize,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ProductStatus } from '@prisma/client';
import { ProductOptionDto } from './product-features.dto';

export class UpdateProductDto {
  @ApiPropertyOptional({ type: [ProductOptionDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => ProductOptionDto)
  options?: ProductOptionDto[];
  @ApiPropertyOptional({ example: 'Đồng Hồ Audemars Piguet Skeleton New Edition' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Mô tả cập nhật' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 130000000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1000)
  basePrice?: number;

  @ApiPropertyOptional({ example: 'uuid-category-id' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Số lượng tồn kho cập nhật (thay đổi số lượng thực tế trong kho)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ example: ['https://res.cloudinary.com/demo/image/upload/v1/watch.jpg'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ enum: ProductStatus, example: ProductStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  weightGrams?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lengthCm?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  widthCm?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  heightCm?: number;

  @ApiPropertyOptional({ example: 'watch' })
  @IsOptional()
  @IsString()
  threeModelKey?: string;
}
