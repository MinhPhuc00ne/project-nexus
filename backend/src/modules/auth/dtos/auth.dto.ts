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
    description: 'Activation token received in invitation email',
  })
  @IsString()
  @IsNotEmpty({ message: 'Activation token is required' })
  token: string;

  @ApiProperty({ example: 'Nguyen Van Staff', description: 'Confirmed full name' })
  @IsString()
  @IsNotEmpty({ message: 'Confirm full name is required' })
  fullName: string;

  @ApiProperty({ example: '0912345678', description: 'Confirmed phone number' })
  @IsString()
  @IsNotEmpty({ message: 'Confirm phone number is required' })
  phoneNumber: string;

  @ApiProperty({ example: 'StaffPassword123!', description: 'New password' })
  @IsString()
  @MinLength(6, { message: 'New password must be at least 6 characters' })
  @IsNotEmpty({ message: 'New password is required' })
  newPassword: string;

  @ApiProperty({ example: 'StaffPassword123!', description: 'Confirm new password' })
  @IsString()
  @IsNotEmpty({ message: 'Confirm password is required' })
  confirmPassword: string;
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
