import {
  createBannerFromAuction,
  listBanners,
  type Banner,
} from '../../../services/banners.service';
import type { AdminAuctionEntity } from '../../../services/auction.service';

// The management endpoint returns at most 100 banners and has no pagination/filter by auction.
export const BANNER_LIST_LIMIT = 100;

export function auctionBannerReason(auction: AdminAuctionEntity): string {
  if (['DRAFT', 'CANCELLED'].includes(auction.status))
    return 'Chỉ được đưa phiên đấu giá công khai lên banner.';
  if (!auction.imageUrl?.trim()) return 'Thêm ảnh cho phiên đấu giá trước khi đưa lên banner.';
  return '';
}

export async function promoteAuctionBanner(
  auction: AdminAuctionEntity,
): Promise<{ banner: Banner; created: boolean }> {
  const reason = auctionBannerReason(auction);
  if (reason) throw new Error(reason);
  // Recheck on confirmation: creation may already have generated a banner, or another tab may have promoted it.
  const banners = await listBanners();
  const existing = banners.find((banner) => banner.auctionId === auction.id);
  if (existing) return { banner: existing, created: false };
  if (banners.length >= BANNER_LIST_LIMIT)
    throw new Error(
      'Chưa xác định được phiên đã có banner vì danh sách quá lớn. Vui lòng kiểm tra tại Quản lý banner.',
    );
  const banner = await createBannerFromAuction(auction.id);
  return { banner, created: true };
}
