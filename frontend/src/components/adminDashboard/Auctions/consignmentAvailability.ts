import type { AdminAuctionEntity } from '../../../services/auction.service';

export function consignmentLockReason(item: AdminAuctionEntity, now: number): string {
  if (item.isConsignmentLocked) return 'Phiên đã chốt ký gửi.';
  if (['ENDED', 'SETTLED', 'CANCELLED', 'FAILED'].includes(item.status))
    return 'Phiên đã kết thúc hoặc đã đóng.';
  if (new Date(item.endTime).getTime() <= now) return 'Đã quá thời gian kết thúc phiên.';
  if (!['DRAFT', 'SCHEDULED'].includes(item.status))
    return 'Phiên đã bắt đầu, không còn nhận ký gửi.';
  if (item.consignmentDeadline && new Date(item.consignmentDeadline).getTime() <= now)
    return 'Đã hết hạn ký gửi.';
  return '';
}
