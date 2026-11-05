import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsInt,
  Min,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ChatbotHistoryMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;
}

export class GuestChatbotMessageDto {
  @ApiProperty({ example: 'Tôi muốn hủy đơn hàng đã được shop xác nhận' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;

  @ApiPropertyOptional({
    type: [ChatbotHistoryMessageDto],
    description:
      'Tối đa 12 tin gần nhất, không gồm tin hiện tại; không gửi dữ liệu đơn hàng hoặc bí mật.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ChatbotHistoryMessageDto)
  history?: ChatbotHistoryMessageDto[];
}

export class ChatbotMessageDto extends GuestChatbotMessageDto {
  @ApiPropertyOptional({
    enum: ['PURCHASES', 'SALES', 'CART'],
    description:
      'PURCHASES: lịch sử đặt hàng cá nhân cho mọi role; SALES: đơn bán; CART: giỏ cá nhân. Có thể nhận diện từ message nếu bỏ trống.',
  })
  @IsOptional()
  @IsIn(['PURCHASES', 'SALES', 'CART'])
  intent?: 'PURCHASES' | 'SALES' | 'CART';

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ minimum: 1, maximum: 100000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;

  @ApiPropertyOptional({ description: 'Mã đơn NEXUS cần tra cứu; không phải mã vận đơn GHN' })
  @IsOptional()
  @IsUUID()
  orderId?: string;
}
