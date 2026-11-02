import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'user@nexus.com',
    description: 'Email đăng nhập của người dùng',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: '123456',
    description: 'Mật khẩu người dùng (tối thiểu 6 ký tự)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}
