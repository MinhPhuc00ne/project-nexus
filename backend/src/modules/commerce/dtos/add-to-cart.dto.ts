import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddToCartDto {
  @ApiProperty({ example: 'uuid-product-id', description: 'ID của sản phẩm muốn thêm vào giỏ' })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ example: 1, default: 1, description: 'Số lượng mua' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}
