import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ description: 'ID của người dùng muốn nhắn tin cùng' })
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}

export class SendMessageDto {
  @ApiProperty({ description: 'ID của cuộc trò chuyện' })
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @ApiPropertyOptional({ description: 'Nội dung tin nhắn văn bản' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: 'Danh sách đường dẫn hình ảnh đính kèm (URL từ Cloudinary)',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}
