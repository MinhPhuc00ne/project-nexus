import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, Star } from 'lucide-react';
import { formatCurrency } from '../../i18n/formatters';
import type { RecommendedProduct } from '@/features/catalog/services/products.service';

interface HomeRecommendationsSectionProps {
  products: RecommendedProduct[];
  isPersonalized: boolean;
  isLoading: boolean;
}

export function HomeRecommendationsSection({
  products,
  isPersonalized,
  isLoading,
}: HomeRecommendationsSectionProps) {
  const { t } = useTranslation('guest');
  return (
    <section className="nexus-panel mt-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-primary">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-ink">
                {t('home.recommendationsSection.title')}
              </h2>
              {isPersonalized ? (
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
                  {t('home.recommendationsSection.personalizedBadge')}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {t('home.recommendationsSection.trendingBadge')}
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">
              {isPersonalized
                ? t('home.recommendationsSection.personalizedDesc')
                : t('home.recommendationsSection.trendingDesc')}
            </p>
          </div>
        </div>

        <Link
          to="/search"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition flex items-center gap-1 group"
        >
          <span>{t('home.recommendationsSection.exploreAll')}</span>
          <span className="group-hover:translate-x-0.5 transition-transform">→</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-5 storefront-product-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-slate-200 bg-slate-50/50 p-3"
            >
              <div className="aspect-square w-full rounded-lg bg-slate-200" />
              <div className="mt-3 h-3.5 w-3/4 rounded bg-slate-200" />
              <div className="mt-2 h-4 w-1/2 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted">
          {t('home.recommendationsSection.empty')}
        </div>
      ) : (
        <div className="mt-5 storefront-product-grid">
          {products.map((p) => {
            const isInterest = p.recommendationReason === 'CATEGORY_INTEREST';
            const price = p.salePrice ?? p.basePrice ?? 0;
            const hasDiscount = Boolean(p.salePrice && p.salePrice < p.basePrice);
            const discountPct = hasDiscount
              ? Math.round(((p.basePrice - p.salePrice!) / p.basePrice) * 100)
              : 0;

            return (
              <Link
                key={p.id}
                to={`/product/${p.id}`}
                className="nexus-product-card group relative flex flex-col justify-between overflow-hidden"
              >
                <div>
                  <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                    <img
                      src={p.thumbnail || p.images?.[0] || '/placeholder-product.png'}
                      alt={p.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60';
                      }}
                    />

                    {/* Badges: Chỉ hiển thị khi có dữ liệu thật (Gợi ý theo gu hoặc Giảm giá thật) */}
                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                      {isInterest && (
                        <span className="rounded-md bg-blue-600/90 backdrop-blur-xs px-2 py-0.5 text-[9px] font-semibold text-white shadow-xs">
                          {t('home.recommendationsSection.forYouBadge')}
                        </span>
                      )}

                      {hasDiscount && (
                        <span className="w-fit rounded-md bg-blue-600 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                          -{discountPct}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3">
                    <p className="truncate text-[10px] font-medium text-slate-400">
                      {p.seller?.fullName || t('home.recommendationsSection.defaultShopName')}
                    </p>
                    <h3 className="mt-1 line-clamp-2 min-h-[32px] text-xs font-semibold text-ink group-hover:text-blue-600 transition">
                      {p.title}
                    </h3>

                    <div className="mt-2.5 flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold text-blue-600">
                        {formatCurrency(price)}
                      </span>
                      {hasDiscount && (
                        <span className="text-[11px] text-slate-400 line-through">
                          {formatCurrency(p.basePrice)}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] min-h-[18px]">
                      {p.averageRating && p.averageRating > 0 ? (
                        <div className="flex items-center gap-1">
                          <Star size={11} className="fill-blue-400 text-blue-400" />
                          <span className="font-semibold text-slate-700">
                            {p.averageRating.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-slate-400">({p.reviewCount || 0})</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          {t('home.recommendationsSection.noReviews')}
                        </span>
                      )}

                      {p.reviewCount && p.reviewCount > 0 ? (
                        <span className="text-[10px] text-slate-400">
                          {t('home.recommendationsSection.soldCount', { count: p.reviewCount })}
                        </span>
                      ) : null}
                    </div>
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

export default HomeRecommendationsSection;
