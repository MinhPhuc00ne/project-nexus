import { ApiPropertyOptional } from '@nestjs/swagger';
import { SellerRequestStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class QuerySellerRequestsDto {
  @ApiPropertyOptional({
    enum: SellerRequestStatus,
    description: 'Lọc theo trạng thái yêu cầu (PENDING, APPROVED, REJECTED)',
  })
  @IsOptional()
  @IsEnum(SellerRequestStatus, {
    message: 'Trạng thái phải là PENDING, APPROVED hoặc REJECTED',
  })
  status?: SellerRequestStatus;

  @ApiPropertyOptional({ description: 'Trang hiện tại (bắt đầu từ 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page phải là số nguyên' })
  @Min(1, { message: 'Page tối thiểu là 1' })
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số bản ghi trên mỗi trang', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit phải là số nguyên' })
  @Min(1, { message: 'Limit tối thiểu là 1' })
  limit?: number = 10;
}
