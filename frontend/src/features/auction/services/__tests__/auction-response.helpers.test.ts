import { describe, expect, it } from 'vitest';
import {
  formatAuctionImage,
  normalizeAuctionListResponse,
  unwrapAuctionResponse,
} from '@/features/auction/services/auction-response.helpers';

describe('auction-response.helpers', () => {
  it('unwraps { data } envelopes and returns raw payloads unchanged', () => {
    expect(unwrapAuctionResponse({ data: { id: 'a-1' } })).toEqual({ id: 'a-1' });
    expect(unwrapAuctionResponse({ id: 'a-2' })).toEqual({ id: 'a-2' });

    const awards = [{ id: 'offer', tier: 'SECOND_CHANCE', status: 'AWAITING_ACCEPTANCE' }];
    expect(
      unwrapAuctionResponse({ statusCode: 200, data: awards } as { data: typeof awards }),
    ).toEqual(awards);
    expect(unwrapAuctionResponse(awards)).toEqual(awards);

    for (const result of [
      { status: 'AWAITING_DEPOSIT' },
      { status: 'AWAITING_CHECKOUT' },
      { status: 'DECLINED' },
      { remainingProductAmount: 70000, shippingFee: 15000 },
      { order: { id: 'order' } },
    ]) {
      expect(
        unwrapAuctionResponse({ statusCode: 200, data: result } as { data: typeof result }),
      ).toEqual(result);
    }
  });

  it('normalizes both nested-pagination and flat auction list payloads', () => {
    const nested = {
      items: [],
      pagination: { total: 5, page: 2, limit: 10, totalPages: 1 },
    };
    expect(normalizeAuctionListResponse(nested)).toBe(nested);

    const flat = {
      items: [{ id: 'lot-1' }] as never[],
      total: 1,
      page: 1,
      limit: 12,
      totalPages: 1,
    };
    expect(normalizeAuctionListResponse(flat)).toEqual({
      items: flat.items,
      pagination: { total: 1, page: 1, limit: 12, totalPages: 1 },
    });
  });

  it('formats absolute, data/blob, relative, and empty auction image URLs', () => {
    expect(formatAuctionImage(undefined)).toBe('');
    expect(formatAuctionImage('   ')).toBe('');
    expect(formatAuctionImage('https://cdn.example.com/watch.png')).toBe(
      'https://cdn.example.com/watch.png',
    );
    expect(formatAuctionImage('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA');
    expect(formatAuctionImage('blob:http://localhost/123')).toBe('blob:http://localhost/123');
    expect(formatAuctionImage('/uploads/watch.png')).toBe(
      'http://localhost:3000/uploads/watch.png',
    );
    expect(formatAuctionImage('uploads/watch.png')).toBe('http://localhost:3000/uploads/watch.png');
  });
});
