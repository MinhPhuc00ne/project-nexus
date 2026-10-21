import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class ConfirmChangePasswordOtpDto {
  @ApiProperty({
    example: '123456',
    description: 'Mã xác thực OTP gồm đúng 6 chữ số gửi qua Gmail',
  })
  @IsString({ message: 'Mã OTP phải là chuỗi ký tự.' })
  @Length(6, 6, { message: 'Mã OTP phải có đúng 6 chữ số.' })
  @Matches(/^[0-9]{6}$/, { message: 'Mã OTP chỉ bao gồm các chữ số từ 0 đến 9.' })
  @IsNotEmpty({ message: 'Vui lòng cung cấp mã OTP.' })
  otp: string;

  @ApiProperty({
    example: 'NewSecurePassword@2026',
    description: 'Mật khẩu mới (tối thiểu 6 ký tự)',
  })
  @IsString({ message: 'Mật khẩu mới phải là chuỗi ký tự.' })
  @Length(6, 100, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu mới.' })
  newPassword: string;
}
