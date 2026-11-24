import type { StaffAfterSalesRequest, StaffAfterSalesStatus } from '../../services/staff';

export type StaffAfterSalesKindFilter = 'ALL' | 'CANCEL' | 'RETURN';

export function filterStaffAfterSalesPage(
  requests: StaffAfterSalesRequest[],
  kind: StaffAfterSalesKindFilter,
  search: string,
  locale: string,
): StaffAfterSalesRequest[] {
  const term = search.trim().toLocaleLowerCase(locale);
  return requests.filter((request) => {
    if (kind !== 'ALL' && request.kind !== kind) return false;
    if (!term) return true;
    return [request.orderId, request.returnWaybillCode ?? '', request.reason]
      .join(' ')
      .toLocaleLowerCase(locale)
      .includes(term);
  });
}

export function getAfterSalesPageCount(total: number, limit: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, limit)));
}

export function canReceiveStaffReturn(
  kind: StaffAfterSalesRequest['kind'],
  status: StaffAfterSalesStatus,
): boolean {
  return kind === 'RETURN' && (status === 'APPROVED' || status === 'RECEIVED');
}
