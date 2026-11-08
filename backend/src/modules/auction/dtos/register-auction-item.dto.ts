import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Data transfer object used by Seller to register an item with online appraisal certificates into an auction.
 */
export class RegisterAuctionItemDto {
  @ApiProperty({
    description: 'Tên món hàng ký gửi đấu giá',
    example: 'Đồng hồ Patek Philippe Nautilus 5711/1R-001 Vàng hồng 18K',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Mô tả chi tiết nguồn gốc, tình trạng thực tế của món hàng',
    example: 'Đồng hồ nguyên bản 99%, đầy đủ hộp sổ thẻ mua tại đại lý chính hãng năm 2024.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Danh sách URL ảnh chụp đa góc cạnh sản phẩm',
    example: ['https://example.com/patek1.jpg', 'https://example.com/patek2.jpg'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  images: string[];

  @ApiPropertyOptional({
    description: 'Khóa định danh mô hình 3D (nếu có)',
    example: 'models/patek-5711.glb',
  })
  @IsString()
  @IsOptional()
  threeModelKey?: string;

  @ApiProperty({
    description: 'Giá khởi điểm đề xuất (VND)',
    example: 150000000,
    minimum: 10000,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(10000)
  proposedStartingPrice: number;

  @ApiPropertyOptional({
    description: 'Giá bảo lưu đề xuất (VND) - mức giá sàn tối thiểu người bán chấp nhận bán',
    example: 180000000,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  proposedReservePrice?: number;

  @ApiPropertyOptional({
    description: 'Bước giá đề xuất (VND)',
    example: 2000000,
    default: 100000,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1000)
  proposedBidIncrement?: number = 100000;

  @ApiPropertyOptional({
    description: 'Số hiệu chứng thư / giấy giám định kiểm định',
    example: 'GIA-2026-PP-998822',
  })
  @IsString()
  @IsOptional()
  appraisalCertificateNumber?: string;

  @ApiPropertyOptional({
    description: 'Tên đơn vị thẩm định / tổ chức cấp chứng thư',
    example: 'Viện Giám định Đá quý & Đồng hồ Quốc tế (GIA)',
  })
  @IsString()
  @IsOptional()
  appraisalAgency?: string;

  @ApiProperty({
    description: 'Danh sách URL ảnh chụp chứng thư giám định, hóa đơn gốc, thẻ bảo hành online',
    example: [
      'https://example.com/cert-patek-front.jpg',
      'https://example.com/cert-patek-back.jpg',
    ],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  certificateImages: string[];

  @ApiPropertyOptional({
    description: 'Ngày cấp chứng thư kiểm định (ISO 8601)',
    example: '2026-05-15T00:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  certificateIssueDate?: string;
}
