import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@nexus.com',
    description: 'Email đã đăng ký (bằng Gmail hoặc Google) để nhận mã OTP đặt lại mật khẩu',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
