import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { WalletTransactionStatus, WalletTransactionType } from '@prisma/client';

export class QueryFinanceDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({
    enum: WalletTransactionType,
    description:
      'Lọc theo loại giao dịch ví: DEPOSIT, WITHDRAW, ESCROW_LOCK, ESCROW_PAYOUT, ESCROW_REFUND',
  })
  @IsOptional()
  @IsEnum(WalletTransactionType)
  type?: WalletTransactionType;

  @ApiPropertyOptional({
    enum: WalletTransactionStatus,
    description: 'Lọc theo trạng thái: PENDING, SUCCESS, FAILED',
  })
  @IsOptional()
  @IsEnum(WalletTransactionStatus)
  status?: WalletTransactionStatus;
}
