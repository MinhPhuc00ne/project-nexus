import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWithdrawalDto {
  @ApiProperty({
    example: 50000,
    description: 'Số tiền muốn rút (VND, phải lớn hơn 0)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Số tiền rút phải lớn hơn 0 VND' })
  amount!: number;

  @ApiPropertyOptional({
    example: 'Vietcombank',
    description:
      'Tên ngân hàng thụ hưởng (e.g., Vietcombank, MB Bank). Nếu để trống sẽ lấy từ Hồ sơ cá nhân.',
  })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({
    example: '1029384756',
    description: 'Số tài khoản ngân hàng thụ hưởng. Nếu để trống sẽ lấy từ Hồ sơ cá nhân.',
  })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional({
    example: 'NGUYEN VAN A',
    description: 'Họ và tên chủ tài khoản thụ hưởng. Nếu để trống sẽ lấy từ Hồ sơ cá nhân.',
  })
  @IsOptional()
  @IsString()
  accountHolderName?: string;

  @ApiPropertyOptional({
    example: 'Rút tiền doanh thu bán hàng tháng 10',
    description: 'Ghi chú thêm của người bán',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
