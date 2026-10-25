import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class CalculateShippingDto {
  @ApiProperty({
    description: 'Số điện thoại người nhận (để phân loại vùng Quốc tế / Nội địa Việt Nam)',
    example: '0901234567',
  })
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  phoneNumber: string;

  @ApiProperty({ description: 'Trọng lượng thực tế (kg)', example: 2.5 })
  @IsNumber()
  @IsPositive()
  actualWeightKg: number;

  @ApiProperty({ description: 'Chiều dài kiện hàng (cm)', example: 30 })
  @IsNumber()
  @Min(0)
  lengthCm: number;

  @ApiProperty({ description: 'Chiều rộng kiện hàng (cm)', example: 20 })
  @IsNumber()
  @Min(0)
  widthCm: number;

  @ApiProperty({ description: 'Chiều cao kiện hàng (cm)', example: 10 })
  @IsNumber()
  @Min(0)
  heightCm: number;

  @ApiProperty({ description: 'Khoảng cách giao hàng (km)', example: 15 })
  @IsNumber()
  @Min(0)
  distanceKm: number;

  @ApiPropertyOptional({
    description:
      'Giá trị đơn hàng / Khai giá bảo hiểm (VNĐ) - dùng tính bảo hiểm & thuế nếu là đơn quốc tế',
    example: 1500000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declaredValueVnd?: number;

  @ApiPropertyOptional({
    description: 'Mã Quận/Huyện nhận hàng của GHN (nếu muốn tra cứu cước chính xác từ cổng GHN)',
    example: 1444,
  })
  @IsOptional()
  @IsNumber()
  toDistrictId?: number;

  @ApiPropertyOptional({
    description: 'Mã Phường/Xã nhận hàng của GHN',
    example: '20308',
  })
  @IsOptional()
  @IsString()
  toWardCode?: string;

  @ApiPropertyOptional({
    description: 'Mã Quận/Huyện gửi hàng của GHN (mặc định lấy theo kho/gian hàng)',
    example: 1442,
  })
  @IsOptional()
  @IsNumber()
  fromDistrictId?: number;

  @ApiPropertyOptional({
    description: 'Mã Phường/Xã gửi hàng của GHN',
    example: '20101',
  })
  @IsOptional()
  @IsString()
  fromWardCode?: string;

  @ApiPropertyOptional({
    description: 'Gói dịch vụ GHN (1: Nhanh, 2: Chuẩn/Tiêu chuẩn)',
    example: 2,
    default: 2,
  })
  @IsOptional()
  @IsNumber()
  serviceTypeId?: number;
}
