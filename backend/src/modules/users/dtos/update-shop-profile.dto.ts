import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNumber, IsOptional, IsString, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateShopProfileDto {
  @ApiPropertyOptional({
    description: 'Avatar riêng của gian hàng, không đổi avatar cá nhân',
    nullable: true,
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  shopAvatarUrl?: string | null;
  @ApiPropertyOptional({
    example: 'Gốm Sứ Bát Tràng Store - Chi nhánh HCM',
    description: 'Tên gian hàng / thương hiệu của người bán',
  })
  @IsString()
  @IsOptional()
  storeName?: string;

  @ApiPropertyOptional({
    example:
      'Chuyên cung cấp các sản phẩm gốm sứ phong thủy, bình hoa mỹ nghệ cao cấp chuẩn Bát Tràng.',
    description: 'Mô tả chi tiết gian hàng',
  })
  @IsString()
  @IsOptional()
  storeDescription?: string;

  @ApiPropertyOptional({
    example: '0987654321',
    description: 'Số điện thoại liên hệ của cửa hàng / hotline',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    example: 'contact@battrangceramics.vn',
    description: 'Email liên hệ kinh doanh của shop',
  })
  @IsEmail({}, { message: 'Business email phải là email hợp lệ' })
  @IsOptional()
  businessEmail?: string;

  @ApiPropertyOptional({
    example: '720A Điện Biên Phủ',
    description: 'Địa chỉ cụ thể / số nhà, tên đường của kho / cửa hàng',
  })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiPropertyOptional({ example: 'Phường 22', description: 'Phường/Xã' })
  @IsString()
  @IsOptional()
  ward?: string;

  @ApiPropertyOptional({ example: 'Quận Bình Thạnh', description: 'Quận/Huyện' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ example: 'TP. Hồ Chí Minh', description: 'Tỉnh/Thành phố' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 10.795, description: 'Vĩ độ GPS bản đồ' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 106.721, description: 'Kinh độ GPS bản đồ' })
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

  @ApiPropertyOptional({ example: 'ChIJ_landmark81_hcm', description: 'Place ID' })
  @IsString()
  @IsOptional()
  placeId?: string;
}
