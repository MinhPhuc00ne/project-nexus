import { ChatAutoReplyScope, ChatAutoReplyStatus, ChatAutoReplyTriggerType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAutoReplyDto {
  @ApiPropertyOptional({
    description: 'Tên cấu hình tin nhắn tự động',
    example: 'Tin nhắn chào mừng',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description:
      'Loại kích hoạt: WELCOME (lần đầu chat), OFFLINE (ngoài giờ), KEYWORD (từ khóa), DEFAULT',
    enum: ChatAutoReplyTriggerType,
    default: ChatAutoReplyTriggerType.WELCOME,
  })
  @IsOptional()
  @IsEnum(ChatAutoReplyTriggerType)
  triggerType?: ChatAutoReplyTriggerType = ChatAutoReplyTriggerType.WELCOME;

  @ApiPropertyOptional({
    description: 'Từ khóa kích hoạt (nếu triggerType là KEYWORD)',
    example: 'bảo hành',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @ApiProperty({
    description: 'Nội dung tin nhắn tự động gửi đến khách hàng',
    example: 'Chào bạn! Cảm ơn bạn đã nhắn tin cho shop. Shop sẽ phản hồi trong giây lát.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung tin nhắn tự động không được để trống' })
  @MaxLength(1000, { message: 'Nội dung tin nhắn tự động tối đa 1000 ký tự' })
  content!: string;

  @ApiPropertyOptional({ description: 'Trạng thái kích hoạt (mặc định true)', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateAutoReplyDto {
  @ApiPropertyOptional({ description: 'Tên cấu hình tin nhắn tự động' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Loại kích hoạt: WELCOME, OFFLINE, KEYWORD, DEFAULT',
    enum: ChatAutoReplyTriggerType,
  })
  @IsOptional()
  @IsEnum(ChatAutoReplyTriggerType)
  triggerType?: ChatAutoReplyTriggerType;

  @ApiPropertyOptional({ description: 'Từ khóa kích hoạt' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @ApiPropertyOptional({ description: 'Nội dung tin nhắn tự động' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  content?: string;

  @ApiPropertyOptional({ description: 'Trạng thái kích hoạt' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CancelAutoReplyDto {
  @ApiProperty({
    description: 'Lý do Admin hủy/khóa tin nhắn tự động của Seller',
    example: 'Nội dung chứa thông tin sai lệch hoặc vi phạm chính sách của sàn.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Lý do hủy không được để trống' })
  @MaxLength(500)
  cancelReason!: string;
}

export class QueryAutoRepliesDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại (bắt đầu từ 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng mục trên một trang', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Phạm vi: SYSTEM (hệ thống/staff) hoặc SHOP (của seller)',
    enum: ChatAutoReplyScope,
  })
  @IsOptional()
  @IsEnum(ChatAutoReplyScope)
  scope?: ChatAutoReplyScope;

  @ApiPropertyOptional({
    description: 'Trạng thái: ACTIVE hoặc CANCELLED_BY_ADMIN',
    enum: ChatAutoReplyStatus,
  })
  @IsOptional()
  @IsEnum(ChatAutoReplyStatus)
  status?: ChatAutoReplyStatus;

  @ApiPropertyOptional({ description: 'ID gian hàng / Seller cụ thể (dành cho Admin lọc)' })
  @IsOptional()
  @IsString()
  shopId?: string;
}
