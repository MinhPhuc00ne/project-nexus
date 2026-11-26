import { act, renderHook, waitFor } from '@testing-library/react';
import { AuctionStatus } from '@nexus/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { useAdminAuctions } from '../useAdminAuctions';
import { startEndTimePayload } from '../auctionStartSchedule';
import {
  adminStartAuctionApi,
  adminUpdateAuctionApi,
  getAdminAuctionItemsApi,
  getAdminAuctionsApi,
  type AdminAuctionEntity,
} from '@/features/auction/services/auction.service';
import { listBanners, saveBanner, type Banner } from '@/features/catalog/services/banners.service';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ token: 'admin-session' }) }));
vi.mock('@/components/ToastNotification', () => ({ useToast: () => toast }));
vi.mock('@/features/auction/services/auction.service', () => ({
  adminStartAuctionApi: vi.fn(),
  adminUpdateAuctionApi: vi.fn(),
  getAdminAuctionItemsApi: vi.fn(),
  getAdminAuctionsApi: vi.fn(),
  adminLockConsignmentApi: vi.fn(),
}));
vi.mock('@/features/catalog/services/banners.service', () => ({
  listBanners: vi.fn(),
  saveBanner: vi.fn(),
}));

const now = Date.parse('2030-06-01T12:00:00Z');
const chosenEnd = '2030-06-01T14:00:00Z';
const auction: AdminAuctionEntity = {
  id: 'room-1',
  title: 'Watch Room',
  status: AuctionStatus.SCHEDULED,
  startTime: '2030-06-01T09:00:00Z',
  endTime: '2030-06-01T11:00:00Z',
  consignmentDeadline: '2030-06-01T10:00:00Z',
  minBuyerReputation: 100,
  minSellerReputation: 80,
  isConsignmentLocked: true,
  totalBidsCount: 0,
  startingPrice: 0,
};
const started = {
  ...auction,
  status: AuctionStatus.ACTIVE,
  startTime: new Date(now).toISOString(),
  endTime: new Date(chosenEnd).toISOString(),
  originalEndTime: chosenEnd,
  currentHighestBid: 0,
  bidIncrement: 1000,
  isExtended: false,
  startingPrice: 0,
  product: undefined,
  seller: undefined,
};
const banner: Banner = {
  id: 'banner-1',
  auctionId: auction.id,
  title: 'Custom banner title',
  imageUrl: 'https://example.com/banner.jpg',
  targetUrl: '/auction/room-1',
  isActive: false,
  priority: 2,
  startsAt: auction.startTime,
  endsAt: auction.endTime,
  createdAt: '',
  updatedAt: '',
};

describe('start auction with a new closing time', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
    await i18n.changeLanguage('en');
    vi.mocked(getAdminAuctionsApi).mockResolvedValue({
      items: [auction],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });
    vi.mocked(getAdminAuctionItemsApi).mockResolvedValue({
      items: [],
      auctionId: auction.id,
      auctionTitle: auction.title,
      auctionStatus: AuctionStatus.ACTIVE,
      totalCount: 0,
    });
    vi.mocked(adminUpdateAuctionApi).mockResolvedValue({ ...auction, endTime: chosenEnd });
    vi.mocked(adminStartAuctionApi).mockResolvedValue(started);
    vi.mocked(listBanners).mockResolvedValue([
      banner,
      { ...banner, id: 'other', auctionId: 'other-room' },
    ]);
    vi.mocked(saveBanner).mockResolvedValue(banner);
  });
  afterEach(() => vi.useRealTimers());

  it('waits for confirmation, saves the new time before Start and syncs only linked banners', async () => {
    const { result } = renderHook(() => useAdminAuctions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.handleStartAuction(auction));
    expect(adminStartAuctionApi).not.toHaveBeenCalled();
    expect(result.current.startingAuction).toEqual(auction);
    await act(() => result.current.confirmStartAuction(chosenEnd));
    expect(adminUpdateAuctionApi).toHaveBeenCalledWith(auction.id, { endTime: started.endTime });
    expect(vi.mocked(adminUpdateAuctionApi).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(adminStartAuctionApi).mock.invocationCallOrder[0],
    );
    expect(saveBanner).toHaveBeenCalledTimes(1);
    expect(saveBanner).toHaveBeenCalledWith(
      {
        title: banner.title,
        imageUrl: banner.imageUrl,
        targetUrl: banner.targetUrl,
        priority: 2,
        isActive: false,
        startsAt: started.startTime,
        endsAt: started.endTime,
      },
      banner.id,
    );
    expect(result.current.startingAuction).toBeNull();
    expect(result.current.showcaseState?.playbackMode).toBe('live');
  });

  it.each(['', 'invalid', '2030-06-01T11:59:00Z', '2030-06-01T12:01:00Z'])(
    'rejects invalid or too close end time: %s',
    (value) => {
      expect(() => startEndTimePayload(auction, value, now)).toThrow();
    },
  );

  it('respects the existing start time and consignment deadline required by the update API', () => {
    expect(() =>
      startEndTimePayload({ ...auction, consignmentDeadline: chosenEnd }, chosenEnd, now),
    ).toThrow();
    expect(() =>
      startEndTimePayload({ ...auction, startTime: chosenEnd }, chosenEnd, now),
    ).toThrow();
  });

  it('does not start when updating the schedule fails', async () => {
    vi.mocked(adminUpdateAuctionApi).mockRejectedValue(new Error('Schedule rejected'));
    const { result } = renderHook(() => useAdminAuctions());
    act(() => result.current.handleStartAuction(auction));
    await act(() => result.current.confirmStartAuction(chosenEnd));
    expect(adminStartAuctionApi).not.toHaveBeenCalled();
    expect(saveBanner).not.toHaveBeenCalled();
    expect(result.current.startError).toBe('Schedule rejected');
  });

  it('reports a saved schedule separately when Start fails', async () => {
    vi.mocked(adminStartAuctionApi).mockRejectedValue(new Error('No approved lots'));
    const { result } = renderHook(() => useAdminAuctions());
    act(() => result.current.handleStartAuction(auction));
    await act(() => result.current.confirmStartAuction(chosenEnd));
    expect(result.current.startError).toContain('closing time was saved');
    expect(result.current.startError).toContain('No approved lots');
    expect(saveBanner).not.toHaveBeenCalled();
  });

  it('keeps the started session live and reports banner sync failures', async () => {
    vi.mocked(saveBanner).mockRejectedValue(new Error('Banner unavailable'));
    const { result } = renderHook(() => useAdminAuctions());
    act(() => result.current.handleStartAuction(auction));
    await act(() => result.current.confirmStartAuction(chosenEnd));
    expect(result.current.startingAuction).toBeNull();
    expect(result.current.showcaseState?.playbackMode).toBe('live');
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('session is live'));
  });

  it('prevents duplicate Start requests', async () => {
    const { result } = renderHook(() => useAdminAuctions());
    act(() => result.current.handleStartAuction(auction));
    await act(() =>
      Promise.all([
        result.current.confirmStartAuction(chosenEnd),
        result.current.confirmStartAuction(chosenEnd),
      ]).then(() => undefined),
    );
    expect(adminUpdateAuctionApi).toHaveBeenCalledTimes(1);
    expect(adminStartAuctionApi).toHaveBeenCalledTimes(1);
  });
});
