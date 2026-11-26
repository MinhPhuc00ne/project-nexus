import type { AdminAuctionEntity } from '@/features/auction/services/auction.service';

export type ConsignmentLockReasonKey =
  'alreadyLocked' | 'endedOrClosed' | 'pastEndTime' | 'alreadyStarted' | 'deadlinePassed';

export function consignmentLockReason(
  item: AdminAuctionEntity,
  now: number,
): ConsignmentLockReasonKey | '' {
  if (item.isConsignmentLocked) return 'alreadyLocked';
  if (['ENDED', 'SETTLED', 'CANCELLED', 'FAILED'].includes(item.status)) return 'endedOrClosed';
  if (new Date(item.endTime).getTime() <= now) return 'pastEndTime';
  if (!['DRAFT', 'SCHEDULED'].includes(item.status)) return 'alreadyStarted';
  if (item.consignmentDeadline && new Date(item.consignmentDeadline).getTime() <= now)
    return 'deadlinePassed';
  return '';
}
