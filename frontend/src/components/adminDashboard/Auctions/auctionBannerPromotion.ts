import i18n from '../../../i18n';
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
    return i18n.t('admin:management.publicAuctionOnly');
  if (!auction.imageUrl?.trim()) return i18n.t('admin:management.addImageFirst');
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
    throw new Error(i18n.t('admin:management.bannerListTooLarge'));
  const banner = await createBannerFromAuction(auction.id);
  return { banner, created: true };
}
