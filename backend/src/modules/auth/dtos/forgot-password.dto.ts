import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'admin@nexus.com',
    description:
      'Email đã đăng ký trong hệ thống để nhận mã OTP đặt lại mật khẩu (Admin, Staff, Buyer, Seller)',
  })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Định dạng email không hợp lệ' })
  email!: string;
}
