import { ChartNoAxesCombined, CircleDollarSign } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminOverviewAnalytics, RevenuePeriod } from '../../../types/admin-analytics.types';
import { Badge, Panel } from '../shared/AdminUI';
import { formatMoney } from '../shared/adminData';

export function RevenueChart({ analytics }: { analytics: AdminOverviewAnalytics }) {
  const { t } = useTranslation('admin');
  const [periodIndex, setPeriodIndex] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const periods = analytics.revenuePeriods;
  const current: RevenuePeriod | undefined = periods[periodIndex];
  if (!current)
    return (
      <Panel title={t('finance.chart.emptyTitle')}>
        <p className="text-sm text-slate-500">{t('finance.chart.emptyText')}</p>
      </Panel>
    );
  const xAt = (index: number) =>
    current.labels.length <= 1 ? 276 : 48 + (index * 456) / (current.labels.length - 1);
  const coords = (values: number[]) =>
    values.map((value, index) => `${xAt(index)},${236 - value}`).join(' ');
  const auctionPoints = current.auctionValues.length
    ? current.auctionValues
    : current.labels.map(() => 0);
  const normalPoints = current.normalValues.length
    ? current.normalValues
    : current.labels.map(() => 0);

  return (
    <Panel
      title={t('finance.chart.title')}
      subtitle={t('finance.chart.subtitle')}
      icon={<ChartNoAxesCombined size={19} />}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-50 p-1">
          {periods.map((item, index) => (
            <button
              type="button"
              key={item.label}
              onClick={() => {
                setPeriodIndex(index);
                setHovered(null);
              }}
              className={`rounded-md px-3 py-2 text-[11px] ${periodIndex === index ? 'bg-white font-bold text-primary shadow-sm' : 'text-slate-500 hover:text-primary'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Badge>VND</Badge>
      </div>
      <div className="mb-7 grid gap-4 rounded-xl bg-blue-50/70 p-4 sm:grid-cols-3">
        <div>
          <p className="text-[9px] uppercase text-slate-500">
            {t('finance.chart.totalUnit', { unit: current.unit })}
          </p>
          <p className="mt-1 text-base font-bold tracking-tight">{formatMoney(current.total)}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase text-slate-500">{t('finance.chart.auctionFee')}</p>
          <p className="mt-1 text-base font-bold text-primary">{formatMoney(current.auction)}</p>
          <p className="mt-1 text-[10px] text-slate-500">
            {t('finance.chart.share', {
              percent: current.total ? ((current.auction / current.total) * 100).toFixed(1) : '0.0',
            })}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase text-slate-500">{t('finance.chart.normalFee')}</p>
          <p className="mt-1 text-base font-bold text-blue-500">{formatMoney(current.normal)}</p>
          <p className="mt-1 text-[10px] text-slate-500">
            {t('finance.chart.share', {
              percent: current.total ? ((current.normal / current.total) * 100).toFixed(1) : '0.0',
            })}
          </p>
        </div>
      </div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-primary" />
            {t('finance.chart.auctionFee')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-blue-400" />
            {t('finance.chart.normalFee')}
          </span>
        </div>
        <span>{t('finance.chart.relativeChart')}</span>
      </div>
      <div className="relative overflow-hidden rounded-xl bg-slate-50/80 p-2">
        <svg
          viewBox="0 0 550 275"
          role="img"
          aria-label={t('finance.chart.ariaLabel', { label: current.label })}
          className="w-full"
          onMouseLeave={() => setHovered(null)}
        >
          <defs>
            <linearGradient id="admin-chart-auction" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity=".2" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity=".01" />
            </linearGradient>
            <linearGradient id="admin-chart-normal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity=".2" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity=".01" />
            </linearGradient>
          </defs>
          {[0, 50, 100, 150, 200].map((value) => (
            <g key={value}>
              <line
                x1="48"
                x2="504"
                y1={236 - value}
                y2={236 - value}
                stroke="#e2e8f0"
                strokeDasharray="3 4"
              />
              <text x="37" y={240 - value} textAnchor="end" fill="#94a3b8" fontSize="10">
                {value === 0 ? '0' : `${value}`}
              </text>
            </g>
          ))}
          {current.labels.length > 1 && (
            <>
              <polygon
                points={`48,236 ${coords(normalPoints)} 504,236`}
                fill="url(#admin-chart-normal)"
              />
              <polygon
                points={`48,236 ${coords(auctionPoints)} 504,236`}
                fill="url(#admin-chart-auction)"
              />
            </>
          )}
          <polyline
            points={coords(auctionPoints)}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2.5"
          />
          <polyline points={coords(normalPoints)} fill="none" stroke="#60a5fa" strokeWidth="2.5" />
          {current.labels.map((label, index) => (
            <g key={`${label}-${index}`} onMouseEnter={() => setHovered(index)}>
              <circle
                cx={xAt(index)}
                cy={236 - (auctionPoints[index] ?? 0)}
                r="3.5"
                fill="white"
                stroke="var(--color-primary)"
                strokeWidth="2"
              />
              <circle
                cx={xAt(index)}
                cy={236 - (normalPoints[index] ?? 0)}
                r="3.5"
                fill="white"
                stroke="#60a5fa"
                strokeWidth="2"
              />
              <text
                x={xAt(index)}
                y="260"
                textAnchor="middle"
                fill="#64748b"
                fontSize={current.labels.length > 8 ? 8 : 10}
              >
                {label}
              </text>
              <rect x={xAt(index) - 15} y="22" width="30" height="220" fill="transparent" />
            </g>
          ))}
        </svg>
        {hovered !== null && (
          <div className="pointer-events-none absolute right-4 top-3 rounded-xl bg-primary p-3 text-[10px] leading-5 text-white shadow-lg">
            <p className="font-bold">{current.labels[hovered]}</p>
            <p>{t('finance.chart.hoverAuction', { amount: formatMoney(current.auction) })}</p>
            <p>{t('finance.chart.hoverNormal', { amount: formatMoney(current.normal) })}</p>
          </div>
        )}
      </div>
    </Panel>
  );
}

export function RevenueComposition({ analytics }: { analytics: AdminOverviewAnalytics }) {
  const { t } = useTranslation('admin');
  const composition = analytics.revenueComposition;
  const items = composition.items ?? [];
  const firstPercentage = Math.max(
    0,
    Math.min(100, Number.parseFloat(items[0]?.percentage ?? '0') || 0),
  );
  return (
    <Panel
      title={t('finance.chart.compositionTitle')}
      subtitle={t('finance.chart.compositionSubtitle')}
      icon={<CircleDollarSign size={19} />}
    >
      <div
        className="relative mx-auto my-6 flex size-40 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(var(--color-primary) 0% ${firstPercentage}%, #60a5fa ${firstPercentage}% 100%)`,
        }}
      >
        <div className="flex size-29 flex-col items-center justify-center rounded-full bg-white">
          <span className="text-[9px] text-slate-500">{t('finance.chart.totalFeeUpper')}</span>
          <strong className="my-1 text-xl text-slate-900">{composition.totalLabel}</strong>
          <span className="text-[9px] text-primary">VND</span>
        </div>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.name} className="flex items-start gap-2 rounded-lg bg-slate-50 p-3">
            <span className={`mt-1 size-2 shrink-0 rounded-full ${item.color || 'bg-primary'}`} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold">{item.name}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">{item.description}</p>
            </div>
            <div className="text-right text-[11px]">
              <p className="font-bold">{item.amount}</p>
              <p className="text-primary">{item.percentage}</p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
