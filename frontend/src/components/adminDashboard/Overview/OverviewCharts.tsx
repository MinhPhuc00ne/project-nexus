import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChartNoAxesCombined, CircleDollarSign, TrendingUp } from 'lucide-react';
import type { AdminOverviewAnalytics } from '../../../types/admin-analytics.types';
import { getIntlLocale } from '../../../i18n/config';
import { Panel } from '../shared/AdminUI';
import { formatMoney } from '../shared/adminData';

const seriesColors = ['#2563eb', '#60a5fa', '#8b5cf6', '#14b8a6', '#f59e0b', '#f43f5e'];

export default function OverviewCharts({
  data,
  loading,
}: {
  data?: AdminOverviewAnalytics;
  loading: boolean;
}) {
  const { t, i18n } = useTranslation('admin');
  const locale = getIntlLocale(i18n.language);
  const [selected, setSelected] = useState(0);
  const gradientId = useId().replace(/:/g, '');
  const periods = data?.revenuePeriods ?? [];
  const period = periods[Math.min(selected, Math.max(0, periods.length - 1))];
  const x = (i: number) => 32 + (i * 488) / Math.max(1, (period?.labels.length ?? 0) - 1);
  const y = (value: number) => 200 - (Math.min(200, Math.max(0, value)) / 200) * 172;
  const points = (values: number[]) =>
    (period?.labels ?? []).map((_, i) => `${x(i)},${y(values[i] ?? 0)}`).join(' ');
  const composition = data?.revenueComposition;
  const sources = composition?.items ?? [];
  const sourceTotal = sources.reduce((sum, item) => sum + Math.max(0, item.rawAmount), 0);
  let percentage = 0;
  const stops = sources.map((item, i) => {
    const start = percentage;
    percentage += sourceTotal > 0 ? (Math.max(0, item.rawAmount) / sourceTotal) * 100 : 0;
    return `${seriesColors[i % seriesColors.length]} ${start}% ${percentage}%`;
  });
  const bids = data?.bidFrequency;
  const maxBids = Math.max(1, ...(bids?.rawCounts ?? []));
  const emptyText = loading ? t('overview.loading') : t('overview.noData');

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[2fr_1fr]">
      <Panel
        title={t('overview.trendTitle')}
        subtitle={t('overview.trendSubtitle')}
        icon={<ChartNoAxesCombined size={19} />}
      >
        <div className="mb-5 flex flex-wrap gap-1 rounded-lg bg-slate-50 p-1">
          {periods.map((item, i) => (
            <button
              type="button"
              key={item.label}
              aria-pressed={selected === i}
              onClick={() => setSelected(i)}
              className={`rounded-md px-3 py-2 text-[11px] ${selected === i ? 'bg-white font-bold text-primary shadow-sm' : 'text-slate-500 hover:text-primary'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 rounded-xl bg-blue-50/80 p-4 sm:grid-cols-3">
          {[
            [t('overview.totalFee'), period?.total ?? 0],
            [t('overview.auction3d'), period?.auction ?? 0],
            [t('overview.normalOrders'), period?.normal ?? 0],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <p className="text-[10px] text-slate-500">{label}</p>
              <p className="mt-1 break-words text-base font-bold">{formatMoney(Number(value))}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap justify-between gap-2 text-[10px] text-slate-500">
          <span>
            <span className="mr-1 inline-block size-2 rounded-full bg-blue-600" />
            {t('overview.auction3d')}{' '}
            <span className="ml-3 mr-1 inline-block size-2 rounded-full bg-blue-400" />
            {t('overview.normalOrders')}
          </span>
          <span>{t('overview.relativeTrend')}</span>
        </div>
        {period?.labels.length ? (
          <div className="mt-3 rounded-xl bg-slate-50/80 p-2">
            <svg
              viewBox="0 0 552 236"
              className="w-full"
              role="img"
              aria-label={t('overview.trendAria', { label: period.label })}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity=".2" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 50, 100, 150, 200].map((value) => (
                <line
                  key={value}
                  x1="32"
                  x2="520"
                  y1={y(value)}
                  y2={y(value)}
                  stroke="#e2e8f0"
                  strokeDasharray="3 4"
                />
              ))}
              <polygon
                points={`32,200 ${points(period.auctionValues)} 520,200`}
                fill={`url(#${gradientId})`}
              />
              <polyline
                points={points(period.auctionValues)}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
              />
              <polyline
                points={points(period.normalValues)}
                fill="none"
                stroke="#60a5fa"
                strokeWidth="2.5"
              />
              {period.labels.map((label, i) => (
                <g key={`${i}-${label}`}>
                  <circle
                    cx={x(i)}
                    cy={y(period.auctionValues[i] ?? 0)}
                    r="3"
                    fill="white"
                    stroke="#2563eb"
                  />
                  <circle
                    cx={x(i)}
                    cy={y(period.normalValues[i] ?? 0)}
                    r="3"
                    fill="white"
                    stroke="#60a5fa"
                  />
                  <text x={x(i)} y="224" textAnchor="middle" fill="#64748b" fontSize="9">
                    {label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        ) : (
          <p className="py-16 text-center text-xs text-slate-400">{emptyText}</p>
        )}
      </Panel>
      <div className="space-y-5">
        <Panel title={t('overview.compositionTitle')} icon={<CircleDollarSign size={19} />}>
          <div
            className="relative mx-auto my-5 flex size-36 items-center justify-center rounded-full"
            style={{
              background: sourceTotal > 0 ? `conic-gradient(${stops.join(',')})` : '#e2e8f0',
            }}
          >
            <div className="flex size-27 flex-col items-center justify-center rounded-full bg-white px-2 text-center">
              <span className="text-[9px] text-slate-500">{t('overview.totalFeeUpper')}</span>
              <strong className="mt-1 break-words text-sm">
                {formatMoney(composition?.totalAmount ?? 0)}
              </strong>
            </div>
          </div>
          <div className="space-y-2">
            {sources.map((item, i) => (
              <div
                key={`${i}-${item.name}`}
                className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-[11px]"
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: seriesColors[i % seriesColors.length] }}
                />
                <span className="min-w-0 flex-1">{item.name}</span>
                <div className="text-right">
                  <b>{formatMoney(item.rawAmount)}</b>
                  <p className="mt-1 text-primary">{item.percentage}</p>
                </div>
              </div>
            ))}
          </div>
          {!sources.length && <p className="text-center text-xs text-slate-400">{emptyText}</p>}
        </Panel>
        <Panel title={t('overview.bidFreqTitle')} icon={<TrendingUp size={19} />}>
          <p className="text-2xl font-bold">
            {(bids?.totalBids ?? 0).toLocaleString(locale)}{' '}
            <span className="text-base font-medium">{t('overview.turnsUnit')}</span>
          </p>
          {bids?.labels.length ? (
            <div className="mt-4 flex h-32 items-end gap-1 rounded-xl bg-blue-50/70 px-2 pt-3">
              {bids.labels.map((label, i) => (
                <div
                  key={`${i}-${label}`}
                  className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2"
                >
                  <div
                    className="rounded-t bg-blue-400 hover:bg-blue-600"
                    style={{ height: `${((bids.rawCounts[i] ?? 0) / maxBids) * 85}%` }}
                    title={t('overview.bidFreqTooltip', {
                      label,
                      count: bids.rawCounts[i] ?? 0,
                    })}
                  />
                  <span className="pb-2 text-center text-[8px] text-slate-500">{label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-400">{emptyText}</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
