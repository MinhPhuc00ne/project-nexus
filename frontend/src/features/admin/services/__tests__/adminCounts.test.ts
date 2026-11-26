import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSellerRequests, listAdminDisputes, listAdminReports } from '../admin';
import { adminRequest } from '../adminRequest';

vi.mock('../adminRequest', () => ({ adminRequest: vi.fn() }));

describe('admin navigation counts', () => {
  beforeEach(() => vi.resetAllMocks());

  it.each([
    [3, 5],
    [0, 0],
  ])('sums report totals from API metadata (%i + %i)', async (pending, investigating) => {
    const signal = new AbortController().signal;
    vi.mocked(adminRequest).mockImplementation(async (config) => ({
      items: [],
      meta: {
        total: config.params.status === 'PENDING' ? pending : investigating,
        page: 1,
        limit: 1,
        totalPages: config.params.status === 'PENDING' ? pending : investigating,
      },
    }));
    const [first, second] = await Promise.all([
      listAdminReports({ limit: 1, status: 'PENDING' }, signal),
      listAdminReports({ limit: 1, status: 'INVESTIGATING' }, signal),
    ]);
    expect(first.total + second.total).toBe(pending + investigating);
    expect(Number.isFinite(first.total + second.total)).toBe(true);
    expect(adminRequest).toHaveBeenCalledWith(expect.objectContaining({ signal }));
  });

  it('reads seller request totals used in the header pending count', async () => {
    vi.mocked(adminRequest).mockResolvedValue({
      items: [],
      meta: { total: 4, page: 1, limit: 10, totalPages: 1 },
    });
    const result = await getSellerRequests({ status: 'PENDING' });
    expect(result.total).toBe(4);
    expect(result.totalPages).toBe(1);
  });

  it('preserves dispute counters while reading pagination metadata', async () => {
    const counters = { pendingReview: 2, all: 6 };
    vi.mocked(adminRequest).mockResolvedValue({
      items: [],
      counters,
      meta: { total: 6, page: 1, limit: 1, totalPages: 6 },
    });
    const result = await listAdminDisputes({ limit: 1 });
    expect(result.counters).toEqual(counters);
    expect(result.total).toBe(6);
    expect(result.totalPages).toBe(6);
  });
});
