import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProductStatusDto {
  @ApiProperty({
    enum: ProductStatus,
    example: ProductStatus.INACTIVE,
    description: 'Trạng thái sản phẩm mong muốn (ACTIVE: hiển thị bán, INACTIVE: ẩn/khóa)',
  })
  @IsEnum(ProductStatus, { message: 'Trạng thái sản phẩm phải là ACTIVE, INACTIVE hoặc DRAFT' })
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  status!: ProductStatus;

  @ApiPropertyOptional({
    example: 'Sản phẩm vi phạm tiêu chuẩn cộng đồng hoặc chứa nội dung nhạy cảm',
    description: 'Lý do thay đổi trạng thái hoặc nhắc nhở dành cho Seller',
  })
  @IsOptional()
  @IsString({ message: 'Lý do phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Lý do tối đa 500 ký tự' })
  reason?: string;
}

