import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Data transfer object used by Support Staff to attach a pre-review or live support note on a lot.
 */
export class StaffAuctionNoteDto {
  @ApiPropertyOptional({
    description: 'Support staff inspection or live room support note',
    example: 'Đã kiểm tra sơ bộ giấy kiểm định GIA và đối chiếu ảnh thực tế.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  staffNote?: string;
}
