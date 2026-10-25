import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class WarnShopDto {
  @ApiProperty({
    example: 'Đăng tải thông tin sản phẩm sai lệch với thực tế',
    description: 'Lý do cảnh cáo gian hàng',
  })
  @IsString()
  @IsNotEmpty({ message: 'Lý do cảnh cáo không được để trống' })
  reason: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Số điểm uy tín (reputationScore) bị trừ kèm theo (nếu có)',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  penaltyPoints?: number;
}
