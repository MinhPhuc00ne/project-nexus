import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ShippingAddressDto } from '../../commerce/dtos/checkout.dto';

function hasFlatAddressFields(o: CheckoutAuctionAwardDto): boolean {
  return (
    !o.addressId &&
    !o.shippingAddress &&
    (o.recipientName !== undefined ||
      o.phone !== undefined ||
      o.city !== undefined ||
      o.street !== undefined)
  );
}

/**
 * Data transfer object for quoting or completing checkout of a won auction award.
 * Accepts either a saved addressId, a nested shippingAddress object, or complete flat address fields.
 */
export class CheckoutAuctionAwardDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Saved user address ID' })
  @IsUUID()
  @IsOptional()
  addressId?: string;

  @ApiPropertyOptional({ type: ShippingAddressDto })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  @IsOptional()
  shippingAddress?: ShippingAddressDto;

  @ApiPropertyOptional({ example: 'Nguyễn Văn A' })
  @ValidateIf(hasFlatAddressFields)
  @IsString()
  @IsNotEmpty()
  recipientName?: string;

  @ApiPropertyOptional({ example: '0987654321' })
  @ValidateIf(hasFlatAddressFields)
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @ApiPropertyOptional({ example: 'TP. Hồ Chí Minh' })
  @ValidateIf(hasFlatAddressFields)
  @IsString()
  @IsNotEmpty()
  city?: string;

  @ApiPropertyOptional({ example: 'Quận 1' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ example: 'Phường Bến Nghé' })
  @IsString()
  @IsOptional()
  ward?: string;

  @ApiPropertyOptional({ example: '123 Lê Lợi' })
  @ValidateIf(hasFlatAddressFields)
  @IsString()
  @IsNotEmpty()
  street?: string;

  @ApiPropertyOptional({ enum: ['VN'], default: 'VN' })
  @IsOptional()
  @IsIn(['VN'])
  country?: string;

  @ApiPropertyOptional({ deprecated: true })
  @IsNumber()
  @Min(0)
  @IsOptional()
  shippingFee?: number;
}
