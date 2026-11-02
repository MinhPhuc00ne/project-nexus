import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class LockUserDto {
  @ApiPropertyOptional({
    description: 'Lý do khóa hoặc mở khóa tài khoản người dùng',
    example: 'Vi phạm quy định giao dịch hoặc có hành vi gian lận',
  })
  @IsOptional()
  @IsString({ message: 'Lý do phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Lý do không được vượt quá 500 ký tự' })
  reason?: string;
}

export class UpdateUserStatusDto {
  @ApiPropertyOptional({
    description: 'Trạng thái khóa tài khoản: true (khóa) hoặc false (mở khóa)',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isLocked phải là giá trị boolean (true/false)' })
  isLocked?: boolean;

  @ApiPropertyOptional({
    description: 'Lý do thay đổi trạng thái tài khoản',
    example: 'Khóa tài khoản theo yêu cầu xử lý vi phạm',
  })
  @IsOptional()
  @IsString({ message: 'Lý do phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Lý do không được vượt quá 500 ký tự' })
  reason?: string;
}
