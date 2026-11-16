import { useEffect, useState } from 'react';
import { Button } from '../../components/adminDashboard/shared/AdminUI';
import {
  RevenueChart,
  RevenueComposition,
} from '../../components/adminDashboard/Finance/RevenueChart';
import TransactionHistory from '../../components/adminDashboard/Finance/TransactionHistory';
import AdminWallet from '../../components/adminDashboard/Finance/AdminWallet';
import WithdrawalManagement from '../../components/adminDashboard/Finance/WithdrawalManagement';
import { getAdminFinanceAnalytics } from '../../services/admin';
import type { AdminOverviewAnalytics } from '../../types/admin-analytics.types';

export default function AdminFinancePage() {
  const [tab, setTab] = useState<'transactions' | 'overview' | 'wallet' | 'withdrawals'>(
    'transactions',
  );
  const [analytics, setAnalytics] = useState<AdminOverviewAnalytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState('');
  const [analyticsRevision, setAnalyticsRevision] = useState(0);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    if (tab !== 'overview') return;
    const controller = new AbortController();
    setAnalyticsLoading(true);
    setAnalyticsError('');
    void getAdminFinanceAnalytics(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setAnalytics(data);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setAnalyticsError(
            cause instanceof Error ? cause.message : 'Không tải được thống kê tài chính.',
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setAnalyticsLoading(false);
      });
    return () => controller.abort();
  }, [tab, analyticsRevision]);

  return (
    <div className="space-y-5">
      <div role="group" aria-label="Nội dung tài chính" className="flex flex-wrap gap-2">
        <Button
          variant={tab === 'transactions' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'transactions'}
          onClick={() => setTab('transactions')}
        >
          Giao dịch & đối soát
        </Button>
        <Button
          variant={tab === 'withdrawals' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'withdrawals'}
          onClick={() => setTab('withdrawals')}
        >
          Yêu cầu rút tiền
        </Button>
        <Button
          variant={tab === 'overview' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'overview'}
          onClick={() => setTab('overview')}
        >
          Tổng quan doanh thu
        </Button>
        <Button
          variant={tab === 'wallet' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'wallet'}
          onClick={() => setTab('wallet')}
        >
          Ví nền tảng
        </Button>
      </div>
      {tab === 'transactions' ? (
        <TransactionHistory />
      ) : tab === 'overview' ? (
        analyticsLoading && !analytics ? (
          <p role="status" className="py-12 text-center text-sm text-slate-500">
            Đang tải thống kê tài chính…
          </p>
        ) : analyticsError ? (
          <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
            {analyticsError}
            <div className="mt-3">
              <Button
                variant="secondary"
                onClick={() => setAnalyticsRevision((value) => value + 1)}
              >
                Thử lại
              </Button>
            </div>
          </div>
        ) : analytics ? (
          <div className="grid items-start gap-5 xl:grid-cols-[2fr_1fr]">
            <RevenueChart analytics={analytics} />
            <RevenueComposition analytics={analytics} />
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-slate-500">Chưa có dữ liệu tài chính.</p>
        )
      ) : tab === 'wallet' ? (
        <AdminWallet />
      ) : (
        <WithdrawalManagement />
      )}
    </div>
  );
}
