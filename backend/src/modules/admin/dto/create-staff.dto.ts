import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({
    description:
      'Email cá nhân của nhân viên (hệ thống sẽ cấp tài khoản @staff.com và gửi link kích hoạt đến email này)',
    example: 'hotro.canhan@gmail.com',
  })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Định dạng email không hợp lệ' })
  email!: string;

  @ApiProperty({
    description: 'Họ và tên nhân viên',
    example: 'Nguyễn Văn Hỗ Trợ',
  })
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @IsString({ message: 'Họ và tên phải là chuỗi ký tự' })
  fullName!: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại nhân viên',
    example: '0987654321',
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

  @ApiPropertyOptional({
    description:
      'Mật khẩu tài khoản nhân viên (tùy chọn; nếu để trống, hệ thống sẽ gửi mail cho staff tự tạo mật khẩu)',
    example: 'Staff@123456',
  })
  @IsOptional()
  @MinLength(6, { message: 'Mật khẩu phải chứa ít nhất 6 ký tự' })
  password?: string;
}
