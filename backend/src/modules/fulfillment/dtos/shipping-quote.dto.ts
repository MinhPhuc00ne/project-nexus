import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  IsInt,
  IsIn,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ShippingItemDto {
  @ApiProperty({ description: 'Mã ID sản phẩm' })
  @IsString()
  productId!: string;

  @ApiPropertyOptional({ description: 'Số lượng món hàng', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity: number = 1;

  @ApiPropertyOptional({ description: 'Khối lượng tính theo gram', default: 500 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  weightGrams?: number;

  @ApiPropertyOptional({ description: 'Chiều dài (cm)', default: 10 })
  @IsOptional()
  @IsNumber()
  lengthCm?: number;

  @ApiPropertyOptional({ description: 'Chiều rộng (cm)', default: 10 })
  @IsOptional()
  @IsNumber()
  widthCm?: number;

  @ApiPropertyOptional({ description: 'Chiều cao (cm)', default: 10 })
  @IsOptional()
  @IsNumber()
  heightCm?: number;
}

export class ShippingQuoteDto {
  @ApiPropertyOptional({
    description: 'Mã địa chỉ người nhận trong sổ địa chỉ (UserAddress)',
  })
  @IsOptional()
  @IsString()
  addressId?: string;

  @ApiPropertyOptional({ description: 'Mã kho gửi hàng (mặc định WH_001)' })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional({ description: 'Mã người bán (để tính khoảng cách từ gian hàng)' })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @ApiPropertyOptional({ description: 'Vĩ độ điểm gửi (GPS Latitude)' })
  @IsOptional()
  @IsNumber()
  originLatitude?: number;

  @ApiPropertyOptional({ description: 'Kinh độ điểm gửi (GPS Longitude)' })
  @IsOptional()
  @IsNumber()
  originLongitude?: number;

  @ApiPropertyOptional({ description: 'Vĩ độ điểm nhận (GPS Latitude)' })
  @IsOptional()
  @IsNumber()
  destLatitude?: number;

  @ApiPropertyOptional({ description: 'Kinh độ điểm nhận (GPS Longitude)' })
  @IsOptional()
  @IsNumber()
  destLongitude?: number;

  @ApiPropertyOptional({ description: 'Mã quận/huyện người gửi GHN' })
  @IsOptional()
  @IsNumber()
  fromDistrictId?: number;

  @ApiPropertyOptional({ description: 'Mã phường/xã người gửi GHN' })
  @IsOptional()
  @IsString()
  fromWardCode?: string;

  @ApiPropertyOptional({ description: 'Mã quận/huyện người nhận GHN' })
  @IsOptional()
  @IsNumber()
  toDistrictId?: number;

  @ApiPropertyOptional({ description: 'Mã phường/xã người nhận GHN' })
  @IsOptional()
  @IsString()
  toWardCode?: string;

  @ApiProperty({
    type: [ShippingItemDto],
    description: 'Danh sách sản phẩm cần tính cước vận chuyển',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShippingItemDto)
  items: ShippingItemDto[] = [];
}

export class DirectDistanceDto {
  @ApiProperty({ description: 'Vĩ độ điểm xuất phát (Latitude)', example: 10.7769 })
  @IsNumber()
  originLat!: number;

  @ApiProperty({ description: 'Kinh độ điểm xuất phát (Longitude)', example: 106.7009 })
  @IsNumber()
  originLon!: number;

  @ApiProperty({ description: 'Vĩ độ điểm đến (Latitude)', example: 10.7327 })
  @IsNumber()
  destLat!: number;

  @ApiProperty({ description: 'Kinh độ điểm đến (Longitude)', example: 106.717 })
  @IsNumber()
  destLon!: number;

  @ApiPropertyOptional({
    description: 'Tổng trọng lượng hàng hóa (gram) để tính cước kèm theo',
    default: 500,
  })
  @IsOptional()
  @IsNumber()
  weightGrams?: number = 500;
}

export class CalculateGhnFeeDto {
  @ApiProperty({ description: 'Mã Quận/Huyện nhận hàng (GHN District ID)', example: 1444 })
  @IsInt()
  @Min(1)
  toDistrictId!: number;

  @ApiProperty({ description: 'Mã Phường/Xã nhận hàng (GHN Ward Code)', example: '20308' })
  @IsString()
  @IsNotEmpty()
  toWardCode!: string;

  @ApiPropertyOptional({
    description: 'Mã Quận/Huyện gửi hàng (nếu bỏ trống hệ thống tự lấy theo kho/shop người bán)',
    example: 1442,
  })
  @IsOptional()
  @IsNumber()
  fromDistrictId?: number;

  @ApiPropertyOptional({ description: 'Mã Phường/Xã gửi hàng', example: '20101' })
  @IsOptional()
  @IsString()
  fromWardCode?: string;

  @ApiPropertyOptional({
    description: 'Trọng lượng gói hàng tính theo gram',
    example: 1000,
    default: 500,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  weightGrams?: number = 500;

  @ApiPropertyOptional({ description: 'Chiều dài kiện hàng (cm)', example: 20, default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  lengthCm?: number = 10;

  @ApiPropertyOptional({ description: 'Chiều rộng kiện hàng (cm)', example: 15, default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  widthCm?: number = 10;

  @ApiPropertyOptional({ description: 'Chiều cao kiện hàng (cm)', example: 10, default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  heightCm?: number = 10;

  @ApiPropertyOptional({
    description: 'Giá trị khai giá / bảo hiểm hàng hóa (VNĐ)',
    example: 500000,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  insuranceValue?: number = 0;

  @ApiPropertyOptional({
    description:
      'Dịch vụ GHN: 2 (hàng nhẹ), 5 (hàng nặng/nhiều kiện). Bỏ trống để chọn theo khối lượng.',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @IsIn([2, 5])
  serviceTypeId?: number;

  @ApiPropertyOptional({
    type: () => [GhnFeeItemDto],
    description: 'Bắt buộc với dịch vụ hàng nặng GHN',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GhnFeeItemDto)
  items?: GhnFeeItemDto[];
}

export class GhnFeeItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ description: 'Khối lượng một sản phẩm/kiện, gram' })
  @IsInt()
  @Min(1)
  weight!: number;

  @ApiProperty({ description: 'Chiều dài, cm' })
  @IsInt()
  @Min(1)
  length!: number;

  @ApiProperty({ description: 'Chiều rộng, cm' })
  @IsInt()
  @Min(1)
  width!: number;

  @ApiProperty({ description: 'Chiều cao, cm' })
  @IsInt()
  @Min(1)
  height!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  price!: number;
}
