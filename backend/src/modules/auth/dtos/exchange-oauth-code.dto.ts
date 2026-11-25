import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ExchangeOAuthCodeDto {
  @ApiProperty({
    description: 'Mã opaque dùng một lần nhận được từ redirect của Google callback',
    example: 'q1w2e3r4t5y6u7i8o9p0asdfghjklzxcvbnm1234567890ABCDEF',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mã đăng nhập không được để trống.' })
  @MaxLength(256)
  code!: string;
}
