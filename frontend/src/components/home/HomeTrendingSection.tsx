import { Link } from 'react-router-dom';
import { Flame, Star, Store } from 'lucide-react';
import { formatCurrency } from '../../i18n/formatters';
import type { TrendingProductItem } from '../../services/products.service';

interface HomeTrendingSectionProps {
  products: TrendingProductItem[];
  isLoading: boolean;
}

export function HomeTrendingSection({ products, isLoading }: HomeTrendingSectionProps) {
  if (!isLoading && products.length === 0) {
    return null;
  }

  return (
    <section className="mt-5 rounded-[18px] border border-orange-200/80 bg-gradient-to-b from-orange-50/40 to-white p-4 sm:p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 text-white shadow-sm shadow-orange-300/40">
            <Flame size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-extrabold uppercase tracking-wide text-slate-900 flex items-center gap-1.5">
                Sản phẩm Xu Hướng
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
                HOT TREND
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Top các sản phẩm dẫn đầu về lượt mua và được quan tâm nhiều nhất trên NEXUS
            </p>
          </div>
        </div>

        <Link
          to="/search?sortBy=newest"
          className="text-xs font-bold text-orange-600 hover:text-orange-700 transition flex items-center gap-1 group"
        >
          <span>Xem tất cả bảng xếp hạng</span>
          <span className="group-hover:translate-x-0.5 transition-transform">→</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-slate-200 bg-white p-3 space-y-2.5"
            >
              <div className="aspect-square w-full rounded-lg bg-slate-200" />
              <div className="h-3 w-1/3 rounded bg-slate-200" />
              <div className="h-4 w-3/4 rounded bg-slate-200" />
              <div className="h-4 w-1/2 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {products.map((item, index) => {
            const rank = index + 1;
            const img =
              item.thumbnail ||
              item.images?.[0]?.imageUrl ||
              'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80';
            const price = Number(item.salePrice ?? item.basePrice ?? 0);
            const hasSale = Boolean(item.salePrice && item.salePrice < item.basePrice);
            const discountPct = hasSale
              ? Math.round(((item.basePrice - Number(item.salePrice)) / item.basePrice) * 100)
              : 0;

            const rankBadge =
              rank === 1 ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-2 py-0.5 text-[10px] font-black text-white shadow-xs">
                  🏆 TOP 1
                </span>
              ) : rank === 2 ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-slate-400 to-slate-500 px-2 py-0.5 text-[10px] font-black text-white shadow-xs">
                  🥈 TOP 2
                </span>
              ) : rank === 3 ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-600 to-amber-700 px-2 py-0.5 text-[10px] font-black text-white shadow-xs">
                  🥉 TOP 3
                </span>
              ) : (
                <span className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                  #{rank}
                </span>
              );

            return (
              <Link
                key={item.id}
                to={`/product/${item.id}`}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-2.5 transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
              >
                <div>
                  {/* Image & Rank Badge */}
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-slate-50 border border-slate-100">
                    <img
                      src={img}
                      alt={item.title}
                      className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute top-1.5 left-1.5 z-10">{rankBadge}</div>
                    {hasSale && (
                      <span className="absolute top-1.5 right-1.5 rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
                        -{discountPct}%
                      </span>
                    )}
                  </div>

                  {/* Shop Info */}
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate max-w-[110px] font-medium flex items-center gap-1">
                      <Store size={11} className="text-slate-400 shrink-0" />
                      {item.shopName || item.seller?.fullName || 'Gian Hàng NEXUS'}
                    </span>
                    {item.reputationScore > 0 && (
                      <span className="flex items-center gap-0.5 font-semibold text-amber-600 shrink-0">
                        <Star size={10} className="fill-amber-400 text-amber-400" />
                        {item.reputationScore}
                      </span>
                    )}
                  </div>

                  {/* Product Title */}
                  <h3 className="mt-1 line-clamp-2 text-xs font-semibold text-slate-900 group-hover:text-orange-600 transition">
                    {item.title}
                  </h3>
                </div>

                {/* Pricing & Purchases count */}
                <div className="mt-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-baseline gap-1.5">
                    <strong className="text-sm font-extrabold text-orange-600">
                      {formatCurrency(price)}
                    </strong>
                    {hasSale && (
                      <span className="text-[10px] text-slate-400 line-through">
                        {formatCurrency(Number(item.basePrice))}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="inline-flex items-center gap-1 font-semibold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded">
                      <Flame size={11} className="text-orange-500 fill-orange-500" />
                      {item.purchaseCount > 0
                        ? `${item.purchaseCount} lượt mua`
                        : 'Mới lên xu hướng'}
                    </span>
                    <span className="text-slate-400">
                      {item.availableQty > 0 ? `Còn ${item.availableQty}` : 'Hết hàng'}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
