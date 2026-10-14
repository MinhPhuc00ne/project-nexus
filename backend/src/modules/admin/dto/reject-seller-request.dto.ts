import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectSellerRequestDto {
  @ApiProperty({
    description: 'Lý do từ chối yêu cầu nâng cấp',
    example: 'Thông tin giấy tờ CCCD/CMND không khớp với tên đăng ký tài khoản.',
  })
  @IsNotEmpty({ message: 'Lý do từ chối không được để trống' })
  @IsString({ message: 'Lý do từ chối phải là chuỗi ký tự' })
  rejectionReason!: string;
}
