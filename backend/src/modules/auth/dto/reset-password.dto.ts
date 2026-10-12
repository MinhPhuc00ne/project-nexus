import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@nexus.com', description: 'Email cần đặt lại mật khẩu' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '123456', description: 'Mã OTP 6 chữ số gửi qua email' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code!: string;

  @ApiProperty({ example: 'NewPassword123', description: 'Mật khẩu mới (tối thiểu 6 ký tự)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword!: string;
}
