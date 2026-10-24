import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';

export class PayOrderDto {
  @ApiPropertyOptional({
    enum: PaymentProvider,
    default: PaymentProvider.PAYOS,
    description: 'Cổng thanh toán muốn sử dụng (PAYOS, STRIPE, WALLET)',
  })
  @IsEnum(PaymentProvider)
  @IsOptional()
  provider?: PaymentProvider;

  @ApiPropertyOptional({
    example: 'http://localhost:5173/payment/success',
    description: 'URL chuyển hướng khi thanh toán thành công',
  })
  @IsString()
  @IsOptional()
  returnUrl?: string;

  @ApiPropertyOptional({
    example: 'http://localhost:5173/payment/cancel',
    description: 'URL chuyển hướng khi người dùng bấm hủy',
  })
  @IsString()
  @IsOptional()
  cancelUrl?: string;
}
