import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateShopStatusDto {
  @ApiProperty({
    example: false,
    description:
      'Trạng thái hoạt động của gian hàng (true: mở bán bình thường, false: đình chỉ/đóng băng gian hàng)',
  })
  @IsBoolean({ message: 'isSellerActive phải là giá trị boolean (true/false)' })
  @IsNotEmpty({ message: 'isSellerActive không được để trống' })
  isSellerActive!: boolean;

  @ApiPropertyOptional({
    example: 'Gian hàng bị tạm dừng do nhiều lần đăng sản phẩm vi phạm bản quyền',
    description: 'Lý do đình chỉ hoặc mở lại gian hàng gửi đến người bán',
  })
  @IsOptional()
  @IsString({ message: 'Lý do phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Lý do tối đa 500 ký tự' })
  reason?: string;
}
