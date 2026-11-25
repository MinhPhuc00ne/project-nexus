import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
  IsEnum,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';

export class ShippingAddressDto {
  @ApiPropertyOptional({ enum: ['VN'], default: 'VN' })
  @IsOptional()
  @IsIn(['VN'])
  country?: string = 'VN';
  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Họ tên người nhận' })
  @IsString()
  @IsNotEmpty()
  recipientName!: string;

  @ApiProperty({ example: '0987654321', description: 'Số điện thoại người nhận' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: 'TP. Hồ Chí Minh', description: 'Tỉnh/Thành phố' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiPropertyOptional({ example: 'Quận 1', description: 'Quận/Huyện' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ example: 'Phường Bến Nghé', description: 'Phường/Xã' })
  @IsString()
  @IsOptional()
  ward?: string;

  @ApiProperty({ example: '123 Lê Lợi', description: 'Địa chỉ đường/số nhà cụ thể' })
  @IsString()
  @IsNotEmpty()
  street!: string;
}

export class CheckoutDto {
  @ApiProperty({ description: 'Thông tin địa chỉ giao hàng' })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress!: ShippingAddressDto;

  @ApiPropertyOptional({
    description:
      'Danh sách ID các CartItem muốn thanh toán (nếu bỏ trống sẽ thanh toán toàn bộ giỏ)',
    example: ['item-uuid-1', 'item-uuid-2'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  itemIds?: string[];

  @ApiPropertyOptional({
    deprecated: true,
    description: 'Chỉ giữ tương thích request cũ. Backend bỏ qua giá trị này và lấy phí từ GHN.',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  shippingFee?: number;

  @ApiPropertyOptional({
    enum: PaymentProvider,
    example: PaymentProvider.PAYOS,
    description: 'Phương thức thanh toán khởi tạo ban đầu',
    default: PaymentProvider.PAYOS,
  })
  @IsEnum(PaymentProvider)
  @IsOptional()
  paymentMethod?: PaymentProvider;

  @ApiPropertyOptional({
    example: 'http://localhost:5173/payment/success',
    description: 'URL chuyển hướng khi thanh toán thành công trên PayOS',
  })
  @IsString()
  @IsOptional()
  returnUrl?: string;

  @ApiPropertyOptional({
    example: 'http://localhost:5173/payment/cancel',
    description: 'URL chuyển hướng khi người dùng hủy trên trang PayOS',
  })
  @IsString()
  @IsOptional()
  cancelUrl?: string;
}
