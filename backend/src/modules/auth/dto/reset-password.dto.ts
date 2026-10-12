import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@gmail.com', description: 'Email cần đặt lại mật khẩu (@gmail.com)' })
  @IsEmail({}, { message: 'Định dạng email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @Matches(/^[a-zA-Z0-9._%+-]+@gmail\.com$/i, {
    message: 'Chỉ chấp nhận địa chỉ email @gmail.com',
  })
  email!: string;

  @ApiProperty({ example: '123456', description: 'Mã OTP 6 chữ số gửi qua email' })
  @IsString()
  @IsNotEmpty({ message: 'Mã OTP không được để trống' })
  @Length(6, 6, { message: 'Mã OTP phải gồm đúng 6 ký tự' })
  code!: string;

  @ApiProperty({
    example: 'NewPassword@123',
    description: 'Mật khẩu mới (tối thiểu 8 ký tự, có ít nhất 1 chữ hoa và 1 ký tự đặc biệt)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
  @Matches(/^(?=.*[A-Z])(?=.*[^a-zA-Z0-9\s]).+$/, {
    message: 'Mật khẩu mới phải có ít nhất 1 ký tự viết hoa và 1 ký tự đặc biệt',
  })
  newPassword!: string;
}
