import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class DepositWalletDto {
  @ApiProperty({
    example: 500000,
    description: 'Số tiền nạp vào ví cá nhân (VND, tối thiểu 10.000 VNĐ)',
  })
  @IsNumber()
  @Min(10000, { message: 'Số tiền nạp tối thiểu là 10.000 VNĐ' })
  amount: number;

  @ApiPropertyOptional({
    example: 'Nạp tiền vào ví NEXUS Pay để mua hàng',
    description: 'Ghi chú lý do nạp tiền',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
