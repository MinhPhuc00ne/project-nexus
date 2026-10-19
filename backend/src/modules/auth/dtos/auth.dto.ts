import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterBuyerDto {
  @ApiProperty({ example: 'buyer@example.com', description: 'Buyer email' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ example: 'Password123!', description: 'Password (min 6 characters)' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @ApiProperty({ example: 'Nguyen Van A', description: 'Full name' })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullName: string;

  @ApiPropertyOptional({ example: '0901234567', description: 'Phone number' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;
}

export class LoginDto {
  @ApiProperty({
    example: 'admin@nexus.com',
    description: 'Email or platform-assigned staff email (e.g. staff.nexus@gmail.com)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Email or platform identifier is required' })
  email: string;

  @ApiProperty({ example: 'AdminPassword123!', description: 'User password' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token string' })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'CurrentPassword123!', description: 'Current password' })
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword: string;

  @ApiProperty({ example: 'NewPassword123!', description: 'New password (min 6 characters)' })
  @IsString()
  @MinLength(6, { message: 'New password must be at least 6 characters' })
  @IsNotEmpty({ message: 'New password is required' })
  newPassword: string;
}

export class ForgotPasswordRequestDto {
  @ApiProperty({ example: 'user@example.com', description: 'Registered email' })
  @IsEmail({}, { message: 'Valid email is required' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}

export class ResetPasswordWithOtpDto {
  @ApiProperty({ example: 'user@example.com', description: 'Registered email' })
  @IsEmail({}, { message: 'Valid email is required' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP code received in email' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit number' })
  @IsNotEmpty({ message: 'OTP is required' })
  otp: string;

  @ApiProperty({ example: 'NewPassword123!', description: 'New password' })
  @IsString()
  @MinLength(6, { message: 'New password must be at least 6 characters' })
  @IsNotEmpty({ message: 'New password is required' })
  newPassword: string;
}

export class InviteStaffDto {
  @ApiProperty({ example: 'Nguyen Van Staff', description: 'Staff full name' })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullName: string;

  @ApiProperty({
    example: 'staff_personal@gmail.com',
    description: 'Personal email to receive invitation link',
  })
  @IsEmail({}, { message: 'Valid personal email is required' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ example: '0912345678', description: 'Phone number' })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phoneNumber: string;

  @ApiPropertyOptional({ example: 'Customer Support', description: 'Assigned department' })
  @IsString()
  @IsOptional()
  department?: string;
}

export class ActivateStaffDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f6...',
    description: 'Mã token kích hoạt tài khoản nhận qua email cá nhân',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mã token kích hoạt không được để trống' })
  token!: string;

  @ApiProperty({ example: 'Nguyễn Quang Huy', description: 'Xác nhận Họ và tên nhân viên' })
  @IsString()
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  fullName!: string;

  @ApiProperty({ example: '0912345678', description: 'Xác nhận Số điện thoại nhân viên' })
  @IsString()
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  phoneNumber!: string;

  @ApiProperty({
    example: 'Staff@123456',
    description:
      'Mật khẩu mới (tối thiểu 8 ký tự, có ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(8, { message: 'Mật khẩu mới phải có tối thiểu 8 ký tự' })
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).+$/, {
    message:
      'Mật khẩu mới phải bao gồm ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt',
  })
  newPassword!: string;

  @ApiProperty({ example: 'Staff@123456', description: 'Xác nhận lại mật khẩu mới' })
  @IsString()
  @IsNotEmpty({ message: 'Xác nhận mật khẩu không được để trống' })
  confirmPassword!: string;
}

export class StaffForgotPasswordDto {
  @ApiProperty({
    example: 'nguyenvanstaff123.nexus@gmail.com',
    description: 'Email nhân viên được cấp (đuôi nexus@gmail.com) hoặc email cá nhân',
  })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}

export class StaffResetPasswordDto {
  @ApiProperty({
    example: 'nguyenvanstaff123.nexus@gmail.com',
    description: 'Email nhân viên được cấp (đuôi nexus@gmail.com) hoặc email cá nhân',
  })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ example: '123456', description: 'Mã OTP 6 số nhận qua email cá nhân' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit number' })
  @IsNotEmpty({ message: 'OTP is required' })
  otp: string;

  @ApiProperty({ example: 'NewStaffPassword123!', description: 'Mật khẩu mới' })
  @IsString()
  @MinLength(6, { message: 'New password must be at least 6 characters' })
  @IsNotEmpty({ message: 'New password is required' })
  newPassword: string;
}
