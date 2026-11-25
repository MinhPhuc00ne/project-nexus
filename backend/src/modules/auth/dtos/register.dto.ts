import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'user@gmail.com',
    description: 'Email đăng ký (chỉ chấp nhận @gmail.com)',
  })
  @IsEmail({}, { message: 'Định dạng email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @Matches(/^[a-zA-Z0-9._%+-]+@gmail\.com$/i, {
    message: 'Chỉ chấp nhận đăng ký bằng địa chỉ email @gmail.com',
  })
  email!: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'Mật khẩu (tối thiểu 8 ký tự, có ít nhất 1 chữ hoa và 1 ký tự đặc biệt)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @Matches(/^(?=.*[A-Z])(?=.*[^a-zA-Z0-9\s]).+$/, {
    message: 'Mật khẩu phải có ít nhất 1 ký tự viết hoa và 1 ký tự đặc biệt',
  })
  password!: string;

  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Họ và tên người dùng' })
  @IsString()
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  fullName!: string;
}
