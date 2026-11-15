import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * Data transfer object for Seller or Buyer to submit an auction-related complaint request.
 */
export class CreateAuctionComplaintDto {
  @ApiPropertyOptional({
    description: 'Related auction lot identifier (AuctionItem ID)',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  auctionItemId?: string;

  @ApiProperty({
    description: 'Detailed complaint reason submitted to Admin',
    example: 'Người mua thắng đấu giá nhưng chưa hoàn tất thanh toán sau thời hạn quy định.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập nội dung khiếu nại.' })
  @MaxLength(2000)
  reason!: string;

  @ApiPropertyOptional({
    description: 'Optional evidence image or document URLs',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  evidenceUrls?: string[];
}

export enum ResolveAuctionComplaintDecision {
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

/**
 * Data transfer object used by Admin to accept or reject an auction complaint request.
 */
export class ResolveAuctionComplaintDto {
  @ApiProperty({
    description: 'Admin decision on the complaint request',
    enum: ResolveAuctionComplaintDecision,
    example: ResolveAuctionComplaintDecision.ACCEPTED,
  })
  @IsEnum(ResolveAuctionComplaintDecision)
  @IsNotEmpty()
  status!: ResolveAuctionComplaintDecision;

  @ApiPropertyOptional({
    description: 'Optional resolution note sent back to the requester',
    example: 'Đã tiếp nhận khiếu nại và chuyển sang bước xử lý quá hạn thanh toán.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  adminNote?: string;
}
