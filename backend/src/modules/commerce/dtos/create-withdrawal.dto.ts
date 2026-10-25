import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWithdrawalDto {
  @ApiProperty({
    example: 500000,
    description: 'Số tiền muốn rút (VND, tối thiểu 50.000 VND)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(50000, { message: 'Số tiền rút tối thiểu là 50.000 VND' })
  amount: number;

  @ApiProperty({
    example: 'Vietcombank',
    description: 'Tên ngân hàng thụ hưởng (e.g., Vietcombank, MB Bank, Techcombank)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Tên ngân hàng không được để trống' })
  bankName: string;

  @ApiProperty({
    example: '1029384756',
    description: 'Số tài khoản ngân hàng thụ hưởng',
  })
  @IsString()
  @IsNotEmpty({ message: 'Số tài khoản không được để trống' })
  accountNumber: string;

  @ApiProperty({
    example: 'NGUYEN VAN A',
    description: 'Họ và tên chủ tài khoản thụ hưởng (viết hoa không dấu)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Tên chủ tài khoản không được để trống' })
  accountHolderName: string;

  @ApiPropertyOptional({
    example: 'Rút tiền doanh thu bán hàng tháng 10',
    description: 'Ghi chú thêm của người bán',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
