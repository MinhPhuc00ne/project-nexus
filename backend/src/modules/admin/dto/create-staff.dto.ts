import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({
    description: 'Email đăng nhập của nhân viên hỗ trợ (Support Staff)',
    example: 'staff.support@nexus.com',
  })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Định dạng email không hợp lệ' })
  email!: string;

  @ApiProperty({
    description: 'Mật khẩu tài khoản nhân viên (tối thiểu 6 ký tự)',
    example: 'Staff@123456',
  })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải chứa ít nhất 6 ký tự' })
  password!: string;

  @ApiProperty({
    description: 'Họ và tên nhân viên',
    example: 'Trần Văn Nhân Viên',
  })
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự' })
  fullName!: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại nhân viên',
    example: '0901234567',
  })
  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  phoneNumber?: string;
}
