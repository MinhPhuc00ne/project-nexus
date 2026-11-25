import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AdminInviteStaffDto {
  @ApiProperty({
    description: 'Họ và tên nhân viên',
    example: 'Nguyễn Văn Staff',
  })
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự' })
  fullName!: string;

  @ApiProperty({
    description: 'Email cá nhân của nhân viên để nhận link xác thực',
    example: 'staff.personal@gmail.com',
  })
  @IsNotEmpty({ message: 'Email cá nhân không được để trống' })
  @IsEmail({}, { message: 'Định dạng email không hợp lệ' })
  email!: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại của nhân viên',
    example: '0912345678',
  })
  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Phòng ban / Bộ phận phụ trách',
    example: 'Chăm sóc khách hàng',
  })
  @IsOptional()
  @IsString({ message: 'Phòng ban phải là chuỗi ký tự' })
  department?: string;
}
