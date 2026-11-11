import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUrl } from 'class-validator';

/** Updates only the session image using the URL returned by the media upload API. */
export class UpdateAuctionImageDto {
  @ApiProperty({ description: 'HTTP(S) image URL returned by POST /media/upload' })
  @IsNotEmpty()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  imageUrl!: string;
}
