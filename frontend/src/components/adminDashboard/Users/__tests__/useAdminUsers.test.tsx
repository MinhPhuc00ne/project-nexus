import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminRequest } from '@/features/admin/services/adminRequest';
import { useAdminUsers } from '../useAdminUsers';

vi.mock('@/features/admin/services/adminRequest', () => ({ adminRequest: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ token: 'admin-token' }) }));

const page = (current: number, total = 22, limit = 10) => ({
  items: [],
  meta: { total, page: current, limit, totalPages: Math.ceil(total / limit) },
});

describe('admin users API pagination', () => {
  beforeEach(() => vi.resetAllMocks());

  it('reads API metadata and requests the next page with the active filters', async () => {
    vi.mocked(adminRequest).mockResolvedValueOnce(page(1)).mockResolvedValueOnce(page(2));
    const { result } = renderHook(() => useAdminUsers(false));
    await waitFor(() => expect(result.current.result?.totalPages).toBe(3));
    expect(result.current.result).toEqual({ items: [], ...page(1).meta });
    act(() => result.current.setQuery({ page: 2, role: 'BUYER', status: 'ACTIVE' }));
    await waitFor(() => expect(result.current.result?.page).toBe(2));
    expect(adminRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: '/admin/users',
        params: { page: 2, role: 'BUYER', status: 'ACTIVE', limit: 10 },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('returns to page one after the last page disappears', async () => {
    vi.mocked(adminRequest)
      .mockResolvedValueOnce(page(1))
      .mockResolvedValueOnce(page(3, 2))
      .mockResolvedValueOnce(page(1, 2));
    const { result } = renderHook(() => useAdminUsers(false));
    await waitFor(() => expect(result.current.result?.total).toBe(22));
    act(() => result.current.setQuery({ page: 3 }));
    await waitFor(() => expect(result.current.result?.total).toBe(2));
    expect(result.current.query.page).toBe(1);
    expect(result.current.result?.page).toBe(1);
  });

  it('handles an empty preview page', async () => {
    vi.mocked(adminRequest).mockResolvedValue(page(1, 0, 3));
    const { result } = renderHook(() => useAdminUsers(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('');
    expect(result.current.result).toEqual({ items: [], ...page(1, 0, 3).meta });
    expect(adminRequest).toHaveBeenCalledTimes(1);
  });

  it('starts a new search on page one and keeps the role filter', async () => {
    vi.mocked(adminRequest)
      .mockResolvedValueOnce(page(1))
      .mockResolvedValueOnce(page(2))
      .mockResolvedValueOnce(page(1, 1));
    const { result } = renderHook(() => useAdminUsers(false));
    await waitFor(() => expect(result.current.result?.page).toBe(1));
    act(() => result.current.setQuery({ page: 2, role: 'BUYER' }));
    await waitFor(() => expect(result.current.result?.page).toBe(2));
    act(() => result.current.setSearch('  demo.buyer  '));
    await waitFor(() => expect(result.current.result?.total).toBe(1));
    expect(adminRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({
        params: { page: 1, role: 'BUYER', search: 'demo.buyer', limit: 10 },
      }),
    );
  });

  it('retries a failed request', async () => {
    vi.mocked(adminRequest)
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValueOnce(page(1));
    const { result } = renderHook(() => useAdminUsers(false));
    await waitFor(() => expect(result.current.error).toBe('Unavailable'));
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.result?.total).toBe(22));
    expect(result.current.error).toBe('');
  });
});
