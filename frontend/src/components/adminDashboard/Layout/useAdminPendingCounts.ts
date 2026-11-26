import { useQuery } from '@tanstack/react-query';
import { listAdminDisputes, listAdminReports } from '@/features/admin/services/admin';
import { adminPendingCountsKey } from '@/features/admin/services/adminPendingCounts';

export function useAdminPendingCounts(userId: string) {
  const reports = useQuery({
    queryKey: [...adminPendingCountsKey, userId, 'reports'],
    queryFn: async ({ signal }) => {
      const [pending, investigating] = await Promise.all([
        listAdminReports({ limit: 1, status: 'PENDING' }, signal),
        listAdminReports({ limit: 1, status: 'INVESTIGATING' }, signal),
      ]);
      return pending.total + investigating.total;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: 'always',
  });
  const refunds = useQuery({
    queryKey: [...adminPendingCountsKey, userId, 'refunds'],
    queryFn: async ({ signal }) => {
      const result = await listAdminDisputes({ limit: 1 }, signal);
      return result.counters.pendingReview;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: 'always',
  });
  return { reportCount: reports.data ?? 0, refundCount: refunds.data ?? 0 };
}
