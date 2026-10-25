import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { DisputeStatus } from '@prisma/client';

export class QuerySellerReviewsDto {
  @ApiPropertyOptional({ description: 'Lọc theo số sao đánh giá (1 - 5)', example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: 'Số trang (bắt đầu từ 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng đánh giá mỗi trang (1 - 100)', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class QuerySellerDisputesDto {
  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái khiếu nại',
    enum: DisputeStatus,
  })
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

  @ApiPropertyOptional({ description: 'Số trang (bắt đầu từ 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng khiếu nại mỗi trang (1 - 100)', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class RespondDisputeDto {
  @ApiProperty({
    description: 'Nội dung phản hồi / giải trình từ phía người bán',
    example: 'Tôi đã đóng gói đúng hàng và gửi qua GHN, bưu kiện có dán tem niêm phong đầy đủ.',
  })
  @IsString()
  @IsNotEmpty()
  responseNotes!: string;

  @ApiPropertyOptional({
    description: 'Danh sách URL hình ảnh / video bằng chứng đối chất của người bán',
    type: [String],
    example: ['https://storage.nexus.vn/evidence/pack_proof_1.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceUrls?: string[];
}
