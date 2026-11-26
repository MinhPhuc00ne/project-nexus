import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '@/lib/queryClient';
import { adminRequest } from '@/features/admin/services/adminRequest';
import { resolveAdminDispute, reviewAdminReport } from '@/features/admin/services/admin';
import { useAdminPendingCounts } from '../useAdminPendingCounts';

vi.mock('@/features/admin/services/adminRequest', () => ({ adminRequest: vi.fn() }));

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('live admin pending badges', () => {
  let pending: number;
  let investigating: number;
  let refunds: number;

  beforeEach(() => {
    queryClient.clear();
    vi.resetAllMocks();
    pending = 3;
    investigating = 5;
    refunds = 2;
    vi.mocked(adminRequest).mockImplementation(async (config) => {
      if (config.method === 'PATCH') {
        pending -= 1;
        return { id: 'report-1' };
      }
      if (config.method === 'POST') {
        refunds -= 1;
        return { success: true };
      }
      if (config.url === '/admin/disputes') {
        return {
          items: [],
          counters: { pendingReview: refunds },
          meta: { total: refunds, page: 1, limit: 1, totalPages: refunds },
        };
      }
      const total = config.params.status === 'PENDING' ? pending : investigating;
      return { items: [], meta: { total, page: 1, limit: 1, totalPages: total } };
    });
  });

  afterEach(() => queryClient.clear());

  it('updates the report badge after a successful review without remounting', async () => {
    const { result } = renderHook(() => useAdminPendingCounts('admin-1'), { wrapper });
    await waitFor(() => expect(result.current.reportCount).toBe(8));
    await act(() =>
      reviewAdminReport('report-1', { status: 'CONFIRMED', reason: 'Reviewed evidence' }),
    );
    await waitFor(() => expect(result.current.reportCount).toBe(7));
    expect(result.current.refundCount).toBe(2);
  });

  it('updates the refund badge after resolving a dispute without remounting', async () => {
    const { result } = renderHook(() => useAdminPendingCounts('admin-1'), { wrapper });
    await waitFor(() => expect(result.current.refundCount).toBe(2));
    await act(() => resolveAdminDispute('order-1', 'BUYER', 'Verified refund'));
    await waitFor(() => expect(result.current.refundCount).toBe(1));
    expect(result.current.reportCount).toBe(8);
  });

  it('keeps the existing count when a review fails', async () => {
    const { result } = renderHook(() => useAdminPendingCounts('admin-1'), { wrapper });
    await waitFor(() => expect(result.current.reportCount).toBe(8));
    const calls = vi.mocked(adminRequest).mock.calls.length;
    vi.mocked(adminRequest).mockRejectedValueOnce(new Error('Review failed'));
    await act(async () => {
      await expect(
        reviewAdminReport('report-1', { status: 'DISMISSED', reason: 'Checked evidence' }),
      ).rejects.toThrow('Review failed');
    });
    expect(result.current.reportCount).toBe(8);
    expect(adminRequest).toHaveBeenCalledTimes(calls + 1);
  });
});
