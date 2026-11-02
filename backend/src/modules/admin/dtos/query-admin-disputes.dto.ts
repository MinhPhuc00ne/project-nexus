import { ApiPropertyOptional } from '@nestjs/swagger';
import { DisputeStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryAdminDisputesDto {
  @ApiPropertyOptional({
    description: 'Trang hiện tại (bắt đầu từ 1)',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page phải là số nguyên' })
  @Min(1, { message: 'Page tối thiểu là 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng bản ghi trên mỗi trang (tối đa 100)',
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit phải là số nguyên' })
  @Min(1, { message: 'Limit tối thiểu là 1' })
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: DisputeStatus,
    description:
      'Lọc theo trạng thái khiếu nại (OPEN, UNDER_REVIEW, RESOLVED_SELLER_FAVOR, RESOLVED_BUYER_FAVOR, CANCELLED)',
  })
  @IsOptional()
  @IsEnum(DisputeStatus, {
    message:
      'Trạng thái phải là OPEN, UNDER_REVIEW, RESOLVED_SELLER_FAVOR, RESOLVED_BUYER_FAVOR hoặc CANCELLED',
  })
  status?: DisputeStatus;

  @ApiPropertyOptional({
    description:
      'Tìm kiếm theo mã khiếu nại (id), mã đơn hàng (orderId), lý do hoặc thông tin người liên quan',
    example: 'o1',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
