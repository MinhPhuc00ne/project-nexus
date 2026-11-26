import i18n from '@/i18n';
import { listBanners, saveBanner } from '@/features/catalog/services/banners.service';
import type {
  AdminAuctionEntity,
  AuctionEntity,
} from '@/features/auction/services/auction.service';

export function startEndTimePayload(
  auction: AdminAuctionEntity,
  value: string,
  now = Date.now(),
): string {
  const end = new Date(value).getTime();
  const after = Math.max(
    now + 60_000,
    Date.parse(auction.startTime),
    auction.consignmentDeadline ? Date.parse(auction.consignmentDeadline) : 0,
  );
  if (!Number.isFinite(end) || end <= after) {
    throw new Error(i18n.t('admin:auctions.start.errEndTime'));
  }
  return new Date(end).toISOString();
}

export async function syncStartedAuctionBanners(
  auction: Pick<AuctionEntity, 'id' | 'startTime' | 'endTime'>,
): Promise<void> {
  const banners = await listBanners();
  for (const banner of banners.filter((entry) => entry.auctionId === auction.id)) {
    await saveBanner(
      {
        title: banner.title,
        imageUrl: banner.imageUrl,
        targetUrl: banner.targetUrl,
        priority: banner.priority,
        isActive: banner.isActive,
        startsAt: auction.startTime,
        endsAt: auction.endTime,
      },
      banner.id,
    );
  }
}
