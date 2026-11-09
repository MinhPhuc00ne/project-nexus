import { Link } from 'react-router-dom';
import type { HomeProduct } from './home.types';
import type { AuctionEntity } from '../../services/auction.service';

export interface HomeAuctionCardProps {
  product?: HomeProduct;
  auction?: AuctionEntity;
}

export function HomeAuctionCard({ product, auction }: HomeAuctionCardProps) {
  const targetUrl = auction
    ? `/auction/${auction.id}`
    : product?.id
      ? `/product/${product.id}`
      : '/auction';

  const title = auction?.title || auction?.product?.title || product?.name || 'Chưa có dữ liệu';

  const image =
    auction?.product?.images?.[0]?.imageUrl || product?.image || '/images/watches/watch-1.png';

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
          />
        ) : (
          <span className="text-xs text-slate-400">Chưa có hình ảnh</span>
        )}
        <span className="absolute left-2 top-2 rounded bg-sky-500 px-2 py-1 text-[10px] font-bold text-white">
          3D MODEL
        </span>
        <button
          type="button"
          aria-label={`Xem mô hình ${title}`}
          className="absolute bottom-2 right-2 rounded-md border border-white/70 bg-slate-900/70 px-2.5 py-1.5 text-[10px] font-semibold text-white transition hover:bg-slate-900 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = targetUrl;
          }}
        >
          Xem 3D
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
            {bidsCount ? `${bidsCount} lượt bid` : 'Sắp mở'}
          </span>
        </div>
      </div>
    </div>
  );
}
