import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ description: 'ID của người dùng muốn trò chuyện cùng (Seller, Buyer hoặc Staff)' })
  @IsString()
  @IsNotEmpty()
  participantId: string;

  @ApiPropertyOptional({
    description: 'Loại cuộc trò chuyện: BUYER_SELLER, STAFF_SELLER, STAFF_BUYER, GENERAL',
    default: 'BUYER_SELLER',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Tiêu đề cuộc trò chuyện / chủ đề trao đổi' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'ID ngữ cảnh liên quan (mã đơn hàng, mã sản phẩm, mã khiếu nại...)',
  })
  @IsOptional()
  @IsString()
  contextId?: string;

  @ApiPropertyOptional({ description: 'Loại ngữ cảnh: ORDER, PRODUCT, DISPUTE, TICKET' })
  @IsOptional()
  @IsString()
  contextType?: string;

  @ApiPropertyOptional({
    description: 'Nội dung tin nhắn đầu tiên gửi kèm khi khởi tạo cuộc trò chuyện',
  })
  @IsOptional()
  @IsString()
  initialMessage?: string;
}
