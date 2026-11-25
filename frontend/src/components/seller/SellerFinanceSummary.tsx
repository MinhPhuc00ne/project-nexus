import type { ReactElement } from 'react';
import {
  Landmark as BankOutlined,
  LineChart as LineChartOutlined,
  Lock as LockOutlined,
  WalletCards as WalletOutlined,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SellerRevenue } from '../../types/seller-finance.types';
import { EmptyState, Panel, StatCard } from './SellerUI';
import { financeMoney } from './financeFormat';

export default function SellerFinanceSummary({ data }: { data: SellerRevenue }): ReactElement {
  const { t } = useTranslation('seller');
  const { wallet, metrics } = data;
  const months = [...data.monthlyBreakdown].sort((a, b) => a.month.localeCompare(b.month));
  const maxGross = Math.max(1, ...months.map((item) => item.gross));
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('finance.summary.availableLabel')}
          value={financeMoney(wallet.availableToWithdraw)}
          detail={t('finance.summary.availableDetail')}
          icon={<WalletOutlined />}
        />
        <StatCard
          label={t('finance.summary.lockedLabel')}
          value={financeMoney(wallet.lockedBalance)}
          detail={t('finance.summary.lockedDetail')}
          icon={<LockOutlined />}
        />
        <StatCard
          label={t('finance.summary.grossLabel')}
          value={financeMoney(metrics.totalGrossRevenue)}
          detail={t('finance.summary.grossDetail', { count: metrics.totalOrders })}
          icon={<LineChartOutlined />}
        />
        <StatCard
          label={t('finance.summary.netLabel')}
          value={financeMoney(metrics.netRevenue)}
          detail={t('finance.summary.netDetail', { rate: metrics.platformFeeRatePercentage })}
          icon={<BankOutlined />}
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel
          title={t('finance.summary.monthlyTitle')}
          subtitle={t('finance.summary.monthlySubtitle')}
        >
          {months.length ? (
            <div className="space-y-5">
              {months.map((item) => (
                <div key={item.month}>
                  <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs">
                    <span className="text-slate-500">
                      {item.month} · {item.ordersCount} {t('finance.summary.ordersSuffix')}
                    </span>
                    <strong className="font-semibold text-blue-700">
                      {financeMoney(item.gross)}
                    </strong>
                  </div>
                  <div
                    className="h-3 overflow-hidden rounded-full bg-blue-50"
                    role="img"
                    aria-label={`${item.month}: ${financeMoney(item.gross)}`}
                  >
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${Math.max(0, (item.gross / maxGross) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title={t('finance.summary.emptyTitle')}
              description={t('finance.summary.emptyDesc')}
            />
          )}
        </Panel>
        <Panel
          title={t('finance.summary.reconcileTitle')}
          subtitle={t('finance.summary.reconcileSubtitle')}
        >
          <dl className="divide-y divide-slate-100 text-xs">
            {[
              [t('finance.summary.completedOrders'), String(metrics.completedOrdersCount)],
              [t('finance.summary.pendingOrders'), String(metrics.pendingOrdersCount)],
              [t('finance.summary.cancelledOrders'), String(metrics.cancelledOrdersCount)],
              [t('finance.summary.completedRevenue'), financeMoney(metrics.completedRevenue)],
              [
                t('finance.summary.pendingEscrowRevenue'),
                financeMoney(metrics.pendingEscrowRevenue),
              ],
              [t('finance.summary.estimatedFee'), financeMoney(metrics.estimatedPlatformFee)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-3">
                <dt className="text-slate-500">{label}</dt>
                <dd className="m-0 text-right font-semibold text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </>
  );
}
