import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({
    description: 'Email cá nhân nhận tài khoản @staff.com và mật khẩu ngẫu nhiên để đăng nhập ngay',
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
    deprecated: true,
    description:
      'Trường cũ được chấp nhận nhưng bỏ qua; backend luôn sinh mật khẩu ngẫu nhiên và gửi qua email cá nhân',
    example: 'Staff@123456',
  })
  @IsOptional()
  @IsString()
  password?: string;
}
