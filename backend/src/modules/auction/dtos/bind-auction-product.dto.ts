import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Associates the single bidding lot with its fulfillable catalog product before any bid. */
export class BindAuctionProductDto {
  @ApiProperty({ description: 'Catalog product belonging to the approved consignment seller' })
  @IsUUID()
  productId: string;
}
