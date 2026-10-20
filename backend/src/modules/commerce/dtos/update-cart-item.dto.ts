import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateCartItemDto {
  @ApiProperty({
    example: 2,
    description: 'Số lượng mới của món hàng (nếu truyền 0 sẽ tự động xóa khỏi giỏ)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity!: number;
}
