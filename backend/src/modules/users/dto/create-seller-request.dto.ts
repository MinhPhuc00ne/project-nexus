import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
}
