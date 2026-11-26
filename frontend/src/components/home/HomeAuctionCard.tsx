import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getIntlLocale } from '../../i18n/config';
import { formatCurrency } from '../../i18n/formatters';
import type { HomeProduct } from './home.types';
import {
  formatAuctionImage,
  type AuctionEntity,
} from '@/features/auction/services/auction.service';

export interface HomeAuctionCardProps {
  product?: HomeProduct;
  auction?: AuctionEntity;
}

export function HomeAuctionCard({ product, auction }: HomeAuctionCardProps) {
  const { t, i18n } = useTranslation('guest');
  const isLive = auction?.status === 'ACTIVE' || auction?.status === 'EXTENDED';
  const isUpcoming =
    !isLive &&
    (auction?.status === 'SCHEDULED' ||
      (auction?.startTime ? new Date(auction.startTime).getTime() > Date.now() : false));

  const targetUrl = auction
    ? `/auction/${auction.id}`
    : product?.id
      ? `/product/${product.id}`
      : '/auction';

  const title =
    auction?.title ||
    auction?.product?.title ||
    auction?.items?.[0]?.title ||
    product?.name ||
    t('home.auctionCard.noData');

  const resolveRealImage = (): string => {
    if (auction?.imageUrl && auction.imageUrl.trim().length > 0) {
      return formatAuctionImage(auction.imageUrl);
    }
    if (auction?.items && auction.items.length > 0) {
      for (const item of auction.items) {
        if (item.images && item.images.length > 0) {
          const valid = item.images.find((u) => typeof u === 'string' && u.trim().length > 0);
          if (valid) return formatAuctionImage(valid);
        }
      }
    }
    if (
      auction?.product &&
      Array.isArray(auction.product.images) &&
      auction.product.images.length > 0
    ) {
      for (const img of auction.product.images) {
        if (img?.imageUrl && img.imageUrl.trim().length > 0) {
          return formatAuctionImage(img.imageUrl);
        }
      }
    }
    if (product?.image && product.image.trim().length > 0) {
      return formatAuctionImage(product.image);
    }
    return '';
  };

  const image = resolveRealImage();

  const currentPrice = auction
    ? Number(auction.currentHighestBid || auction.startingPrice)
    : product?.price || 0;

  const bidsCount =
    auction?.totalBidsCount ?? (auction?.bids?.length || (product?.sold ? product.sold : 0));

  return (
    <div className="overflow-hidden nexus-product-card p-2.5">
      <Link
        to={targetUrl}
        className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-slate-100 block"
      >
        {image ? (
          <img
            src={image}
            alt={title}
            className="h-full w-full rounded-lg object-cover hover:scale-105 transition duration-300"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80';
            }}
          />
        ) : (
          <span className="text-xs text-slate-400">{t('home.auctionCard.noImage')}</span>
        )}
        <span
          className={`absolute left-2 top-2 rounded px-2 py-1 text-[10px] font-bold text-white shadow-xs ${
            isUpcoming ? 'bg-amber-500' : 'bg-sky-500'
          }`}
        >
          {isUpcoming ? t('home.auctionCard.upcoming') : t('home.auctionCard.live')}
        </span>
        <button
          type="button"
          aria-label={t('home.auctionCard.viewDetailAria', { title })}
          className="absolute bottom-2 right-2 rounded-md border border-white/70 bg-slate-900/70 px-2.5 py-1.5 text-[10px] font-semibold text-white transition hover:bg-slate-900 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = targetUrl;
          }}
        >
          {t('home.auctionCard.details')}
        </button>
      </Link>

      <div className="p-2">
        <Link to={targetUrl}>
          <h3 className="text-xs font-bold text-slate-700 hover:text-[var(--color-primary)] transition line-clamp-1">
            {title}
          </h3>
        </Link>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs font-extrabold text-sky-500">
            {currentPrice ? formatCurrency(currentPrice) : '--'}
          </span>

          <span className="text-[10px] text-slate-400">
            {isUpcoming
              ? t('home.auctionCard.opensOn', {
                  date: new Date(auction!.startTime).toLocaleDateString(
                    getIntlLocale(i18n.language),
                  ),
                })
              : bidsCount
                ? t('home.auctionCard.bidsCount', { count: bidsCount })
                : t('home.auctionCard.newlyOpened')}
          </span>
        </div>
      </div>
    </div>
  );
}
