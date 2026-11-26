import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getIntlLocale } from '../../i18n/config';
import {
  Star,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Store,
} from 'lucide-react';
import {
  getShopReviewsApi,
  type ShopReviewItem,
} from '@/features/reviews/services/reviews.service';
import type { ShopListItem } from '@/features/catalog/services/products.service';

interface ShopReviewsSectionProps {
  shop: ShopListItem;
}

export const ShopReviewsSection: React.FC<ShopReviewsSectionProps> = ({ shop }) => {
  const { t, i18n } = useTranslation('guest');
  const [reviews, setReviews] = useState<ShopReviewItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [selectedStar, setSelectedStar] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getShopReviewsApi(shop.id, page, 10)
      .then((res) => {
        if (isMounted) {
          setReviews(Array.isArray(res?.items) ? res.items : []);
          setTotal(res?.total || 0);
        }
      })
      .catch((err) => {
        console.warn('Không thể tải đánh giá gian hàng:', err);
        if (isMounted) {
          setReviews([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [shop.id, page]);

  const filteredReviews = selectedStar ? reviews.filter((r) => r.rating === selectedStar) : reviews;

  // Tính điểm trung bình từ danh sách
  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1)
      : '5.0';

  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <section className="max-w-screen-2xl mx-auto px-6 py-8">
      {/* Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col items-center justify-center shrink-0">
              <span className="text-2xl font-black text-amber-600">{averageRating}</span>
              <div className="flex items-center text-amber-500">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>{t('shop.reviewsHeading')}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {t('shop.reputationScore')} {shop.reputationScore}/100
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">{t('shop.reviewsSubtitle', { total })}</p>
            </div>
          </div>

          {/* Quick Filter Star Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedStar(null)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                selectedStar === null
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {t('shop.filterAll', { count: total })}
            </button>
            {[5, 4, 3, 2, 1].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setSelectedStar(star === selectedStar ? null : star)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  selectedStar === star
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{star}</span>
                <Star
                  className={`w-3.5 h-3.5 ${selectedStar === star ? 'fill-white' : 'fill-amber-400 text-amber-400'}`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Info Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 text-xs text-slate-600">
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl">
            <Store className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <p className="font-semibold text-slate-900">{t('shop.highlightEscrowTitle')}</p>
              <p className="text-[11px] text-slate-400">{t('shop.highlightEscrowDesc')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-slate-900">{t('shop.highlightInspectTitle')}</p>
              <p className="text-[11px] text-slate-400">{t('shop.highlightInspectDesc')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl">
            <MessageSquare className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <p className="font-semibold text-slate-900">{t('shop.highlightSupportTitle')}</p>
              <p className="text-[11px] text-slate-400">{t('shop.highlightSupportDesc')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h4 className="text-sm font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100 flex items-center justify-between">
          <span>{t('product.customerReviewsHeading', { count: filteredReviews.length })}</span>
          {selectedStar && (
            <span className="text-xs text-blue-600 font-medium">
              {t('shop.filteringByStars', { stars: selectedStar })}
            </span>
          )}
        </h4>

        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
            <span className="text-xs">{t('shop.loadingReviews')}</span>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-slate-600">{t('shop.emptyReviewsTitle')}</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm">{t('shop.emptyReviewsDesc')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredReviews.map((rev) => (
              <div key={rev.id} className="py-4 first:pt-0 last:pb-0 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-extrabold shrink-0 overflow-hidden">
                  {rev.reviewer?.avatarUrl ? (
                    <img
                      src={rev.reviewer.avatarUrl}
                      alt={rev.reviewer.fullName || t('shop.customerFallback')}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{(rev.reviewer?.fullName || 'U').charAt(0).toUpperCase()}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {rev.reviewer?.fullName || t('product.anonymousBuyer')}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {t('shop.verifiedPurchase')}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {rev.createdAt
                        ? new Date(rev.createdAt).toLocaleDateString(getIntlLocale(i18n.language), {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 my-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>

                  {rev.comment && (
                    <p className="text-xs text-slate-700 leading-relaxed mt-1 whitespace-pre-line">
                      {rev.comment}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-6 border-t border-slate-100 mt-6">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-xs font-semibold text-slate-600">
              {t('shop.pageOf', { page, totalPages })}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ShopReviewsSection;
