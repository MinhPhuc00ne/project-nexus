import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ChatbotMessageDto {
  @ApiProperty({ example: 'Tôi muốn hủy đơn hàng đã được shop xác nhận' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;

  @ApiPropertyOptional({ description: 'Mã đơn NEXUS cần tra cứu; không phải mã vận đơn GHN' })
  @IsOptional()
  @IsUUID()
  orderId?: string;
}
