import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryConversationsDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại (bắt đầu từ 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng mục trên một trang', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Lọc theo loại cuộc trò chuyện: BUYER_SELLER, STAFF_SELLER, STAFF_BUYER',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên người tham gia hoặc tiêu đề hội thoại' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class QueryMessagesDto {
  @ApiPropertyOptional({ description: 'Số lượng tin nhắn cần lấy', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Lấy tin nhắn trước mốc thời gian này (ISO string) để phân trang ngược',
  })
  @IsOptional()
  @IsString()
  before?: string;
}
