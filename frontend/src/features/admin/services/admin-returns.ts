import { adminRequest } from '@/features/admin/services/adminRequest';
import type {
  AdminReturnOrder,
  AdminReturnRequest,
  ReturnAction,
  ReturnStatus,
} from '@/types/admin-return.types';

interface AfterSalesPage {
  items: AdminReturnRequest[];
  total: number;
  page: number;
  limit: number;
}

export async function listAdminReturns(status: ReturnStatus | '', signal?: AbortSignal) {
  // BE currently paginates cancellations and returns together without a kind filter.
  // Read every page before filtering so cancellation rows cannot hide return requests.
  const rows: AdminReturnRequest[] = [];
  for (let page = 1; ; page += 1) {
    const result = await adminRequest<AfterSalesPage>({
      url: '/commerce/after-sales',
      method: 'GET',
      params: { page, limit: 100, ...(status ? { status } : {}) },
      signal,
    });
    rows.push(...result.items.filter((row) => row.kind === 'RETURN'));
    if (result.items.length === 0 || result.page * result.limit >= result.total) break;
  }
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}

export function getAdminReturnOrder(id: string, signal?: AbortSignal) {
  return adminRequest<AdminReturnOrder>({
    url: `/commerce/orders/${encodeURIComponent(id)}/after-sales`,
    method: 'GET',
    signal,
  });
}

export function processAdminReturn(id: string, action: ReturnAction) {
  const { type, ...data } = action;
  return adminRequest<AdminReturnRequest>({
    url: `/commerce/orders/${encodeURIComponent(id)}/returns/${type}`,
    method: 'POST',
    data,
  });
}
