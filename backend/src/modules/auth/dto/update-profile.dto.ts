import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateAuthProfileDto {
  @ApiPropertyOptional({ description: 'Mật khẩu xác minh lại khi Seller cập nhật hồ sơ' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({
    description: 'Token PROFILE_UPDATE do API reauthenticate cấp, hạn 5 phút',
  })
  @IsOptional()
  @IsString()
  verificationToken?: string;
  @ApiPropertyOptional({
    example: 'Nguyen Van A',
    description: 'Họ và tên của người dùng (từ 2 đến 100 ký tự)',
  })
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự.' })
  @Length(2, 100, { message: 'Họ và tên phải có độ dài từ 2 đến 100 ký tự.' })
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({
    example: '0912345678',
    description: 'Số điện thoại liên lạc (9 đến 15 chữ số)',
  })
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự.' })
  @Matches(/^\+?[0-9]{9,15}$/, { message: 'Số điện thoại phải có từ 9 đến 15 chữ số.' })
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    description: 'Đường dẫn ảnh đại diện hợp lệ (http hoặc https)',
  })
  @IsString({ message: 'Đường dẫn ảnh đại diện phải là chuỗi ký tự.' })
  @Matches(/^https?:\/\/\S+$/i, {
    message: 'Ảnh đại diện phải là đường dẫn URL hợp lệ (bắt đầu bằng http:// hoặc https://).',
  })
  @IsOptional()
  avatarUrl?: string;
}

export class ReauthenticateProfileDto {
  @ApiPropertyOptional({ description: 'Mật khẩu hiện tại để xác minh hồ sơ' })
  @IsString()
  @Length(1, 200)
  password!: string;
}
