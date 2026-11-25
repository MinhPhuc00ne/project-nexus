import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getIntlLocale } from '../../../i18n/config';
import { formatCurrency } from '../../../i18n/formatters';
import type { AdminAuctionItem } from '../../../services/auction.service';
import { getShopDetailApi, type ShopDetailResult } from '../../../services/products.service';
import { Badge, Button } from '../shared/AdminUI';

function Gallery({ urls, title }: { urls: string[]; title: string }) {
  const { t } = useTranslation('admin');
  const images = urls.filter((url) => /^https?:\/\//i.test(url));
  return (
    <section className="space-y-3">
      <h4 className="font-semibold">{title}</h4>
      {images.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {images.map((url, index) => (
            <a
              key={`${url}:${index}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-200 bg-slate-50 p-2"
            >
              <img
                src={url}
                alt={`${title} ${index + 1}`}
                loading="lazy"
                className="h-64 w-full object-contain"
              />
              <span className="mt-2 block text-center text-xs text-blue-600">
                {t('auctions.itemDetails.openImage', { index: index + 1 })}
              </span>
            </a>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">{t('auctions.itemDetails.noImages')}</p>
      )}
    </section>
  );
}

export default function AuctionItemDetails({
  item,
  view,
  minimumScore,
  onBack,
}: {
  item: AdminAuctionItem;
  view: 'item' | 'shop';
  minimumScore: number;
  onBack: () => void;
}) {
  const { t, i18n } = useTranslation('admin');
  const locale = getIntlLocale(i18n.language);
  const money = (value: number | string | null | undefined) =>
    value === null || value === undefined
      ? t('auctions.common.none')
      : formatCurrency(Number(value), i18n.language);
  const date = (value?: string | null) => (value ? new Date(value).toLocaleString(locale) : '—');
  const [shop, setShop] = useState<ShopDetailResult['shop'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (view !== 'shop') return;
    let active = true;
    setLoading(true);
    setError('');
    setShop(null);
    void getShopDetailApi(item.seller.id)
      .then((result) => {
        if (active) setShop(result.shop);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : t('auctions.itemDetails.loadShopError'),
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [item.seller.id, view, revision, t]);

  const score = shop?.reputationScore ?? item.seller.reputationScore;
  return (
    <div className="space-y-5">
      <Button variant="secondary" onClick={onBack}>
        {t('auctions.itemDetails.backToList')}
      </Button>
      <h3 className="text-lg font-semibold">
        {view === 'shop' ? t('auctions.itemDetails.shopTitle') : item.title}
      </h3>
      {view === 'shop' ? (
        <>
          {loading && (
            <p role="status" className="text-sm text-slate-500">
              {t('auctions.itemDetails.loadingShop')}
            </p>
          )}
          {error && (
            <div role="alert" className="space-y-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <p>{error}</p>
              <p>{t('auctions.itemDetails.fallbackNotice')}</p>
              <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
                {t('auctions.common.retry')}
              </Button>
            </div>
          )}
          <section className="space-y-4 rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              {(shop?.avatarUrl || item.seller.shopAvatarUrl) && (
                <img
                  src={shop?.avatarUrl || item.seller.shopAvatarUrl || ''}
                  alt={t('auctions.itemDetails.shopAvatarAlt')}
                  className="size-16 rounded-lg object-cover"
                />
              )}
              <div>
                <p className="font-semibold">{shop?.name || item.seller.fullName}</p>
                <p className="text-sm text-slate-500">
                  {t('auctions.itemDetails.sellerName', {
                    name: shop?.sellerFullName || item.seller.fullName,
                  })}
                </p>
              </div>
            </div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">{t('auctions.itemDetails.reputationScore')}</dt>
                <dd className="mt-1 font-semibold">
                  {t('auctions.itemDetails.reputationSummary', {
                    score: score ?? t('auctions.itemsDialog.noData'),
                    min: minimumScore,
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">{t('auctions.itemDetails.trustLevel')}</dt>
                <dd>{shop?.trustLevel || item.seller.trustLevel || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">{t('auctions.itemDetails.accountEmail')}</dt>
                <dd className="break-all">{item.seller.platformEmail || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">{t('auctions.itemDetails.shopStatus')}</dt>
                <dd>
                  {item.seller.isShopSuspended
                    ? t('auctions.itemDetails.suspended')
                    : shop
                      ? shop.isSellerActive
                        ? t('auctions.itemDetails.sellerActive')
                        : t('auctions.itemDetails.sellerInactive')
                      : t('auctions.itemDetails.noActivationInfo')}
                </dd>
              </div>
              {shop && (
                <>
                  <div>
                    <dt className="text-slate-500">{t('auctions.itemDetails.address')}</dt>
                    <dd>
                      {shop.address?.formattedAddress ||
                        [shop.address?.district, shop.address?.city].filter(Boolean).join(', ') ||
                        t('auctions.itemDetails.notUpdated')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{t('auctions.itemDetails.activeProducts')}</dt>
                    <dd>{shop.stats.totalProducts}</dd>
                  </div>
                </>
              )}
            </dl>
            {score !== undefined && (
              <Badge tone={score >= minimumScore ? 'green' : 'red'}>
                {score >= minimumScore
                  ? t('auctions.itemDetails.meetsReputation')
                  : t('auctions.itemDetails.belowReputation')}
              </Badge>
            )}
            {item.seller.isShopSuspended && (
              <p className="text-sm text-red-700">
                {t('auctions.itemDetails.shopSuspendedNotice')}
              </p>
            )}
            {item.isSellerFlagged && (
              <p className="text-sm text-amber-700">
                {t('auctions.itemDetails.profileWarning', {
                  reason: item.flagReason || t('auctions.itemDetails.defaultFlagReason'),
                })}
              </p>
            )}
            {shop && (
              <div>
                <h4 className="font-semibold">{t('auctions.itemDetails.shopIntro')}</h4>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">
                  {shop.description || t('auctions.itemDetails.noDescription')}
                </p>
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            {t('auctions.itemDetails.itemMeta', {
              seller: item.seller.fullName,
              lot: item.lotNumber ?? t('auctions.itemDetails.unassigned'),
              status: t(`auctions.itemStates.${item.status}`),
            })}
          </p>
          <section>
            <h4 className="font-semibold">{t('auctions.itemDetails.descOriginCondition')}</h4>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">
              {item.description}
            </p>
          </section>
          <Gallery urls={item.images} title={t('auctions.itemDetails.itemImages')} />
          <section className="rounded-lg bg-slate-50 p-4 text-sm">
            <h4 className="mb-3 font-semibold">{t('auctions.itemDetails.sellerProposedPrice')}</h4>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div>
                <dt>{t('auctions.reviewForm.startingPrice')}</dt>
                <dd>{money(item.proposedStartingPrice)}</dd>
              </div>
              <div>
                <dt>{t('auctions.reviewForm.reservePrice')}</dt>
                <dd>
                  {Number(item.proposedReservePrice) > 0
                    ? money(item.proposedReservePrice)
                    : t('auctions.common.none')}
                </dd>
              </div>
              <div>
                <dt>{t('auctions.reviewForm.bidIncrement')}</dt>
                <dd>{money(item.proposedBidIncrement)}</dd>
              </div>
            </dl>
            {item.status === 'APPROVED' && (
              <>
                <h4 className="mb-3 mt-4 font-semibold">
                  {t('auctions.itemDetails.approvedPrice')}
                </h4>
                <dl className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <dt>{t('auctions.reviewForm.startingPrice')}</dt>
                    <dd>{money(item.startingPrice)}</dd>
                  </div>
                  <div>
                    <dt>{t('auctions.reviewForm.reservePrice')}</dt>
                    <dd>
                      {Number(item.reservePrice) > 0
                        ? money(item.reservePrice)
                        : t('auctions.common.none')}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('auctions.reviewForm.bidIncrement')}</dt>
                    <dd>{money(item.bidIncrement)}</dd>
                  </div>
                </dl>
              </>
            )}
          </section>
          <section className="space-y-3 text-sm">
            <h4 className="font-semibold">{t('auctions.itemDetails.appraisalSection')}</h4>
            <p>
              {t('auctions.itemDetails.appraisalAgency', {
                agency: item.appraisalAgency || '—',
              })}
            </p>
            <p>
              {t('auctions.itemDetails.certificateNumber', {
                number: item.appraisalCertificateNumber || '—',
              })}
            </p>
            <p>
              {t('auctions.itemDetails.issueDate', {
                date: date(item.certificateIssueDate),
              })}
            </p>
          </section>
          <Gallery
            urls={item.certificateImages}
            title={t('auctions.itemDetails.certificateImages')}
          />
          <dl className="space-y-2 text-xs text-slate-500">
            <div>
              <dt>{t('auctions.itemDetails.submittedAt')}</dt>
              <dd>{date(item.createdAt)}</dd>
            </div>
            <div>
              <dt>{t('auctions.itemDetails.reviewedBy')}</dt>
              <dd>
                {item.reviewedByAdmin?.fullName || '—'} · {date(item.reviewedAt)}
              </dd>
            </div>
          </dl>
          {item.rejectionReason && (
            <p className="text-sm text-red-700">
              {t('auctions.itemsDialog.rejectionReason', { reason: item.rejectionReason })}
            </p>
          )}
        </>
      )}
      <Button variant="secondary" onClick={onBack}>
        {t('auctions.itemDetails.backToList')}
      </Button>
    </div>
  );
}
