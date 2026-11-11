import { Link } from 'react-router-dom';
import type { HomeProduct } from './home.types';
import { formatAuctionImage, type AuctionEntity } from '../../services/auction.service';

export interface HomeAuctionCardProps {
  product?: HomeProduct;
  auction?: AuctionEntity;
}

export function HomeAuctionCard({ product, auction }: HomeAuctionCardProps) {
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
    'Chưa có dữ liệu';

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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2 transition-[transform,box-shadow,border-color] duration-[180ms] ease-in-out hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgb(28_57_115_/_10%)] motion-reduce:transition-none motion-reduce:hover:transform-none">
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
          <span className="text-xs text-slate-400">Chưa có hình ảnh</span>
        )}
        <span
          className={`absolute left-2 top-2 rounded px-2 py-1 text-[10px] font-bold text-white shadow-xs ${
            isUpcoming ? 'bg-amber-500' : 'bg-sky-500'
          }`}
        >
          {isUpcoming ? 'SẮP MỞ' : 'TRỰC TIẾP'}
        </span>
        <button
          type="button"
          aria-label={`Xem chi tiết ${title}`}
          className="absolute bottom-2 right-2 rounded-md border border-white/70 bg-slate-900/70 px-2.5 py-1.5 text-[10px] font-semibold text-white transition hover:bg-slate-900 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = targetUrl;
          }}
        >
          Chi Tiết
        </button>
      </Link>

      <div className="p-2">
        <Link to={targetUrl}>
          <h3 className="text-xs font-bold text-slate-700 hover:text-[#f24e1e] transition line-clamp-1">
            {title}
          </h3>
        </Link>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs font-extrabold text-sky-500">
            {currentPrice ? `${currentPrice.toLocaleString('vi-VN')} đ` : '--'}
          </span>

          <span className="text-[10px] text-slate-400">
            {isUpcoming
              ? `Mở ${new Date(auction!.startTime).toLocaleDateString('vi-VN')}`
              : bidsCount
                ? `${bidsCount} lượt bid`
                : 'Mới mở'}
          </span>
        </div>
      </div>
    </div>
  );
}
