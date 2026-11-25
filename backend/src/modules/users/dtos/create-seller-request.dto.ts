import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSellerRequestDto {
  @ApiProperty({
    description: 'Tên gian hàng / thương hiệu của người bán',
    example: 'Cổ Vật Hoàng Gia Store',
  })
  @IsNotEmpty({ message: 'Tên gian hàng không được để trống' })
  @IsString({ message: 'Tên gian hàng phải là chuỗi ký tự' })
  storeName!: string;

  @ApiPropertyOptional({
    description: 'Mô tả ngắn gọn về gian hàng và sản phẩm dự định kinh doanh',
    example: 'Chuyên cung cấp đồ cổ sưu tầm, kỷ vật lịch sử và các tác phẩm gốm sứ độc bản.',
  })
  @IsOptional()
  @IsString({ message: 'Mô tả gian hàng phải là chuỗi ký tự' })
  storeDescription?: string;

  @ApiProperty({
    description: 'Số điện thoại liên hệ của cửa hàng / người bán',
    example: '0987654321',
  })
  @IsNotEmpty({ message: 'Số điện thoại liên hệ không được để trống' })
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  phone!: string;

  @ApiPropertyOptional({
    description: 'Email liên hệ công việc / cửa hàng (nếu khác email tài khoản)',
    example: 'shop@hoanggiavintage.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email liên hệ kinh doanh không hợp lệ' })
  businessEmail?: string;

  @ApiPropertyOptional({
    description: 'Số CMND/CCCD hoặc Mã số định danh doanh nghiệp để xác minh danh tính',
    example: '001202008888',
  })
  @IsOptional()
  @IsString({ message: 'Số CCCD/CMND phải là chuỗi ký tự' })
  identityCardNumber?: string;

  @ApiPropertyOptional({
    description:
      'Đường dẫn file hoặc tài liệu chứng minh đã tải lên (nếu không tải qua multipart form-data)',
    example: '/uploads/seller-proofs/proof-1728123456789.png',
  })
  @IsOptional()
  @IsString({ message: 'Đường dẫn file đính kèm phải là chuỗi ký tự' })
  attachmentUrl?: string;

  @ApiProperty({
    description: 'Địa chỉ cụ thể / số nhà, tên đường của cửa hàng hoặc kho lấy hàng',
    example: '720A Điện Biên Phủ',
  })
  @IsNotEmpty({ message: 'Địa chỉ cửa hàng không được để trống' })
  @IsString({ message: 'Địa chỉ cửa hàng phải là chuỗi ký tự' })
  street!: string;

  @ApiPropertyOptional({
    description: 'Phường / Xã của cửa hàng',
    example: 'Phường 22',
  })
  @IsOptional()
  @IsString({ message: 'Phường/xã phải là chuỗi ký tự' })
  ward?: string;

  @ApiPropertyOptional({
    description: 'Quận / Huyện của cửa hàng',
    example: 'Quận Bình Thạnh',
  })
  @IsOptional()
  @IsString({ message: 'Quận/huyện phải là chuỗi ký tự' })
  district?: string;

  @ApiProperty({
    description: 'Tỉnh / Thành phố của cửa hàng',
    example: 'TP. Hồ Chí Minh',
  })
  @IsNotEmpty({ message: 'Tỉnh/thành phố của cửa hàng không được để trống' })
  @IsString({ message: 'Tỉnh/thành phố phải là chuỗi ký tự' })
  city!: string;

  @ApiPropertyOptional({
    description: 'Vĩ độ GPS (Latitude) định vị gian hàng trên bản đồ',
    example: 10.795,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Kinh độ GPS (Longitude) định vị gian hàng trên bản đồ',
    example: 106.721,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Địa chỉ chuẩn hóa đầy đủ từ bản đồ toàn cầu (Google Maps / OSM)',
    example: 'Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP. Hồ Chí Minh',
  })
  @IsOptional()
  @IsString({ message: 'Địa chỉ chuẩn hóa phải là chuỗi ký tự' })
  formattedAddress?: string;

  @ApiPropertyOptional({
    description: 'Place ID bản đồ',
    example: 'ChIJw8qV...',
  })
  @IsOptional()
  @IsString({ message: 'Place ID phải là chuỗi ký tự' })
  placeId?: string;
}
