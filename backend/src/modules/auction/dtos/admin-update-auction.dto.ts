import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Data transfer object used by Admin to update an upcoming auction session.
 */
export class AdminUpdateAuctionDto {
  @ApiPropertyOptional({
    description: 'Tiêu đề phiên đấu giá',
    example: 'Phiên đấu giá Đồ hiệu & Đồng hồ Thụy Sĩ (Đã cập nhật)',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết thể lệ của phiên',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Thời gian bắt đầu (ISO 8601 string)',
    example: '2026-11-08T20:30:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({
    description: 'Thời gian kết thúc (ISO 8601 string)',
    example: '2026-11-08T23:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Điểm uy tín tối thiểu của Buyer',
    example: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  minBuyerReputation?: number;

  @ApiPropertyOptional({
    description: 'Điểm uy tín tối thiểu của Seller',
    example: 80,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  minSellerReputation?: number;
}
