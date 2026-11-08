import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ReviewAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

/**
 * Data transfer object used by Admin to approve or reject a consigned auction item.
 */
export class ReviewAuctionItemDto {
  @ApiProperty({
    description: 'Hành động duyệt: APPROVE (Phê duyệt) hoặc REJECT (Từ chối)',
    enum: ReviewAction,
    example: ReviewAction.APPROVE,
  })
  @IsEnum(ReviewAction)
  @IsNotEmpty()
  action: ReviewAction;

  @ApiPropertyOptional({
    description: 'Lý do từ chối (bắt buộc nếu action là REJECT)',
    example: 'Giấy chứng nhận giám định mờ, số serial không trùng khớp với sản phẩm.',
  })
  @ValidateIf((o: ReviewAuctionItemDto) => o.action === ReviewAction.REJECT)
  @IsString()
  @IsNotEmpty({ message: 'rejectionReason không được để trống khi từ chối món hàng' })
  rejectionReason?: string;

  @ApiPropertyOptional({
    description: 'Số thứ tự Lô hàng trong phiên đấu giá (nếu duyệt)',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  lotNumber?: number;

  @ApiPropertyOptional({
    description:
      'Giá khởi điểm chính thức (Admin có thể điều chỉnh hoặc để trống dùng giá đề xuất)',
    example: 150000000,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  startingPrice?: number;

  @ApiPropertyOptional({
    description: 'Giá bảo lưu chính thức',
    example: 180000000,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  reservePrice?: number;

  @ApiPropertyOptional({
    description: 'Bước giá chính thức',
    example: 2000000,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  bidIncrement?: number;
}
