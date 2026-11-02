import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class ToggleSellerDto {
  @ApiPropertyOptional({
    description:
      'Chế độ người bán (true: bật chế độ Seller, false: chuyển về chế độ Buyer). Nếu không truyền trường này, hệ thống sẽ tự động đảo trạng thái hiện tại.',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isSellerActive phải là kiểu boolean' })
  isSellerActive?: boolean;
}
