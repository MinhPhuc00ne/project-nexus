import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SyncWishlistDto {
  @ApiProperty({
    example: ['prod-uuid-1', 'prod-uuid-2'],
    description: 'Danh sách ID sản phẩm từ khách (guest) cần đồng bộ vào tài khoản',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  productIds!: string[];
}
