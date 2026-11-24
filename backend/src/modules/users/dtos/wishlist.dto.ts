import { ArrayMaxSize, IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SyncWishlistDto {
  @ApiProperty({
    example: ['prod-uuid-1', 'prod-uuid-2'],
    description: 'List of guest product IDs to sync into the user account',
    type: [String],
  })
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  productIds!: string[];
}
