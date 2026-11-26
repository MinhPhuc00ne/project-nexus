import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../../i18n/formatters';
import {
  getAdminAuctionItemsApi,
  reviewAuctionItemApi,
  type ReviewAuctionItemInput,
  type AdminAuctionEntity,
  type AdminAuctionItemsResponse,
} from '@/features/auction/services/auction.service';
import Popup from '../../Popup';
import { useToast } from '../../ToastNotification';
import { Badge, Button, EmptyState } from '../shared/AdminUI';
import ReviewAuctionItemForm from './ReviewAuctionItemForm';
import AuctionItemDetails from './AuctionItemDetails';

export default function AuctionItemsDialog({
  auction,
  onClose,
  onChanged,
}: {
  auction: AdminAuctionEntity;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { t, i18n } = useTranslation('admin');
  const toast = useToast();
  const [data, setData] = useState<AdminAuctionItemsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const [detail, setDetail] = useState<{ id: string; view: 'item' | 'shop' } | null>(null);
  const lock = useRef(false);
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setLoadError('');
    void getAdminAuctionItemsApi(auction.id)
      .then((result) => {
        if (current) setData(result);
      })
      .catch((cause: unknown) => {
        if (current)
          setLoadError(
            cause instanceof Error ? cause.message : t('auctions.itemsDialog.loadError'),
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [auction.id, revision, t]);

  const detailItem = data?.items.find((item) => item.id === detail?.id);

  async function review(itemId: string, payload: ReviewAuctionItemInput) {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    try {
      const result = await reviewAuctionItemApi(itemId, payload);
      if (!active.current) return;
      // Hide review controls immediately, even if refreshing the list fails.
      setData((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      status: payload.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
                      ...(payload.action === 'REJECT'
                        ? { rejectionReason: payload.rejectionReason }
                        : {
                            startingPrice: payload.startingPrice ?? item.proposedStartingPrice,
                            lotNumber: payload.lotNumber ?? item.lotNumber,
                          }),
                    }
                  : item,
              ),
            }
          : current,
      );
      toast.success(result.message);
      setRevision((value) => value + 1);
      onChanged();
    } finally {
      lock.current = false;
      if (active.current) setSaving(false);
    }
  }

  return (
    <Popup
      isOpen
      size="xl"
      title={t('auctions.itemsDialog.title', { title: auction.title })}
      onClose={() => {
        if (!lock.current) onClose();
      }}
    >
      {detail && detailItem ? (
        <AuctionItemDetails
          key={`${detail.id}:${detail.view}`}
          item={detailItem}
          view={detail.view}
          minimumScore={auction.minSellerReputation}
          onBack={() => setDetail(null)}
        />
      ) : (
        <div className="space-y-6">
          <section aria-label={t('auctions.itemsDialog.sectionAria')} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">
                {t('auctions.itemsDialog.heading')} {data ? `(${data.totalCount})` : ''}
              </h3>
              <Button
                variant="secondary"
                disabled={loading || saving}
                onClick={() => setRevision((value) => value + 1)}
              >
                {t('auctions.common.refresh')}
              </Button>
            </div>
            {loading && (
              <p role="status" className="text-sm text-slate-500">
                {t('auctions.itemsDialog.loading')}
              </p>
            )}
            {loadError && (
              <p role="alert" className="text-sm text-red-700">
                {loadError}
              </p>
            )}
            {!loading && !loadError && data?.items.length === 0 && (
              <EmptyState text={t('auctions.itemsDialog.empty')} />
            )}
            {!loading &&
              !loadError &&
              data?.items.map((item) => (
                <article key={item.id} className="rounded-lg border border-slate-200 p-4 text-sm">
                  <div className="flex items-start gap-3">
                    {item.images[0] && (
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        className="size-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold">
                        {item.lotNumber
                          ? `${t('auctions.common.lotPrefix', { number: item.lotNumber })} · `
                          : ''}
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t('auctions.itemsDialog.submittedBy', { name: item.seller.fullName })}
                      </p>
                      <p className="mt-1">
                        {t('auctions.itemsDialog.startingPrice', {
                          price: formatCurrency(
                            Number(item.startingPrice ?? item.proposedStartingPrice),
                            i18n.language,
                          ),
                        })}
                      </p>
                    </div>
                    <Badge
                      tone={
                        item.status === 'APPROVED'
                          ? 'green'
                          : item.status === 'REJECTED'
                            ? 'red'
                            : 'amber'
                      }
                    >
                      {t(`auctions.itemStates.${item.status}`)}
                    </Badge>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap break-words text-slate-600">
                    {item.description}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Button
                      variant="secondary"
                      disabled={saving}
                      onClick={() => setDetail({ id: item.id, view: 'shop' })}
                    >
                      {t('auctions.itemsDialog.viewShop')}
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={saving}
                      onClick={() => setDetail({ id: item.id, view: 'item' })}
                    >
                      {t('auctions.itemsDialog.viewItem')}
                    </Button>
                    <span className="text-xs text-slate-500">
                      {t('auctions.itemsDialog.sellerReputation', {
                        score: item.seller.reputationScore ?? t('auctions.itemsDialog.noData'),
                        min: auction.minSellerReputation,
                      })}
                    </span>
                    {item.seller.isShopSuspended && (
                      <Badge tone="red">{t('auctions.itemsDialog.shopSuspended')}</Badge>
                    )}
                  </div>
                  {item.isSellerFlagged && (
                    <p className="mt-2 text-amber-700">
                      {t('auctions.itemsDialog.flagNotice', { reason: item.flagReason })}
                    </p>
                  )}
                  {item.rejectionReason && (
                    <p className="mt-2 text-red-700">
                      {t('auctions.itemsDialog.rejectionReason', { reason: item.rejectionReason })}
                    </p>
                  )}
                  {item.status === 'PENDING_REVIEW' && (
                    <ReviewAuctionItemForm item={item} busy={saving || loading} onReview={review} />
                  )}
                </article>
              ))}
          </section>
          <div className="flex justify-end">
            <Button variant="secondary" disabled={saving} onClick={onClose}>
              {t('auctions.common.close')}
            </Button>
          </div>
        </div>
      )}
    </Popup>
  );
}
