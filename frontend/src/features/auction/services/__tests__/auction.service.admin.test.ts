import { describe, expect, it, vi, beforeEach } from 'vitest';
import { apiRequest } from '@/services/api';
import {
  adminDeleteAuctionApi,
  adminUpdateAuctionApi,
} from '@/features/auction/services/auction.service';

vi.mock('@/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  apiRequest: vi.fn(),
}));

describe('auction.service admin management wrappers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses authenticated PATCH and DELETE endpoints and propagates server errors', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ success: true, deletedId: 'room-1' });

    const payload = {
      title: 'Updated',
      description: '',
      imageUrl: null,
      startTime: '2030-01-01T10:00:00.000Z',
      endTime: '2030-01-01T12:00:00.000Z',
      consignmentDeadline: null,
      minBuyerReputation: 100,
      minSellerReputation: 80,
    };

    await adminUpdateAuctionApi('room-1', payload);
    await adminDeleteAuctionApi('room-1');

    expect(apiRequest).toHaveBeenNthCalledWith(1, '/auctions/admin/room-1', {
      method: 'PATCH',
      body: payload,
      requireAuth: true,
    });
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/auctions/admin/room-1', {
      method: 'DELETE',
      requireAuth: true,
    });

    vi.mocked(apiRequest).mockRejectedValueOnce(new Error('Already has bids'));
    await expect(adminDeleteAuctionApi('room-1')).rejects.toThrow(/Already has bids/);
  });
});
