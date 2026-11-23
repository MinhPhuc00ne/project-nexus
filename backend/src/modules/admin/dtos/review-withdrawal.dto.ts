import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { WithdrawalStatus } from '@prisma/client';

const REVIEWABLE_WITHDRAWAL_STATUSES = [
  WithdrawalStatus.APPROVED,
  WithdrawalStatus.REJECTED,
  WithdrawalStatus.COMPLETED,
] as const;

export class ReviewWithdrawalDto {
  @ApiProperty({
    enum: REVIEWABLE_WITHDRAWAL_STATUSES,
    example: WithdrawalStatus.COMPLETED,
    description:
      'Trạng thái xét duyệt: APPROVED (chấp thuận), REJECTED (từ chối hoàn tiền ví), COMPLETED (đã chuyển khoản thành công)',
  })
  @IsIn(REVIEWABLE_WITHDRAWAL_STATUSES, {
    message: 'Trạng thái xét duyệt chỉ chấp nhận APPROVED, REJECTED hoặc COMPLETED',
  })
  @IsNotEmpty()
  status: WithdrawalStatus;

  @ApiPropertyOptional({
    example: 'Thông tin số tài khoản không đúng với tên chủ tài khoản thụ hưởng',
    description: 'Lý do từ chối (bắt buộc nếu status = REJECTED)',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({
    example: 'Đã chuyển khoản qua Vietcombank mã GD: VCB12345678',
    description: 'Ghi chú của Quản trị viên',
  })
  @IsOptional()
  @IsString()
  adminNote?: string;
}
