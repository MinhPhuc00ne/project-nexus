import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;
  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
  @ApiPropertyOptional({
    type: [String],
    maxItems: 6,
    example: ['https://res.cloudinary.com/demo/image/upload/v1/review-1.jpg'],
    description: 'Image or video URLs attached to product review feedback',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { each: true })
  mediaUrls?: string[];
}

export class SellerReplyReviewDto {
  @ApiProperty({
    minLength: 2,
    maxLength: 2000,
    example: 'Cảm ơn bạn đã ủng hộ shop! Shop sẽ đóng gói kỹ hơn ở đơn sau ạ.',
    description: 'Seller reply content for a product review',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  reply!: string;
  @ApiPropertyOptional({
    type: [String],
    maxItems: 6,
    description: 'Optional image or video URLs attached to the reply',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { each: true })
  mediaUrls?: string[];
}

export class CreateReviewReplyDto {
  @ApiProperty({
    minLength: 1,
    maxLength: 2000,
    example: 'Cảm ơn bạn đã phản hồi, shop xin hỗ trợ đổi trả ngay ạ.',
    description: 'Reply message content between buyer and seller',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;

  @ApiPropertyOptional({
    type: [String],
    maxItems: 6,
    description: 'Image or video URLs attached to this reply',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { each: true })
  mediaUrls?: string[];
}

export class AdminModerateReviewVisibilityDto {
  @ApiProperty({
    example: true,
    description: 'true = ẩn đánh giá/phản hồi tiêu cực vi phạm, false = bỏ ẩn',
  })
  @IsBoolean()
  isHidden!: boolean;

  @ApiPropertyOptional({
    example: 'Nội dung chứa từ ngữ xúc phạm hoặc tiêu cực không phù hợp.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @ApiPropertyOptional({
    example: 10,
    minimum: 0,
    description: 'Số điểm uy tín muốn trừ của tác giả khi ẩn (mặc định 0 nếu không trừ)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pointsToDeduct?: number;

  @ApiPropertyOptional({
    example: 'PRODUCT',
    enum: ['PRODUCT', 'SHOP'],
  })
  @IsOptional()
  @IsIn(['PRODUCT', 'SHOP'])
  targetType?: 'PRODUCT' | 'SHOP';
}

export class ReportDto {
  @ApiProperty({ example: 'Sản phẩm không đúng mô tả' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(5)
  @MaxLength(150)
  title!: string;
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  @ApiProperty({ example: 'Nội dung mô tả chi tiết vi phạm cần kiểm tra.' })
  description!: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { each: true })
  @ApiPropertyOptional({ type: [String], maxItems: 10 })
  evidenceUrls?: string[];
}

export class FeedbackPageDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class AdminDeleteReviewDto {
  @ApiProperty({ example: 'Bình luận dùng ngôn từ thô tục, xúc phạm người bán' })
  @IsString()
  @MinLength(5, { message: 'Lý do xóa phải có ít nhất 5 ký tự' })
  @MaxLength(1000)
  reason!: string;

  @ApiProperty({ example: 10, description: 'Số điểm uy tín muốn trừ của người đánh giá' })
  @IsInt()
  @Min(1, { message: 'Điểm uy tín trừ phải lớn hơn hoặc bằng 1' })
  pointsToDeduct!: number;
}

export class QueryAdminReviewsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ enum: ['PRODUCT', 'SHOP'] })
  @IsOptional()
  @IsString()
  type?: 'PRODUCT' | 'SHOP';

  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm theo nội dung bình luận' })
  @IsOptional()
  @IsString()
  search?: string;
}
