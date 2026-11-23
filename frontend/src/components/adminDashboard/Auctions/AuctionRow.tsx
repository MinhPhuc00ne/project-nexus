import {
  Film,
  Gavel,
  Image as ImageIcon,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
  Play,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getIntlLocale } from '../../../i18n/config';
import { formatCurrency } from '../../../i18n/formatters';
import { resolveAuctionImageUrl, type AdminAuctionEntity } from '../../../services/auction.service';
import { Badge, Button } from '../shared/AdminUI';
import type { useAdminAuctions } from './useAdminAuctions';
import { isKnownAuctionStatus } from './auctionStatuses';
import { consignmentLockReason } from './consignmentAvailability';
import { auctionEditReason, auctionDeleteReason } from './auctionManagementAvailability';
import type useAuctionBanners from './useAuctionBanners';
import { auctionBannerReason, BANNER_LIST_LIMIT } from './auctionBannerPromotion';

type Props = Pick<
  ReturnType<typeof useAdminAuctions>,
  | 'setSelectedAuction'
  | 'startingId'
  | 'setLockingAuction'
  | 'locking'
  | 'setLockError'
  | 'openShowcaseForAuction'
  | 'handleStartAuction'
  | 'now'
> & {
  item: AdminAuctionEntity;
  onEdit: (auction: AdminAuctionEntity) => void;
  onDelete: (auction: AdminAuctionEntity) => void;
  onPromote: (auction: AdminAuctionEntity) => void;
  banners: ReturnType<typeof useAuctionBanners>;
};

export default function AuctionRow({
  item,
  setSelectedAuction,
  startingId,
  setLockingAuction,
  locking,
  setLockError,
  openShowcaseForAuction,
  handleStartAuction,
  now,
  onEdit,
  onDelete,
  onPromote,
  banners,
}: Props) {
  const { t, i18n } = useTranslation('admin');
  const locale = getIntlLocale(i18n.language);
  const hasBanner = banners.data.some((banner) => banner.auctionId === item.id);
  const bannerReason = banners.loading
    ? t('management.bannerChecking')
    : banners.error
      ? t('management.bannerLoadError')
      : !hasBanner && banners.data.length >= BANNER_LIST_LIMIT
        ? t('management.bannerUnknown')
        : auctionBannerReason(item);
  const editReason = auctionEditReason(item);
  const deleteReason = auctionDeleteReason(item);
  const lockReasonKey = consignmentLockReason(item, now);
  const lockReason = lockReasonKey ? t(`auctions.lockReasons.${lockReasonKey}`) : '';
  const deadlinePassed =
    !!item.consignmentDeadline && new Date(item.consignmentDeadline).getTime() <= now;
  const ended = new Date(item.endTime).getTime() <= now;
  return (
    <tr>
      <td className="max-w-72 p-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            aria-label={t('auctions.row.view3dAria', { title: item.title })}
            title={t('auctions.row.view3dTitle')}
            onClick={() => void openShowcaseForAuction(item)}
            className="group relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-blue-50 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {item.imageUrl ? (
              <img
                src={resolveAuctionImageUrl(item.imageUrl)}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <Gavel size={20} aria-hidden="true" />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-slate-900/60 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Film size={22} aria-hidden="true" />
            </span>
          </button>
          <div className="min-w-0">
            <p className="break-words font-semibold text-slate-900">{item.title}</p>
            <p className="mt-1 text-slate-500">
              {t('auctions.row.createdBy', {
                name: item.createdByAdmin?.fullName || item.seller?.fullName || '—',
              })}
            </p>
          </div>
        </div>
        {item.product && (
          <div className="mt-3 space-y-1 rounded-lg bg-blue-50 p-3">
            <p className="font-medium text-slate-800">
              {t('auctions.row.productLabel', { title: item.product.title })}
            </p>
            <p className="text-slate-500">
              {t('auctions.common.seller')}: {item.seller?.fullName || '—'}
            </p>
            <p className="text-primary">
              {t('auctions.row.startingPriceLabel', {
                price: formatCurrency(Number(item.startingPrice), i18n.language),
              })}
            </p>
          </div>
        )}
      </td>
      <td className="whitespace-nowrap p-4">{new Date(item.startTime).toLocaleString(locale)}</td>
      <td className="whitespace-nowrap p-4">{new Date(item.endTime).toLocaleString(locale)}</td>
      <td className="p-4">
        <p>
          {t('management.buyer')}: {item.minBuyerReputation}
        </p>
        <p className="mt-1">
          {t('auctions.common.seller')}: {item.minSellerReputation}
        </p>
      </td>
      <td className="p-4">{item.totalBidsCount}</td>
      <td className="w-px whitespace-nowrap p-4 align-middle [&>span]:w-max [&>span]:leading-none">
        <Badge tone={item.status === 'ACTIVE' || item.status === 'EXTENDED' ? 'green' : 'blue'}>
          {isKnownAuctionStatus(item.status) ? t(`auctions.statuses.${item.status}`) : item.status}
        </Badge>
      </td>
      <td className="p-4">
        <div className="flex flex-col items-start gap-2">
          <Button
            variant="secondary"
            aria-label={t('management.viewProductsAria', {
              value1: item.title,
              value2: item._count?.items ?? 0,
            })}
            title={t('management.viewProducts', { value1: item._count?.items ?? 0 })}
            onClick={() => setSelectedAuction(item)}
          >
            {t('management.viewProducts', { value1: item._count?.items ?? 0 })}
          </Button>
          <Link
            to={`/admin/auctions/${item.id}/lots`}
            aria-label={t('management.manageLotsAria', { value1: item.title })}
            title={t('management.manageLots')}
            className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg bg-primary px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <Gavel size={16} aria-hidden="true" /> {t('management.manageLots')}
          </Link>
        </div>
      </td>
      <td className="p-4 align-middle">
        <div className="flex w-max flex-nowrap items-center gap-2 [&>button]:size-10 [&>button]:shrink-0 [&>button]:p-0">
          {hasBanner ? (
            <Link
              to="/admin/banners"
              className="inline-flex size-10 items-center justify-center rounded-lg bg-blue-50 text-primary hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-600"
              aria-label={t('management.manageBannerAria', { value1: item.title })}
              title={t('management.bannerExistsLink')}
            >
              <ImageIcon size={16} aria-hidden="true" />
            </Link>
          ) : (
            <Button
              variant="secondary"
              disabled={!!bannerReason || !!startingId || locking}
              title={bannerReason || t('management.promoteTooltip')}
              aria-label={t('management.promoteAria', { value1: item.title })}
              aria-busy={banners.loading}
              onClick={() => onPromote(item)}
            >
              {banners.loading ? (
                <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <ImagePlus size={16} aria-hidden="true" />
              )}
            </Button>
          )}
          <Button
            variant="secondary"
            disabled={!!editReason || !!startingId || locking}
            title={editReason || t('management.editAuction')}
            aria-label={t('management.editAuctionAria', { value1: item.title })}
            onClick={() => onEdit(item)}
          >
            <Pencil size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="danger"
            disabled={!!deleteReason || !!startingId || locking}
            title={deleteReason || t('management.deleteAuction')}
            aria-label={t('management.deleteAuctionAria', { value1: item.title })}
            onClick={() => onDelete(item)}
          >
            <Trash2 size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            disabled={!!lockReason || !!startingId || locking}
            title={lockReason || t('management.lockTooltip')}
            aria-label={t(
              item.isConsignmentLocked ? 'management.lockedAria' : 'management.lockAria',
              { title: item.title },
            )}
            className="disabled:bg-slate-200 disabled:text-slate-500 disabled:opacity-100"
            onClick={() => {
              if (consignmentLockReason(item, Date.now())) return;
              setLockError('');
              setLockingAuction(item);
            }}
          >
            <LockKeyhole size={16} aria-hidden="true" />
          </Button>
          {['DRAFT', 'SCHEDULED'].includes(item.status) ? (
            <>
              <Button
                disabled={
                  !!startingId || locking || ended || (!item.isConsignmentLocked && !deadlinePassed)
                }
                title={
                  ended
                    ? t('auctions.row.pastEndTime')
                    : !item.isConsignmentLocked && !deadlinePassed
                      ? t('management.lockBeforeStart')
                      : startingId === item.id
                        ? t('management.starting')
                        : t('management.startAuction')
                }
                aria-label={t('management.startAuctionAria', { value1: item.title })}
                aria-busy={startingId === item.id}
                onClick={() => void handleStartAuction(item)}
              >
                {startingId === item.id ? (
                  <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Play size={16} aria-hidden="true" />
                )}
              </Button>
            </>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
