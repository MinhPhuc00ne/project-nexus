import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getIntlLocale } from '../../../i18n/config';
import { formatCurrency } from '../../../i18n/formatters';
import {
  confirmAdminAuctionAwardApi,
  listAdminAuctionAwardsApi,
} from '@/features/auction/services/auction.service';
import {
  AUCTION_AWARD_STATES,
  canConfirmAwardAction,
  type AwardAction,
} from '../../../types/admin-auction-operations.types';
import { Badge, Button, EmptyState, Panel } from '../shared/AdminUI';
import { useAuctionOperationResource } from './useAuctionOperationResource';
import AuctionAwardActionDialog from './AuctionAwardActionDialog';

export default function AuctionAwardsPanel({
  auctionId,
  refreshKey,
  realtimeConnected,
  lotId,
  onLotChange,
}: {
  auctionId: string;
  refreshKey: number;
  realtimeConnected: boolean;
  lotId: string;
  onLotChange: (lotId: string) => void;
}) {
  const { t, i18n } = useTranslation('admin');
  const locale = getIntlLocale(i18n.language);
  const money = (value: number) => formatCurrency(Number(value), i18n.language);
  const load = useCallback(() => listAdminAuctionAwardsApi(auctionId), [auctionId]);
  const resource = useAuctionOperationResource(load, refreshKey, realtimeConnected);
  const [status, setStatus] = useState('');
  const [selection, setSelection] = useState<{ id: string; action: AwardAction } | null>(null);
  const selectedAward = resource.rows.find((row) => row.id === selection?.id);
  const visible = resource.rows.filter(
    (row) => (!status || row.status === status) && (!lotId || row.auctionItemId === lotId),
  );
  const lotOptions = [
    ...new Map(
      resource.rows
        .filter((row) => row.auctionItem)
        .map((row) => [row.auctionItem!.id, row.auctionItem!]),
    ).values(),
  ];
  return (
    <Panel
      title={t('auctions.awardsPanel.title')}
      subtitle={t('auctions.awardsPanel.subtitle')}
      action={
        <Button
          variant="secondary"
          disabled={resource.loading || resource.pending}
          onClick={resource.refresh}
        >
          {t('auctions.common.refresh')}
        </Button>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(
          [
            ['total', resource.rows.length],
            [
              'pending',
              resource.rows.filter((row) =>
                ['AWAITING_ACCEPTANCE', 'AWAITING_DEPOSIT', 'AWAITING_CHECKOUT'].includes(
                  row.status,
                ),
              ).length,
            ],
            ['defaulted', resource.rows.filter((row) => row.status === 'PAYMENT_DEFAULT').length],
            ['paid', resource.rows.filter((row) => row.status === 'PAID').length],
          ] as const
        ).map(([key, value]) => (
          <div key={key} className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{t(`auctions.awardsPanel.stats.${key}`)}</p>
            <p className="mt-2 text-2xl font-bold text-primary">
              {resource.loading && !resource.rows.length ? '—' : value}
            </p>
          </div>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          aria-label={t('auctions.awardsPanel.filterLotAria')}
          value={lotId}
          disabled={resource.pending}
          onChange={(event) => {
            onLotChange(event.target.value);
            setSelection(null);
          }}
          className="max-w-full rounded-lg border border-slate-200 p-3 text-xs"
        >
          <option value="">{t('auctions.awardsPanel.allLots')}</option>
          {lotId && !lotOptions.some((lot) => lot.id === lotId) && (
            <option value={lotId}>{t('auctions.awardsPanel.selectedLot')}</option>
          )}
          {lotOptions.map((lot) => (
            <option key={lot.id} value={lot.id}>
              {t('auctions.common.lotPrefix', { number: lot.lotNumber ?? '—' })} · {lot.title}
            </option>
          ))}
        </select>
        <select
          aria-label={t('auctions.awardsPanel.filterStatusAria')}
          value={status}
          disabled={resource.pending}
          onChange={(event) => {
            setStatus(event.target.value);
            setSelection(null);
          }}
          className="rounded-lg border border-slate-200 p-3 text-xs"
        >
          <option value="">{t('auctions.awardsPanel.allStatuses')}</option>
          {AUCTION_AWARD_STATES.map((value) => (
            <option key={value} value={value}>
              {t(`auctions.awardStates.${value}`)}
            </option>
          ))}
        </select>
        {lotId && (
          <Button
            variant="secondary"
            disabled={resource.pending}
            onClick={() => {
              onLotChange('');
              setSelection(null);
            }}
          >
            {t('auctions.awardsPanel.viewAllLots')}
          </Button>
        )}
      </div>
      {resource.loading && (
        <p role="status" className="mb-3 text-sm text-slate-500">
          {t('auctions.awardsPanel.loading')}
        </p>
      )}
      {(resource.error || resource.actionError) && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {resource.error || resource.actionError}
        </p>
      )}
      {resource.notice && (
        <p role="status" className="mb-3 text-sm text-emerald-700">
          {resource.notice}
        </p>
      )}
      {!resource.loading && !resource.error && !visible.length && (
        <EmptyState
          text={lotId ? t('auctions.awardsPanel.emptyForLot') : t('auctions.awardsPanel.emptyAll')}
        />
      )}
      <div className="space-y-4">
        {visible.map((award) => {
          const canPenalize = canConfirmAwardAction(award, 'payment-default');
          const canWithdraw = canConfirmAwardAction(award, 'not-buying');
          return (
            <article key={award.id} className="space-y-4 rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    {award.auctionItem?.lotNumber
                      ? `${t('auctions.common.lotPrefix', { number: award.auctionItem.lotNumber })} · `
                      : ''}
                    {award.auctionItem?.title ?? t('auctions.awardsPanel.fallbackItemTitle')}
                  </h3>
                  <p className="mt-1 text-sm">
                    {award.buyer?.fullName ?? t('auctions.awardsPanel.unknownBuyer')}
                  </p>
                  <p className="text-xs text-slate-500">{award.buyer?.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    tone={
                      award.status === 'PAID'
                        ? 'green'
                        : award.status === 'PAYMENT_DEFAULT'
                          ? 'red'
                          : 'amber'
                    }
                  >
                    {(AUCTION_AWARD_STATES as readonly string[]).includes(award.status)
                      ? t(`auctions.awardStates.${award.status}`)
                      : award.status}
                  </Badge>
                  <Badge tone="gray">
                    {award.tier === 'PRIMARY_WINNER'
                      ? t('auctions.awardsPanel.tierPrimary')
                      : t('auctions.awardsPanel.tierSecond')}
                  </Badge>
                </div>
              </div>
              <dl className="grid gap-3 text-xs sm:grid-cols-4">
                {[
                  [t('auctions.awardsPanel.offerAmount'), money(award.offerAmount)],
                  [t('auctions.awardsPanel.depositAmount'), money(award.depositAmount)],
                  [t('auctions.awardsPanel.remainingAmount'), money(award.remainingProductAmount)],
                  [
                    t('auctions.awardsPanel.expiresAt'),
                    new Date(award.expiresAt).toLocaleString(locale),
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="mt-1 font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              {award.resolutionNote && (
                <p className="text-sm text-slate-600">
                  {t('auctions.awardsPanel.note', { note: award.resolutionNote })}
                </p>
              )}
              {award.order && (
                <p className="text-xs">
                  {t('auctions.awardsPanel.orderLabel')}{' '}
                  <Link to="/admin/orders" className="break-all text-blue-600 underline">
                    {award.order.id}
                  </Link>{' '}
                  · {award.order.status}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="danger"
                  className="disabled:opacity-40"
                  disabled={
                    resource.pending || resource.loading || !!resource.error || !canPenalize
                  }
                  title={!canPenalize ? t('auctions.awardsPanel.penalizeDisabledTitle') : undefined}
                  onClick={() => {
                    if (canPenalize) setSelection({ id: award.id, action: 'payment-default' });
                  }}
                >
                  {t('auctions.awardsPanel.penalizeBtn')}
                </Button>
                <Button
                  variant="secondary"
                  className="disabled:opacity-40"
                  disabled={
                    resource.pending || resource.loading || !!resource.error || !canWithdraw
                  }
                  title={!canWithdraw ? t('auctions.awardsPanel.withdrawDisabledTitle') : undefined}
                  onClick={() => {
                    if (canWithdraw) setSelection({ id: award.id, action: 'not-buying' });
                  }}
                >
                  {t('auctions.awardsPanel.withdrawBtn')}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      {selection && selectedAward && (
        <AuctionAwardActionDialog
          key={`${selection.id}:${selection.action}`}
          award={selectedAward}
          action={selection.action}
          pending={resource.pending}
          blocked={resource.loading || !!resource.error}
          error={resource.actionError || resource.error}
          onClose={() => setSelection(null)}
          onConfirm={(note) => {
            if (!canConfirmAwardAction(selectedAward, selection.action)) return;
            void resource
              .run(() => confirmAdminAuctionAwardApi(selectedAward.id, selection.action, note))
              .then((success) => {
                if (success) setSelection(null);
              });
          }}
        />
      )}
    </Panel>
  );
}
