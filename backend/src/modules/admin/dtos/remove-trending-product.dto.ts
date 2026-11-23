import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RemoveTrendingProductDto {
  @ApiPropertyOptional({
    example: 'Sản phẩm không còn phù hợp hiển thị tại mục Xu hướng',
    description: 'Lý do Admin gỡ sản phẩm khỏi danh sách Xu hướng (gửi thông báo tới Seller)',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Lý do phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Lý do tối đa 500 ký tự' })
  reason?: string;
}
