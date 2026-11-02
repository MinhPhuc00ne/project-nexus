import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: 'user@nexus.com', description: 'Email cần xác thực' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '123456', description: 'Mã OTP 6 chữ số gửi qua email' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code!: string;
}
