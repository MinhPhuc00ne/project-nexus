import { ChatContextType, ChatConversationType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @ApiPropertyOptional({
    description: 'ID của người dùng muốn trò chuyện cùng (Seller, Buyer hoặc Staff)',
  })
  @IsOptional()
  @IsString()
  participantId?: string;

  @ApiPropertyOptional({
    description: 'ID người nhận (alias tương đương participantId, tương thích format cũ)',
  })
  @IsOptional()
  @IsString()
  targetUserId?: string;

  @ApiPropertyOptional({
    description: 'Loại cuộc trò chuyện: BUYER_SELLER, STAFF_SELLER, STAFF_BUYER',
    enum: ChatConversationType,
    default: ChatConversationType.BUYER_SELLER,
  })
  @IsOptional()
  @IsEnum(ChatConversationType)
  type?: ChatConversationType;

  @ApiPropertyOptional({ description: 'Tiêu đề cuộc trò chuyện / chủ đề trao đổi' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description: 'ID ngữ cảnh liên quan (mã đơn hàng, mã sản phẩm, mã khiếu nại...)',
  })
  @IsOptional()
  @IsString()
  contextId?: string;

  @ApiPropertyOptional({
    description: 'Loại ngữ cảnh: GENERAL, ORDER, PRODUCT, AUCTION, DISPUTE, TICKET',
    enum: ChatContextType,
  })
  @IsOptional()
  @IsEnum(ChatContextType)
  contextType?: ChatContextType;

  @ApiPropertyOptional({
    description: 'Nội dung tin nhắn đầu tiên gửi kèm khi khởi tạo cuộc trò chuyện',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  initialMessage?: string;
}
