import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WalletTransactionType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class DepositAdminWalletDto {
  @ApiProperty({
    example: 1000000,
    description: 'Số tiền nạp vào ví hệ thống (VND, tối thiểu 10.000 VNĐ)',
  })
  @IsNumber()
  @Min(10000, { message: 'Số tiền nạp tối thiểu là 10.000 VNĐ' })
  amount: number;

  @ApiPropertyOptional({
    example: 'Nạp quỹ dự phòng bảo chứng thanh toán',
    description: 'Ghi chú lý do nạp tiền vào ví hệ thống',
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class QueryAdminWalletTransactionsDto {
  @ApiPropertyOptional({ example: 1, default: 1, description: 'Số trang' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10, description: 'Số bản ghi mỗi trang' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: WalletTransactionType,
    description: 'Lọc theo loại giao dịch (PLATFORM_FEE, DEPOSIT, WITHDRAW...)',
  })
  @IsOptional()
  @IsEnum(WalletTransactionType)
  type?: WalletTransactionType;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'Từ ngày (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-10-31', description: 'Đến ngày (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo mã đơn hàng hoặc mô tả' })
  @IsOptional()
  @IsString()
  search?: string;
}
