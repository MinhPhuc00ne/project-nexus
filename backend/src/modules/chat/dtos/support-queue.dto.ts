import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export enum TicketLifecycleStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export class RequestSupportDto {
  @ApiPropertyOptional({
    description: 'Tiêu đề tóm tắt yêu cầu hỗ trợ',
    example: 'Khiếu nại đơn hàng không nhận được',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiProperty({
    description: 'Nội dung chi tiết yêu cầu hỗ trợ gửi đến nhân viên CSKH',
    example: 'Tôi đã thanh toán đơn hàng #ORD-123 nhưng người bán không gửi hàng theo hẹn.',
  })
  @IsNotEmpty({ message: 'Nội dung yêu cầu hỗ trợ không được để trống.' })
  @IsString()
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({
    description: 'Mã định danh ngữ cảnh liên quan (mã tranh chấp, mã đơn hàng)',
    example: 'dispute-uuid-456',
  })
  @IsOptional()
  @IsString()
  contextId?: string;

  @ApiPropertyOptional({
    description: 'Loại ngữ cảnh: DISPUTE (Tranh chấp), ORDER (Đơn hàng), GENERAL (Hỗ trợ chung)',
    default: 'GENERAL',
    example: 'DISPUTE',
  })
  @IsOptional()
  @IsString()
  contextType?: string = 'GENERAL';

  @ApiPropertyOptional({
    description: 'Danh sách URL hình ảnh / bằng chứng đính kèm',
    type: [String],
    example: ['https://res.cloudinary.com/nexus/evidence1.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class UpdateConversationStatusDto {
  @ApiProperty({
    description: 'Trạng thái mới của cuộc trò chuyện / ticket hỗ trợ',
    enum: TicketLifecycleStatus,
    example: TicketLifecycleStatus.RESOLVED,
  })
  @IsNotEmpty()
  @IsEnum(TicketLifecycleStatus, {
    message: 'Trạng thái phải là OPEN, IN_PROGRESS, RESOLVED hoặc CLOSED.',
  })
  status: TicketLifecycleStatus;

  @ApiPropertyOptional({
    description: 'Ghi chú giải quyết hoặc lý do đóng cuộc trò chuyện',
    example: 'Đã hoàn tiền cho người mua thành công.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolutionNotes?: string;
}

export class QueryQueueDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại (bắt đầu từ 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng yêu cầu mỗi trang', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Lọc theo loại ngữ cảnh: DISPUTE, ORDER, GENERAL',
  })
  @IsOptional()
  @IsString()
  contextType?: string;
}
