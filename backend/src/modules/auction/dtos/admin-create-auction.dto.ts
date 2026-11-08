import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Data transfer object used by Admin to create a new auction session/event.
 * Note: Real date constraint (startTime > now) is omitted per demo requirements.
 */
export class AdminCreateAuctionDto {
  @ApiProperty({
    description: 'Tiêu đề của phiên đấu giá',
    example: 'Phiên đấu giá Đồ hiệu & Đồng hồ Thụy Sĩ Tháng 11',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết, thể lệ của phiên đấu giá',
    example:
      'Phiên đấu giá đặc biệt dành cho các sản phẩm trang sức và đồng hồ cao cấp đã qua thẩm định chứng thư.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Thời gian bắt đầu phiên đấu giá (ISO 8601 string)',
    example: '2026-11-08T20:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({
    description: 'Thời gian kết thúc phiên đấu giá (ISO 8601 string)',
    example: '2026-11-08T22:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @ApiPropertyOptional({
    description: 'Số điểm uy tín tối thiểu của Người mua (Buyer) để tham gia trả giá',
    example: 100,
    default: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  minBuyerReputation?: number = 100;

  @ApiPropertyOptional({
    description: 'Số điểm uy tín tối thiểu của Người bán (Seller) để gửi đồ vào phiên',
    example: 80,
    default: 80,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  minSellerReputation?: number = 80;
}
