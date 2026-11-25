import { AuctionStatus } from '@nexus/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../../i18n';
import type { AdminAuctionEntity } from '../../../../services/auction.service';
import {
  createBannerFromAuction,
  listBanners,
  type Banner,
} from '../../../../services/banners.service';
import {
  auctionBannerReason,
  BANNER_LIST_LIMIT,
  promoteAuctionBanner,
} from '../auctionBannerPromotion';

vi.mock('../../../../services/banners.service', () => ({
  listBanners: vi.fn(),
  createBannerFromAuction: vi.fn(),
}));

const baseAuction: AdminAuctionEntity = {
  id: 'room-1',
  title: 'Watch Room',
  status: AuctionStatus.SCHEDULED,
  imageUrl: 'https://example.com/auction.png',
  startTime: '2030-06-01T00:00:00Z',
  endTime: '2030-06-02T00:00:00Z',
  minBuyerReputation: 100,
  minSellerReputation: 80,
  isConsignmentLocked: false,
  totalBidsCount: 0,
  startingPrice: 0,
};

const makeBanner = (overrides: Partial<Banner>): Banner => ({
  id: 'banner-1',
  title: 'Banner',
  imageUrl: 'https://example.com/auction.png',
  targetUrl: '/auction/room-1',
  startsAt: null,
  endsAt: null,
  isActive: true,
  priority: 1,
  auctionId: 'room-1',
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

describe('auctionBannerPromotion', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await i18n.changeLanguage('vi');
  });

  it('promotes an eligible room using its backend identifier', async () => {
    vi.mocked(listBanners).mockResolvedValue([]);
    vi.mocked(createBannerFromAuction).mockImplementation(async (id) =>
      makeBanner({ auctionId: id }),
    );

    const result = await promoteAuctionBanner(baseAuction);
    expect(createBannerFromAuction).toHaveBeenCalledWith('room-1');
    expect(result.created).toBe(true);
    expect(result.banner.auctionId).toBe('room-1');
  });

  it('does not recreate existing banners including inactive ones', async () => {
    for (const isActive of [true, false]) {
      const existing = makeBanner({ id: 'existing', isActive });
      vi.mocked(listBanners).mockResolvedValue([existing]);

      const result = await promoteAuctionBanner(baseAuction);
      expect(result.created).toBe(false);
      expect(result.banner).toEqual(existing);
      expect(createBannerFromAuction).not.toHaveBeenCalled();
    }
  });

  it('rejects draft, cancelled, and missing-image rooms without calling API', async () => {
    for (const room of [
      { ...baseAuction, status: AuctionStatus.DRAFT },
      { ...baseAuction, status: AuctionStatus.CANCELLED },
      { ...baseAuction, imageUrl: '  ' },
    ]) {
      const reason = auctionBannerReason(room);
      expect(reason).toBeTruthy();
      await expect(promoteAuctionBanner(room)).rejects.toThrow(reason);
      expect(listBanners).not.toHaveBeenCalled();
    }
  });

  it('prevents duplicate creation when banner list is truncated or fails to load', async () => {
    vi.mocked(listBanners).mockResolvedValue(
      Array.from({ length: BANNER_LIST_LIMIT }, (_, idx) =>
        makeBanner({ id: String(idx), auctionId: `other-${idx}` }),
      ),
    );
    await expect(promoteAuctionBanner(baseAuction)).rejects.toThrow(/Quản lý banner/);
    expect(createBannerFromAuction).not.toHaveBeenCalled();

    vi.mocked(listBanners).mockRejectedValue(new Error('Cannot load banners'));
    await expect(promoteAuctionBanner(baseAuction)).rejects.toThrow(/Cannot load banners/);
    expect(createBannerFromAuction).not.toHaveBeenCalled();
  });

  it('discovers a previously created banner on retry after a lost response', async () => {
    const banners: Banner[] = [];
    vi.mocked(listBanners).mockImplementation(async () => banners);
    vi.mocked(createBannerFromAuction).mockImplementation(async (id) => {
      banners.push(makeBanner({ auctionId: id }));
      throw new Error('Response lost');
    });

    await expect(promoteAuctionBanner(baseAuction)).rejects.toThrow(/Response lost/);
    const retried = await promoteAuctionBanner(baseAuction);
    expect(createBannerFromAuction).toHaveBeenCalledTimes(1);
    expect(retried.created).toBe(false);
  });
});
