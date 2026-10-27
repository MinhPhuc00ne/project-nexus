import {
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsObject,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class MergeCartItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  selections?: Record<string, string>;
  @ApiProperty({ example: 'uuid-product-id' })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class MergeCartDto {
  @ApiProperty({
    type: [MergeCartItemDto],
    description: 'Danh sách các sản phẩm và số lượng lưu tạm từ LocalStorage của Guest',
  })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => MergeCartItemDto)
  items!: MergeCartItemDto[];
}
