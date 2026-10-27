import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductOptionDto {
  @ApiProperty({ example: 'Màu sắc' })
  @IsString()
  @Length(1, 40)
  name!: string;

  @ApiProperty({ example: ['Đen', 'Trắng'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  values!: string[];
}

export class UpdateProductSaleDto {
  @ApiPropertyOptional({
    nullable: true,
    example: 150000,
    description: 'Giá sale; null để dừng sale',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1000)
  salePrice?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsISO8601()
  saleStartsAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsISO8601()
  saleEndsAt?: string | null;
}
