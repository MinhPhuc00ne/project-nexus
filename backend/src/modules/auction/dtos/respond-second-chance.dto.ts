import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/**
 * Data transfer object for a second-chance bidder to confirm or decline an auction purchase invitation.
 */
export class RespondSecondChanceDto {
  @ApiProperty({
    description: 'True to accept the purchase offer, false to decline',
    example: true,
  })
  @IsBoolean()
  accept!: boolean;
}
