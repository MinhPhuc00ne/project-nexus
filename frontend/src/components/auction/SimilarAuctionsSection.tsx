import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, ArrowRight, Film, Package } from 'lucide-react';
import type { SimilarWatch } from './types';

interface SimilarAuctionsSectionProps {
  watches: SimilarWatch[];
  likedSimilar: Record<string, boolean>;
  onToggleLike: (id: string) => void;
}

export const SimilarAuctionsSection: React.FC<SimilarAuctionsSectionProps> = ({
  watches,
  likedSimilar,
  onToggleLike,
}) => {
  const { t } = useTranslation('auction');
  if (!watches || watches.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 mb-14">
      <div className="flex items-end justify-between mb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-[22px] font-extrabold text-slate-900 m-0">{t('similar.title')}</h2>
          <p className="text-[13px] text-slate-500 m-0">{t('similar.subtitle')}</p>
        </div>

        <Link
          to="/search?floor=Live+Auction+Floor"
          className="text-[13px] font-bold text-blue-600 no-underline inline-flex items-center gap-1 transition-all hover:gap-2 hover:underline"
        >
          <span>{t('similar.viewAll', { count: watches.length })}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {watches.map((item) => {
          const liked = likedSimilar[item.id] || false;
          const hasImage = Boolean(item.image && item.image.trim().length > 0);

          return (
            <Link
              key={item.id}
              to={`/auction/${item.id}`}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col transition relative shadow-xs hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg no-underline group"
            >
              {/* Top Badge */}
              <span
                className={`absolute top-2.5 left-2.5 text-[10px] font-extrabold px-2 py-0.5 rounded tracking-wide z-10 ${
                  item.badge.type === 'live'
                    ? 'bg-red-500 text-white'
                    : item.badge.type === 'upcoming'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-600 text-white'
                }`}
              >
                {item.badge.text}
              </span>

              {/* Favorite Button */}
              <button
                type="button"
                className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 backdrop-blur-xs border border-slate-200 flex items-center justify-center text-slate-500 cursor-pointer z-10 transition hover:text-red-500 hover:bg-white ${
                  liked ? 'text-red-500 fill-red-500' : ''
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleLike(item.id);
                }}
                aria-label={t('similar.favoriteAria')}
              >
                <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
              </button>

              {/* Card Image Area: Real image or Waiting Stage Placeholder */}
              <div className="relative w-full aspect-square bg-slate-50 overflow-hidden flex items-center justify-center">
                {hasImage ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-radial from-slate-800 via-slate-900 to-slate-950 text-slate-400">
                    <Package className="w-9 h-9 text-amber-400 mb-1.5 animate-pulse" />
                    <span className="text-[11px] font-bold text-slate-200">
                      {t('similar.awaitingConsignment')}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {t('similar.noItemsYet')}
                    </span>
                  </div>
                )}

                {/* Video Indicator if present */}
                {item.hasVideo && (
                  <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 bg-black/80 text-white backdrop-blur-xs border border-white/20 px-2 py-0.5 rounded text-[10px] font-bold shadow-xs">
                    <Film className="w-3 h-3 text-rose-400" />
                    <span>Video 4K</span>
                  </span>
                )}
              </div>

              {/* Info Area */}
              <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
                <div>
                  <p className="text-[10.5px] font-extrabold text-slate-500 uppercase tracking-wider m-0">
                    {item.brand}
                  </p>
                  <h4 className="text-[13.5px] font-bold text-slate-900 line-clamp-2 mt-1 m-0">
                    {item.title}
                  </h4>
                </div>

                <div className="flex items-end justify-between gap-2 pt-2 border-t border-slate-100">
                  {item.hasItems ? (
                    <div className="flex flex-col">
                      <span className="text-[10.5px] text-slate-500 m-0">{item.priceLabel}</span>
                      <p
                        className={`text-[17px] font-black text-rose-600 m-0 ${
                          item.badge.type === 'upcoming' ? 'text-slate-900' : ''
                        }`}
                      >
                        {item.price}
                      </p>
                      <span className="text-[10.5px] font-semibold text-blue-600 m-0">
                        {item.usdPrice}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full w-fit mb-1">
                        {t('similar.pendingListing')}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {t('similar.acceptingItems')}
                      </span>
                    </div>
                  )}

                  <div
                    className={`px-2 py-1 rounded-md text-[11px] font-bold text-center flex flex-col items-center justify-center min-w-[60px] ${
                      item.statusType === 'blue'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    <span className="text-[9px] font-medium opacity-80">{item.statusLabel}</span>
                    <span>{item.statusVal}</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default SimilarAuctionsSection;
