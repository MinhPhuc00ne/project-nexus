import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class QuerySellerOrdersDto {
  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái đơn hàng',
    enum: OrderStatus,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo mã đơn, tên hoặc SĐT người mua' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Số trang (bắt đầu từ 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng đơn mỗi trang (1 - 100)', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class DispatchGhnOrderDto {
  @ApiPropertyOptional({ description: 'Khối lượng gói hàng (grams)', example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(50)
  weightGrams?: number;

  @ApiPropertyOptional({ description: 'Chiều dài gói hàng (cm)', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lengthCm?: number;

  @ApiPropertyOptional({ description: 'Chiều rộng gói hàng (cm)', example: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  widthCm?: number;

  @ApiPropertyOptional({ description: 'Chiều cao gói hàng (cm)', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  heightCm?: number;

  @ApiPropertyOptional({
    description: 'Ghi chú cho shipper GHN',
    example: 'Hàng dễ vỡ, xin nhẹ tay',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
