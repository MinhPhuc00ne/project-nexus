import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Data transfer object for submitting a bid in an active auction.
 */
export class PlaceBidDto {
  @ApiProperty({
    description: 'Submitted bid amount in VND currency',
    example: 125000000,
    minimum: 1000,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1000)
  bidAmount: number;
}
