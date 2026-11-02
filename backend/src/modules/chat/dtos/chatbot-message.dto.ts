import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
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
  @ApiPropertyOptional({ description: 'Mã đơn NEXUS cần tra cứu; không phải mã vận đơn GHN' })
  @IsOptional()
  @IsUUID()
  orderId?: string;
}
