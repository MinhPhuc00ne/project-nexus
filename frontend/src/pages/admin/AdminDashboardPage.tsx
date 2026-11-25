import { useTranslation } from 'react-i18next';
import { getIntlLocale } from '../../i18n/config';
import { BadgeDollarSign, Gavel, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { Badge, Button, Panel } from '../../components/adminDashboard/shared/AdminUI';
import { formatMoney } from '../../components/adminDashboard/shared/adminData';
import { useAdminContext } from '../../components/adminDashboard/shared/useAdminContext';
import useOverviewData from '../../components/adminDashboard/Overview/useOverviewData';
import OverviewCharts from '../../components/adminDashboard/Overview/OverviewCharts';

const roleLabels = {
  BUYER: 'Buyer',
  SELLER: 'Seller',
  SUPPORT_STAFF: 'Staff',
  ADMIN: 'Admin',
} as const;

export default function AdminDashboardPage() {
  const { t, i18n } = useTranslation('admin');
  const locale = getIntlLocale(i18n.language);
  const { actions } = useAdminContext();
  const { data, loading, errors, refresh } = useOverviewData();
  const monthlyRevenue = data.analytics?.revenuePeriods.find(
    (period) => period.unit === 'tháng này',
  );
  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:flex-row xl:items-center">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Badge>{t('overview.badge')}</Badge>
            {data.ghn && (
              <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span
                  className={`size-1.5 rounded-full ${data.ghn.ping.status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                />
                {data.ghn.ping.status === 'CONNECTED'
                  ? t('overview.ghnConnected')
                  : t('overview.ghnDisconnected')}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('overview.title')}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={loading} onClick={refresh}>
            <RefreshCw size={14} />
            {loading ? t('overview.loading') : t('overview.refresh')}
          </Button>
        </div>
      </section>
      {!!errors.length && (
        <p role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {t('overview.partialLoadError')}
        </p>
      )}
      <section
        aria-label={t('overview.metricsAria')}
        aria-busy={loading}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 [&>section]:p-4 [&>section_h2]:text-sm"
      >
        <Panel
          title={t('overview.revenueTitle')}
          subtitle={t('overview.revenueSubtitle')}
          icon={<BadgeDollarSign size={19} />}
        >
          <p className="break-words text-2xl font-bold tracking-tight">
            {formatMoney(monthlyRevenue?.total ?? 0)}
          </p>
          <p className="mt-2 text-[10px] text-slate-500">{t('overview.revenueDesc')}</p>
          <div className="mt-5 flex justify-between gap-2 rounded-lg bg-blue-50/80 p-3 text-[11px]">
            <span className="text-slate-500">{t('overview.feeRateLabel')}</span>
            <b className="text-primary">
              {data.settings ? `${data.settings.platformFeePercentage}%` : '—'}
            </b>
          </div>
        </Panel>
        <Panel
          title={t('overview.auctionsTitle')}
          subtitle={t('overview.auctionsSubtitle')}
          icon={<Gavel size={19} />}
        >
          <p className="text-2xl font-bold">{t('overview.liveCount', { count: data.live ?? 0 })}</p>
          <p className="mt-2 text-[10px] text-slate-500">{t('overview.auctionsDesc')}</p>
          <div className="mt-5 flex justify-between gap-2 rounded-lg bg-blue-50/80 p-3 text-[11px]">
            <span className="text-slate-500">{t('overview.antiSnipingLabel')}</span>
            <b className="text-primary">
              {data.settings
                ? t('overview.minutesUnit', { count: data.settings.antiSnipingExtendMinutes })
                : '—'}
            </b>
          </div>
        </Panel>
        <Panel
          title={t('overview.queuesTitle')}
          subtitle={t('overview.queuesSubtitle')}
          icon={<ShieldCheck size={19} />}
        >
          <p className="text-2xl font-bold text-primary">
            {t('overview.requestsCount', { count: data.queues?.totalPendingActions ?? 0 })}
          </p>
          <p className="mt-2 text-[10px] text-slate-500">{t('overview.queuesDesc')}</p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              {
                label: t('overview.queueSeller'),
                count: data.queues?.pendingQueues.sellerUpgradeRequests ?? 0,
                tab: 'sellers' as const,
              },
              {
                label: t('overview.queueDispute'),
                count: data.queues?.pendingQueues.openDisputes ?? 0,
                tab: 'refunds' as const,
              },
              {
                label: t('overview.queue3d'),
                count: data.queues?.pendingQueues.auctionConsignments ?? 0,
                tab: 'auctions' as const,
              },
            ].map((item) => (
              <button
                key={item.tab}
                onClick={() => actions.navigate(item.tab)}
                className="rounded-lg bg-blue-50 p-3 text-center hover:bg-blue-100"
              >
                <b className="text-sm text-primary">{item.count}</b>
                <p className="mt-1 text-[10px] text-slate-500">{item.label}</p>
              </button>
            ))}
          </div>
        </Panel>
        <Panel
          title={t('overview.usersTitle')}
          subtitle={t('overview.usersSubtitle')}
          icon={<Users size={19} />}
        >
          <p className="text-2xl font-bold">
            {(data.users?.total ?? 0).toLocaleString(locale)}{' '}
            <span className="text-base font-medium">{t('overview.usersUnit')}</span>
          </p>
          <p className="mt-2 text-[10px] text-slate-500">{t('overview.usersDesc')}</p>
          <div className="mt-5 grid grid-cols-4 gap-1 rounded-lg bg-blue-50/80 p-3 text-center text-[10px]">
            {Object.entries(roleLabels).map(([role, label]) => (
              <div key={role}>
                <b className="text-primary">
                  {data.users?.roles[role as keyof typeof roleLabels] ?? 0}
                </b>
                <p className="mt-1 text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
      <OverviewCharts data={data.analytics} loading={loading} />
    </div>
  );
}
