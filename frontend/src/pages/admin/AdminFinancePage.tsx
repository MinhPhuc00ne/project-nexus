import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('admin');
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
          setAnalyticsError(cause instanceof Error ? cause.message : t('finance.loadAnalyticsErr'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setAnalyticsLoading(false);
      });
    return () => controller.abort();
  }, [tab, analyticsRevision, t]);

  return (
    <div className="space-y-5">
      <div role="group" aria-label={t('finance.tabsAria')} className="flex flex-wrap gap-2">
        <Button
          variant={tab === 'transactions' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'transactions'}
          onClick={() => setTab('transactions')}
        >
          {t('finance.tabs.transactions')}
        </Button>
        <Button
          variant={tab === 'withdrawals' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'withdrawals'}
          onClick={() => setTab('withdrawals')}
        >
          {t('finance.tabs.withdrawals')}
        </Button>
        <Button
          variant={tab === 'overview' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'overview'}
          onClick={() => setTab('overview')}
        >
          {t('finance.tabs.overview')}
        </Button>
        <Button
          variant={tab === 'wallet' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'wallet'}
          onClick={() => setTab('wallet')}
        >
          {t('finance.tabs.wallet')}
        </Button>
      </div>
      {tab === 'transactions' ? (
        <TransactionHistory />
      ) : tab === 'overview' ? (
        analyticsLoading && !analytics ? (
          <p role="status" className="py-12 text-center text-sm text-slate-500">
            {t('finance.loadingAnalytics')}
          </p>
        ) : analyticsError ? (
          <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
            {analyticsError}
            <div className="mt-3">
              <Button
                variant="secondary"
                onClick={() => setAnalyticsRevision((value) => value + 1)}
              >
                {t('finance.retry')}
              </Button>
            </div>
          </div>
        ) : analytics ? (
          <div className="grid items-start gap-5 xl:grid-cols-[2fr_1fr]">
            <RevenueChart analytics={analytics} />
            <RevenueComposition analytics={analytics} />
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-slate-500">{t('finance.noAnalytics')}</p>
        )
      ) : tab === 'wallet' ? (
        <AdminWallet />
      ) : (
        <WithdrawalManagement />
      )}
    </div>
  );
}
