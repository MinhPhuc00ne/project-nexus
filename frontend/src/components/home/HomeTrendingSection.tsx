import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Flame, Star, Store } from 'lucide-react';
import { formatCurrency } from '../../i18n/formatters';
import type { TrendingProductItem } from '@/features/catalog/services/products.service';

interface HomeTrendingSectionProps {
  products: TrendingProductItem[];
  isLoading: boolean;
}

function renderRankBadge(rank: number) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-blue-600 via-blue-700 to-navy px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs">
        🏆 TOP 1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-slate-400 to-slate-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs">
        🥈 TOP 2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-blue-600 to-blue-700 px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs">
        🥉 TOP 3
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
      #{rank}
    </span>
  );
}

export function HomeTrendingSection({ products, isLoading }: HomeTrendingSectionProps) {
  const { t, i18n } = useTranslation('guest');

  if (!isLoading && products.length === 0) {
    return null;
  }

  return (
    <section className="nexus-panel mt-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-primary">
            <Flame size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-ink flex items-center gap-1.5">
                {t('home.trending.title')}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                HOT TREND
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">{t('home.trending.subtitle')}</p>
          </div>
        </div>

        <Link
          to="/search?sortBy=newest"
          className="text-sm font-semibold text-primary hover:text-primary-dark transition flex items-center gap-1 group"
        >
          <span>{t('home.categoriesSection.viewAll')}</span>
          {/* <span className="group-hover:translate-x-0.5 transition-transform">→</span> */}
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

            const stockText =
              item.availableQty > 0 ? `${item.availableQty}` : t('home.trending.outOfStock');

            const purchaseText =
              item.purchaseCount > 0
                ? t('home.trending.salesCount', { count: item.purchaseCount })
                : t('home.auctionCard.newlyOpened');

            return (
              <Link
                key={item.id}
                to={`/product/${item.id}`}
                className="nexus-product-card group relative flex flex-col justify-between p-2.5"
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
                    <div className="absolute top-1.5 left-1.5 z-10">{renderRankBadge(rank)}</div>
                    {hasSale && (
                      <span className="absolute top-1.5 right-1.5 rounded-md bg-blue-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                        -{discountPct}%
                      </span>
                    )}
                  </div>

                  {/* Shop Info */}
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted">
                    <span className="truncate max-w-[110px] font-medium flex items-center gap-1">
                      <Store size={11} className="text-slate-400 shrink-0" />
                      {item.shopName || item.seller?.fullName || 'NEXUS Store'}
                    </span>
                    {item.reputationScore > 0 && (
                      <span className="flex items-center gap-0.5 font-semibold text-blue-600 shrink-0">
                        <Star size={10} className="fill-blue-400 text-blue-400" />
                        {item.reputationScore}
                      </span>
                    )}
                  </div>

                  {/* Product Title */}
                  <h3 className="mt-1 line-clamp-2 text-xs font-semibold text-ink group-hover:text-primary transition">
                    {item.title}
                  </h3>
                </div>

                {/* Pricing & Purchases count */}
                <div className="mt-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-baseline gap-1.5">
                    <strong className="text-base font-semibold text-ink">
                      {formatCurrency(price, i18n.language)}
                    </strong>
                    {hasSale && (
                      <span className="text-[10px] text-slate-400 line-through">
                        {formatCurrency(Number(item.basePrice), i18n.language)}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[10px] text-muted">
                    <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                      <Flame size={11} className="text-blue-500 fill-blue-500" />
                      {purchaseText}
                    </span>
                    <span className="text-slate-400">{stockText}</span>
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
