import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * Parcel overrides a seller can supply when a shipment is booked.
 *
 * This describes a package handed to a carrier, not an order, so it belongs to
 * fulfillment. It used to live among the seller order DTOs, which made the
 * fulfillment module import from commerce and closed an import cycle between
 * them.
 */
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
