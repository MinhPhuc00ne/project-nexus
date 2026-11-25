import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ViolationStatus } from '@prisma/client';

export class CreateShopViolationDto {
  @ApiProperty({
    example: 'Bán hàng giả mạo nhãn hiệu đã bảo hộ',
    description: 'Tiêu đề vi phạm của shop',
  })
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề vi phạm không được để trống' })
  title!: string;

  @ApiProperty({
    example:
      'Shop có hành vi đăng bán sản phẩm vi phạm bản quyền thương hiệu, không xuất trình được hóa đơn nguồn gốc.',
    description: 'Mô tả chi tiết hành vi vi phạm',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mô tả vi phạm không được để trống' })
  description!: string;

  @ApiPropertyOptional({
    example: ['https://example.com/evidence1.jpg', 'https://example.com/report.pdf'],
    description: 'Danh sách URL hình ảnh hoặc tài liệu bằng chứng vi phạm',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceUrls?: string[];

  @ApiPropertyOptional({
    example: 'TEMPORARY_SUSPENSION',
    description:
      'Mức độ xử lý vi phạm: WARNING, PENALTY_POINTS, TEMPORARY_SUSPENSION, PERMANENT_BAN',
  })
  @IsOptional()
  @IsString()
  penaltyLevel?: string;

  @ApiPropertyOptional({
    enum: ViolationStatus,
    example: ViolationStatus.CONFIRMED,
    description: 'Trạng thái vi phạm: PENDING, INVESTIGATING, CONFIRMED, DISMISSED',
    default: ViolationStatus.CONFIRMED,
  })
  @IsOptional()
  @IsEnum(ViolationStatus)
  status?: ViolationStatus;

  @ApiPropertyOptional({
    example:
      'Đã xác minh đối soát với chủ thương hiệu, tiến hành tạm ẩn sản phẩm và cảnh cáo shop.',
    description: 'Ghi chú giải quyết của Quản trị viên',
  })
  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
