import type { AdminAuctionEntity } from '../../../services/auction.service';

export function auctionEditReason(item: AdminAuctionEntity): string {
  return ['DRAFT', 'SCHEDULED'].includes(item.status)
    ? ''
    : 'Chỉ có thể chỉnh sửa phòng đấu giá khi chưa bắt đầu.';
}

export function auctionDeleteReason(item: AdminAuctionEntity): string {
  if (['ACTIVE', 'EXTENDED'].includes(item.status))
    return 'Không thể xóa phòng đấu giá đang diễn ra.';
  if (item.totalBidsCount > 0 || (item._count?.bids ?? 0) > 0 || (item._count?.awards ?? 0) > 0)
    return 'Không thể xóa phòng đấu giá đã có lượt đặt giá hoặc kết quả trao quyền mua.';
  // The delete endpoint verifies bids and awards again, including counts absent from the list response.
  return '';
}
