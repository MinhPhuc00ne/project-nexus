import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { WithdrawalStatus } from '@prisma/client';

const REVIEWABLE_WITHDRAWAL_STATUSES = [
  WithdrawalStatus.APPROVED,
  WithdrawalStatus.REJECTED,
  WithdrawalStatus.COMPLETED,
] as const;

const reviewWithdrawalFields = {
  status: z
    .enum(REVIEWABLE_WITHDRAWAL_STATUSES)
    .describe(
      'Trạng thái xét duyệt: APPROVED (chấp thuận), REJECTED (từ chối hoàn tiền ví), COMPLETED (đã chuyển khoản thành công)',
    )
    .meta({ example: WithdrawalStatus.COMPLETED }),
  rejectionReason: nullAsAbsent(
    z
      .string()
      .describe('Lý do từ chối (bắt buộc nếu status = REJECTED)')
      .meta({ example: 'Thông tin số tài khoản không đúng với tên chủ tài khoản thụ hưởng' }),
  ),
  adminNote: nullAsAbsent(
    z
      .string()
      .describe('Ghi chú của Quản trị viên')
      .meta({ example: 'Đã chuyển khoản qua Vietcombank mã GD: VCB12345678' }),
  ),
};

export const ReviewWithdrawalSchema = z.object(reviewWithdrawalFields).strict();

export type ReviewWithdrawalInput = z.infer<typeof ReviewWithdrawalSchema>;
