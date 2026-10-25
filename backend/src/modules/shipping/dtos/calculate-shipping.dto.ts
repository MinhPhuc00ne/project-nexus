import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsPhoneNumber, IsPositive, Min } from 'class-validator';

export class CalculateShippingDto {
  @ApiProperty({
    description: 'Số điện thoại người nhận (để phân loại vùng)',
    example: '+84901234567',
  })
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiProperty({ description: 'Trọng lượng thực tế (kg)', example: 2.5 })
  @IsNumber()
  @IsPositive()
  actualWeightKg: number;

  @ApiProperty({ description: 'Chiều dài (cm)', example: 30 })
  @IsNumber()
  @Min(0)
  lengthCm: number;

  @ApiProperty({ description: 'Chiều rộng (cm)', example: 20 })
  @IsNumber()
  @Min(0)
  widthCm: number;

  @ApiProperty({ description: 'Chiều cao (cm)', example: 10 })
  @IsNumber()
  @Min(0)
  heightCm: number;

  @ApiProperty({ description: 'Khoảng cách giao hàng (km)', example: 15 })
  @IsNumber()
  @Min(0)
  distanceKm: number;

  @ApiPropertyOptional({
    description: 'Giá trị đơn hàng (VNĐ) - dùng tính thuế hải quan nếu là đơn quốc tế',
    example: 1500000,
  })
  @IsNumber()
  @Min(0)
  declaredValueVnd?: number;
}
