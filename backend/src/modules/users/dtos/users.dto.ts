import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SellerRequestStatus } from '@prisma/client';

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

  @ApiProperty({
    example: 'https://res.cloudinary.com/nexus/proof.jpg',
    description: 'Uploaded proof document or image URL (obtained via /seller-upgrade/upload-proof)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Proof document or image URL is required' })
  attachmentUrl: string;
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
