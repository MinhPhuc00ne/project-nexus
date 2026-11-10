import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

/** Places the supplied banners first, followed by the remaining banners. */
export class ReorderBannersDto {
  @ApiProperty({
    type: [String],
    minItems: 1,
    maxItems: 100,
    description: 'Banner UUIDs in display order; omitted banners follow with priority zero.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  bannerIds!: string[];
}
