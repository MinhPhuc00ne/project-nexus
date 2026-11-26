import i18n from '../../../i18n';
import type { AdminAuctionEntity } from '@/features/auction/services/auction.service';

export function auctionEditReason(item: AdminAuctionEntity): string {
  return ['DRAFT', 'SCHEDULED'].includes(item.status)
    ? ''
    : i18n.t('admin:management.editBeforeStartOnly');
}

export function auctionDeleteReason(item: AdminAuctionEntity): string {
  if (['ACTIVE', 'EXTENDED'].includes(item.status))
    return i18n.t('admin:management.cannotDeleteLive');
  if (item.totalBidsCount > 0 || (item._count?.bids ?? 0) > 0 || (item._count?.awards ?? 0) > 0)
    return i18n.t('admin:management.cannotDeleteWithBids');
  // The delete endpoint verifies bids and awards again, including counts absent from the list response.
  return '';
}
