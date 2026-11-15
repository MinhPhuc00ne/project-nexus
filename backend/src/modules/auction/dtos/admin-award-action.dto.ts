import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Data transfer object for Admin post-auction confirmation actions on an auction award.
 */
export class AdminAwardActionDto {
  @ApiProperty({
    description: 'Explicit admin confirmation flag for irreversible award actions',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  confirmed!: boolean;

  @ApiPropertyOptional({
    description: 'Optional administrative note describing the action',
    example: 'Người mua không hoàn tất thanh toán phần còn lại trong thời hạn 24 giờ.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  note?: string;
}
