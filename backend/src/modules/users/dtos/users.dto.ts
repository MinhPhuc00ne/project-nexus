import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SellerRequestStatus } from '@prisma/client';
import { Role } from '@nexus/types';

export interface UserProfileResponse {
  id: string;
  email: string;
  personalEmail?: string | null;
  platformEmail?: string | null;
  fullName: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  role: Role;
  isSellerActive: boolean;
  isShopSuspended?: boolean;
  suspensionReason?: string | null;
  walletBalance: number;
  reputationScore: number;
  trustLevel: string;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolderName?: string | null;
  createdAt: Date;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyen Van A', description: 'Updated full name' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ example: '0901234567', description: 'Updated phone number' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png', description: 'Avatar URL' })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'Vietcombank', description: 'Tên ngân hàng thụ hưởng' })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional({ example: '1029384756', description: 'Số tài khoản ngân hàng thụ hưởng' })
  @IsString()
  @IsOptional()
  accountNumber?: string;

  @ApiPropertyOptional({
    example: 'NGUYEN VAN A',
    description: 'Họ và tên chủ tài khoản ngân hàng (viết hoa)',
  })
  @IsString()
  @IsOptional()
  accountHolderName?: string;

  @ApiPropertyOptional({
    description: 'Mật khẩu tài khoản để xác minh trực tiếp khi Seller cập nhật hồ sơ',
  })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ description: 'Mã token xác minh đăng nhập gần đây của Seller' })
  @IsString()
  @IsOptional()
  verificationToken?: string;
}

export class ApplySellerUpgradeDto {
  @ApiProperty({ example: 'Nexus Super Store', description: 'Store name' })
  @IsString()
  @IsNotEmpty({ message: 'Store name is required' })
  storeName: string;

  @ApiPropertyOptional({ example: 'Authentic electronics store', description: 'Store description' })
  @IsString()
  @IsOptional()
  storeDescription?: string;

  @ApiProperty({ example: '0912345678', description: 'Store contact phone' })
  @IsString()
  @IsNotEmpty({ message: 'Contact phone number is required' })
  phone: string;

  @ApiPropertyOptional({ example: 'business@nexusstore.com', description: 'Business email' })
  @IsEmail({}, { message: 'Business email must be valid' })
  @IsOptional()
  businessEmail?: string;

  @ApiPropertyOptional({ example: '012345678910', description: 'National identity card number' })
  @IsString()
  @IsOptional()
  identityCardNumber?: string;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/nexus/proof.jpg',
    description: 'Đường dẫn file chứng minh (nếu không upload trực tiếp file trong form-data)',
  })
  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @ApiProperty({ example: '720A Điện Biên Phủ', description: 'Store address / street' })
  @IsString()
  @IsNotEmpty({ message: 'Store street address is required' })
  street: string;

  @ApiPropertyOptional({ example: 'Phường 22' })
  @IsString()
  @IsOptional()
  ward?: string;

  @ApiPropertyOptional({ example: 'Quận Bình Thạnh' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiProperty({ example: 'TP. Hồ Chí Minh' })
  @IsString()
  @IsNotEmpty({ message: 'Store city is required' })
  city: string;

  @ApiPropertyOptional({ example: 10.795, description: 'GPS Latitude' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 106.721, description: 'GPS Longitude' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({
    example: 'Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP. Hồ Chí Minh',
    description: 'Formatted address',
  })
  @IsString()
  @IsOptional()
  formattedAddress?: string;

  @ApiPropertyOptional({ example: 'ChIJw8qV...', description: 'Place ID' })
  @IsString()
  @IsOptional()
  placeId?: string;
}

export class ReviewSellerUpgradeDto {
  @ApiProperty({
    enum: SellerRequestStatus,
    example: SellerRequestStatus.APPROVED,
    description: 'Decision: APPROVED or REJECTED',
  })
  @IsEnum(SellerRequestStatus, {
    message: 'Status must be APPROVED or REJECTED',
  })
  status: SellerRequestStatus;

  @ApiPropertyOptional({
    example: 'Documents verified successfully',
    description: 'Rejection reason or review note',
  })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

export class CreateAddressDto {
  @ApiProperty({ example: 'Đinh Tú Liên', description: 'Họ tên người nhận hàng' })
  @IsString()
  @IsNotEmpty()
  recipientName: string;

  @ApiProperty({ example: '0909123456', description: 'Số điện thoại người nhận' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ',
    description: 'Địa chỉ cụ thể',
  })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiPropertyOptional({ example: 'Phường 22' })
  @IsString()
  @IsOptional()
  ward?: string;

  @ApiPropertyOptional({ example: 'Quận Bình Thạnh' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiProperty({ example: 'TP. Hồ Chí Minh' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({ example: 10.795, description: 'Vĩ độ GPS (Latitude) từ bản đồ' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 106.721, description: 'Kinh độ GPS (Longitude) từ bản đồ' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({
    example: 'Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP. Hồ Chí Minh',
    description: 'Địa chỉ đầy đủ định dạng chuẩn bản đồ',
  })
  @IsString()
  @IsOptional()
  formattedAddress?: string;

  @ApiPropertyOptional({ example: 'ChIJw8qV...', description: 'Google / OSM Place ID' })
  @IsString()
  @IsOptional()
  placeId?: string;
  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  isDefault?: boolean;
}
export class UpdateAddressDto {
  @ApiPropertyOptional({ example: 'Nguyen Van A' })
  @IsString()
  @IsOptional()
  recipientName?: string;

  @ApiPropertyOptional({ example: '0909123456' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ' })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiPropertyOptional({ example: 'Phường 22' })
  @IsString()
  @IsOptional()
  ward?: string;

  @ApiPropertyOptional({ example: 'Quận Bình Thạnh' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ example: 'TP. Hồ Chí Minh' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 10.795 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 106.721 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ example: 'Landmark 81, 720A Điện Biên Phủ, Bình Thạnh' })
  @IsString()
  @IsOptional()
  formattedAddress?: string;

  @ApiPropertyOptional({ example: 'ChIJw8qV...' })
  @IsString()
  @IsOptional()
  placeId?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  isDefault?: boolean;
}
