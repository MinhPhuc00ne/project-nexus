import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiPropertyOptional({
    description: 'ID của cuộc trò chuyện (tùy chọn khi gửi qua endpoint có param :id)',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({ description: 'Nội dung tin nhắn văn bản' })
  @IsOptional()
  @IsString()
  @MaxLength(4000, { message: 'Nội dung tin nhắn không được vượt quá 4000 ký tự' })
  content?: string;

  @ApiPropertyOptional({ description: 'Nội dung văn bản (alias tương đương content)' })
  @IsOptional()
  @IsString()
  @MaxLength(4000, { message: 'Nội dung tin nhắn không được vượt quá 4000 ký tự' })
  body?: string;

  @ApiPropertyOptional({
    description: 'Danh sách URL hình ảnh / tài liệu đính kèm (URL từ Cloudinary)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
