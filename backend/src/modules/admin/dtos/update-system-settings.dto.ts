import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateSystemSettingsDto {
  @ApiPropertyOptional({
    example: 7.0,
    description: 'Tỷ lệ phần trăm hoa hồng / phí sàn thu từ người bán (%)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  platformFeePercentage?: number;

  @ApiPropertyOptional({
    example: 7,
    description: 'Thời gian giỏ hàng không hoạt động trước khi hết hạn (ngày)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(90)
  cartExpirationDays?: number;

  @ApiPropertyOptional({
    example: 15,
    description: 'Thời gian giữ tạm tồn kho khi người mua checkout (phút)',
  })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(120)
  checkoutTimeoutMinutes?: number;

  @ApiPropertyOptional({
    example: 30,
    description: 'Thời gian hết hạn khóa tồn kho reservation (phút)',
  })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(240)
  inventoryReservationTimeout?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Số lượng giỏ hàng hoạt động tối đa của mỗi người dùng',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  maxActiveCartPerUser?: number;

  @ApiPropertyOptional({
    example: 3,
    description: 'Độ sâu phân cấp tối đa của danh mục hàng hóa (cấp)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  categoryMaxLevel?: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Số lượng ảnh tối đa cho mỗi sản phẩm đăng bán',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxProductImages?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Ngưỡng đếm ngược kích hoạt gia hạn chống bắn tỉa đấu giá (phút)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  antiSnipingTriggerMinutes?: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Số phút gia hạn cộng thêm khi chống bắn tỉa kích hoạt (phút)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  antiSnipingExtendMinutes?: number;
}
