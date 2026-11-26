import { describe, expect, it, vi } from 'vitest';
import api from '@/services/api';
import { createBannerFromAuction } from '@/features/catalog/services/banners.service';

vi.mock('@/services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('banners.service', () => {
  it('calls the backend endpoint without a request body when promoting an auction banner', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { data: { id: 'banner-1' } } } as never);

    const result = await createBannerFromAuction('room/1');
    expect(api.post).toHaveBeenCalledWith('/staff/banners/from-auction/room%2F1');
    expect(vi.mocked(api.post).mock.calls[0]).toHaveLength(1);
    expect(result.id).toBe('banner-1');
  });
});
