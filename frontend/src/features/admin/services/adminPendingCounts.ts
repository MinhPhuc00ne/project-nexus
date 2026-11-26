import { queryClient } from '@/lib/queryClient';

export const adminPendingCountsKey = ['admin', 'pending-counts'] as const;

export function refreshAdminPendingCounts(): void {
  void queryClient.invalidateQueries({ queryKey: adminPendingCountsKey });
}
