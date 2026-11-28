import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  MessageCircle as MessageOutlined,
  ShieldCheck as SafetyCertificateOutlined,
  Star as StarFilled,
  Star as StarOutlined,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getIntlLocale } from '../../i18n/config';
import { useSellerSession } from '../../components/seller/SellerSession';
import SellerReviewReplyThread from '../../components/seller/SellerReviewReplyThread';
import { EmptyState, PageHeading, Panel } from '../../components/seller/SellerUI';
import {
  getSellerProductReviewsApi,
  getSellerShopReviewsApi,
  type ProductReviewItem,
  type ReviewSortBy,
  type ShopReviewItem,
} from '@/features/reviews/services/reviews.service';

type StarFilter = 'all' | 1 | 2 | 3 | 4 | 5;
type KindFilter = 'all' | 'PRODUCT' | 'SHOP';
type SellerReview = (ProductReviewItem | ShopReviewItem) & { kind: 'PRODUCT' | 'SHOP' };

const STAR_OPTIONS: StarFilter[] = ['all', 5, 4, 3, 2, 1];

export default function SellerReviewsPage() {
  const { t, i18n } = useTranslation('seller');
  const formatDate = (value: string): string =>
    new Date(value).toLocaleString(getIntlLocale(i18n.language));
  const user = useSellerSession();

  const [starFilter, setStarFilter] = useState<StarFilter>('all');
  const [sortBy, setSortBy] = useState<ReviewSortBy>('newest');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [summaryReviews, setSummaryReviews] = useState<SellerReview[]>([]);
  const [reviewCounts, setReviewCounts] = useState({ product: 0, shop: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const queryOptions = {
      rating: starFilter === 'all' ? undefined : starFilter,
      sortBy,
    };

    void Promise.allSettled([
      getSellerProductReviewsApi(1, 50, queryOptions),
      getSellerShopReviewsApi(1, 50, queryOptions),
    ])
      .then(([productResult, shopResult]) => {
        if (!active) return;
        if (productResult.status === 'rejected' && shopResult.status === 'rejected') {
          const firstErr = productResult.reason;
          setError(firstErr instanceof Error ? firstErr.message : t('reviews.loadFailed'));
          return;
        }

        setError(null);
        const productResponse = productResult.status === 'fulfilled' ? productResult.value : null;
        const shopResponse = shopResult.status === 'fulfilled' ? shopResult.value : null;

        const productReviews: SellerReview[] = Array.isArray(productResponse?.items)
          ? productResponse.items.map((review) => ({ ...review, kind: 'PRODUCT' as const }))
          : [];
        const shopReviews: SellerReview[] = Array.isArray(shopResponse?.items)
          ? shopResponse.items.map((review) => ({ ...review, kind: 'SHOP' as const }))
          : [];

        const merged = [...productReviews, ...shopReviews].sort((first, second) => {
          const diff = new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
          return sortBy === 'oldest' ? -diff : diff;
        });

        setReviews(merged);
        if (starFilter === 'all') {
          setSummaryReviews(merged);
          setReviewCounts({
            product: productResponse?.total ?? productReviews.length,
            shop: shopResponse?.stats?.totalReviews ?? shopResponse?.total ?? shopReviews.length,
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [starFilter, sortBy, t]);

  const statsSource = summaryReviews.length > 0 ? summaryReviews : reviews;

  const averageRating = useMemo(() => {
    if (!statsSource.length) return 0;
    return statsSource.reduce((total, review) => total + review.rating, 0) / statsSource.length;
  }, [statsSource]);

  const visibleReviews = useMemo(() => {
    if (kindFilter === 'all') return reviews;
    return reviews.filter((review) => review.kind === kindFilter);
  }, [reviews, kindFilter]);

  const canReply = user.isSellerActive && !user.isShopSuspended;

  return (
    <div className="flex min-w-0 flex-col gap-5" data-seller="page-stack">
      <PageHeading title={t('reviews.pageTitle')} description={t('reviews.pageDesc')} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title={t('reviews.productReviewsTitle')}
          subtitle={t('reviews.productReviewsSubtitle')}
        >
          <div className="flex items-center gap-5 rounded-xl border border-blue-100 bg-blue-50/60 p-5">
            <div className="text-center">
              <strong className="block text-4xl font-bold text-[#1c3973]">
                {averageRating ? averageRating.toFixed(1) : '—'}
                <small className="text-base text-slate-500">/5</small>
              </strong>
              <div className="mt-2 flex justify-center gap-1 text-blue-600">
                {[1, 2, 3, 4, 5].map((star) =>
                  star <= Math.round(averageRating) ? (
                    <StarFilled key={star} fill="currentColor" />
                  ) : (
                    <StarOutlined key={star} className="text-slate-300" />
                  ),
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {t('reviews.totalReviews', { count: statsSource.length })}
              </p>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = statsSource.filter(
                  (review) => Math.floor(review.rating) === star,
                ).length;
                const width = statsSource.length ? (count / statsSource.length) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="w-10">{t('reviews.starLabel', { star })}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                      <i
                        className="block h-full rounded-full bg-blue-600"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className="w-5 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>

        <Panel
          title={t('reviews.reputationTitle')}
          subtitle={t('reviews.reputationSubtitle')}
          action={
            <SafetyCertificateOutlined className="text-xl text-blue-600" aria-hidden="true" />
          }
        >
          <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5">
            <p className="text-xs font-medium text-slate-500">
              {t('reviews.reputationScoreLabel')}
            </p>
            <strong className="mt-1 block text-3xl text-[#1c3973]">
              {user.reputationScore} <small className="text-base text-slate-500">/ 100</small>
            </strong>
            <p className="mt-2 text-sm text-slate-600">
              {t(`reviews.trustLevels.${user.trustLevel}`, { defaultValue: user.trustLevel })}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-slate-500">{t('reviews.productReviewCount')}</p>
              <strong className="mt-1 block text-lg text-blue-700">{reviewCounts.product}</strong>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-slate-500">{t('reviews.shopReviewCount')}</p>
              <strong className="mt-1 block text-lg text-blue-700">{reviewCounts.shop}</strong>
            </div>
          </div>
          <p className="mt-4 text-xs leading-6 text-slate-500">{t('reviews.reputationNote')}</p>
        </Panel>
      </div>

      <Panel title={t('reviews.feedbackTitle')} subtitle={t('reviews.feedbackSubtitle')}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label={t('reviews.filterAllStars')}
          >
            {STAR_OPTIONS.map((option) => (
              <button
                key={String(option)}
                type="button"
                onClick={() => setStarFilter(option)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  starFilter === option
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                {option === 'all'
                  ? t('reviews.filterAllStars')
                  : t('reviews.filterStarOption', { star: option })}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label={t('reviews.typeAll')}
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as KindFilter)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-400 focus:outline-none"
            >
              <option value="all">{t('reviews.typeAll')}</option>
              <option value="PRODUCT">{t('reviews.typeProduct')}</option>
              <option value="SHOP">{t('reviews.typeShop')}</option>
            </select>

            <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <select
                aria-label={t('reviews.sortLabel')}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ReviewSortBy)}
                className="bg-transparent focus:outline-none"
              >
                <option value="newest">{t('reviews.sortNewest')}</option>
                <option value="oldest">{t('reviews.sortOldest')}</option>
              </select>
            </label>
          </div>
        </div>

        <ReviewsContent
          loading={loading}
          error={error}
          reviews={visibleReviews}
          formatDate={formatDate}
          canReply={canReply}
        />
      </Panel>
    </div>
  );
}

function ReviewsContent({
  loading,
  error,
  reviews,
  formatDate,
  canReply,
}: {
  loading: boolean;
  error: string | null;
  reviews: SellerReview[];
  formatDate: (val: string) => string;
  canReply: boolean;
}) {
  const { t } = useTranslation('seller');
  if (loading) {
    return <EmptyState title={t('reviews.loadingTitle')} description={t('reviews.loadingDesc')} />;
  }
  if (error) {
    return <EmptyState title={t('reviews.errorTitle')} description={error} />;
  }
  if (reviews.length === 0) {
    return <EmptyState title={t('reviews.emptyTitle')} description={t('reviews.emptyDesc')} />;
  }
  return (
    <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-4">
      {reviews.map((review) => {
        const productReview = review.kind === 'PRODUCT' ? (review as ProductReviewItem) : null;
        return (
          <article key={`${review.kind}-${review.id}`} className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="flex items-center gap-2 text-sm text-slate-800">
                <MessageOutlined className="text-blue-600" />
                {review.reviewer.fullName}
              </strong>
              <span
                className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                  review.kind === 'SHOP'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {review.kind === 'SHOP'
                  ? t('reviews.shopReviewBadge')
                  : t('reviews.productReviewBadge')}
              </span>
              <span className="text-sm font-semibold text-blue-700">
                {'★'.repeat(review.rating)}
                {'☆'.repeat(5 - review.rating)}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {review.comment || t('reviews.noComment')}
            </p>
            <p className="mt-2 text-xs text-slate-400">{formatDate(review.createdAt)}</p>

            <SellerReviewReplyThread
              reviewId={review.id}
              kind={review.kind === 'SHOP' ? 'shop' : 'product'}
              legacyReply={productReview?.sellerReply}
              legacyRepliedAt={productReview?.sellerRepliedAt}
              media={review.media}
              mediaUrls={review.mediaUrls}
              formatDate={formatDate}
              canReply={canReply}
            />
          </article>
        );
      })}
    </div>
  );
}
