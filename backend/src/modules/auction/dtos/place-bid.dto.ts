import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Data transfer object for submitting a bid on a specific auction lot.
 */
export class PlaceBidDto {
  @ApiPropertyOptional({
    description: 'Target auction lot identifier (AuctionItem ID)',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  auctionItemId?: string;

  @ApiProperty({
    description: 'Submitted bid amount in VND currency',
    example: 125000000,
    minimum: 1000,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1000)
  bidAmount!: number;
}
