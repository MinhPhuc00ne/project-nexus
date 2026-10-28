import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class AfterSalesRequestDto {
  @ApiProperty()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;

  @ApiPropertyOptional({
    description: 'Explicit consent to refund external payments into NEXUS wallet',
  })
  @IsOptional()
  @IsBoolean()
  refundToWallet?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({ protocols: ['https'], require_protocol: true }, { each: true })
  evidenceUrls?: string[];
}

export class ReviewReturnDto extends AfterSalesRequestDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT'] })
  @IsIn(['APPROVE', 'REJECT'])
  decision!: 'APPROVE' | 'REJECT';
}

export class CancelOrderDto extends AfterSalesRequestDto {
  @ApiPropertyOptional({ enum: ['BUYER_REQUEST', 'STOCKOUT', 'SELLER_FAULT', 'OTHER'] })
  @IsOptional()
  @IsIn(['BUYER_REQUEST', 'STOCKOUT', 'SELLER_FAULT', 'OTHER'])
  reasonCode?: 'BUYER_REQUEST' | 'STOCKOUT' | 'SELLER_FAULT' | 'OTHER';
}

export class ReturnWaybillDto {
  @ApiProperty({ description: 'GHN waybill for a separate buyer-to-seller return shipment' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  waybillCode!: string;
}

export class ReceiveReturnDto extends AfterSalesRequestDto {
  @ApiProperty({
    description: 'Only true if all returned items passed inspection and can be sold again',
  })
  @IsBoolean()
  restock!: boolean;
}

export class CompleteRefundDto {
  @ApiProperty({
    description:
      'Verified bank/provider refund reference; cancelling a payment link is not a refund',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  externalReference!: string;
}

export class AfterSalesPageDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export class QueryAfterSalesDto extends AfterSalesPageDto {
  @IsOptional()
  @IsIn(['REQUESTED', 'APPROVING', 'APPROVED', 'RECEIVED', 'COMPLETED', 'REJECTED'])
  status?: string;
}

export class QueryRefundsDto extends AfterSalesPageDto {
  @IsOptional()
  @IsIn(['PENDING', 'SUCCESS'])
  status: string = 'PENDING';
}
