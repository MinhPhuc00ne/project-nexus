import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, MessageSquare, CheckCircle, ShieldCheck, AlertCircle, Store } from 'lucide-react';
import {
  getProductReviewsApi,
  submitProductReviewApi,
  submitShopReviewApi,
  type ProductReviewItem,
} from '../../services/reviews.service';
import { getBuyerOrdersApi } from '../../services/orders';
import { getStoredToken } from '../../services/auth';
import ReviewItem from './ReviewItem';

interface ProductReviewsSectionProps {
  productId: string;
  productTitle?: string;
  sellerId?: string;
  shopName?: string;
  productRating?: number;
  reviewsCount?: number;
}

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({
  productId,
  sellerId,
  shopName,
  productRating = 0,
  reviewsCount = 0,
}) => {
  const { t } = useTranslation('guest');
  const [reviews, setReviews] = useState<ProductReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [shopRating, setShopRating] = useState<number>(5);
  const [includeShopReview, setIncludeShopReview] = useState<boolean>(true);
  const [shopComment, setShopComment] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getProductReviewsApi(productId)
      .then((res) => {
        if (isMounted) setReviews(Array.isArray(res?.items) ? res.items : []);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [productId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || isSubmitting) return;

    if (userRating === 0) {
      setErrorMsg(t('product.selectStarError'));
      return;
    }

    if (!getStoredToken()) {
      setErrorMsg(t('product.loginToReviewError'));
      return;
    }

    setIsSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      let confirmedOrderId: string | undefined;
      try {
        const orders = await getBuyerOrdersApi();
        const safeOrders = Array.isArray(orders) ? orders : [];
        const confirmedOrder = safeOrders.find(
          (o) =>
            (o?.status === 'CONFIRMED' || o?.status === 'COMPLETED' || o?.status === 'DELIVERED') &&
            o?.items?.some(
              (item) => item?.productId === productId || item?.product?.id === productId,
            ),
        );
        confirmedOrderId = confirmedOrder?.id;
      } catch {
        // Ignore order lookup failure
      }

      if (!confirmedOrderId) {
        throw new Error(t('product.completedOrderRequired'));
      }

      await submitProductReviewApi(confirmedOrderId, productId, {
        rating: userRating,
        comment: comment.trim(),
      });

      if (includeShopReview && sellerId) {
        await submitShopReviewApi(confirmedOrderId, {
          rating: shopRating,
          comment: shopComment.trim() || comment.trim(),
        });
      }

      setComment('');
      setShopComment('');
      setUserRating(5);
      setShopRating(5);
      setSuccessMsg(
        includeShopReview && sellerId
          ? t('product.reviewProductAndShopSuccess')
          : t('product.reviewProductSuccess'),
      );
      setTimeout(() => setSuccessMsg(null), 4000);

      const refreshed = await getProductReviewsApi(productId);
      setReviews(Array.isArray(refreshed?.items) ? refreshed.items : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('product.submitReviewFailed');
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasReviews = reviews.length > 0;
  const currentRatingNumber = hasReviews
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : productRating;

  const currentDisplayRating = currentRatingNumber > 0 ? currentRatingNumber.toFixed(1) : '0.0';
  const totalReviewsCount = hasReviews ? reviews.length : reviewsCount;

  return (
    <div className="space-y-6">
      {/* 1. Header tóm tắt Rating (Blue & White Theme) */}
      <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-lg bg-blue-50/60 border border-blue-200">
        <div className="text-center sm:text-left sm:pr-8 sm:border-r border-blue-200">
          <div className="text-3xl font-extrabold text-[#1c3973] tracking-tight">
            {currentDisplayRating} <span className="text-base font-bold text-slate-500">/ 5.0</span>
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-1 mt-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={16}
                className={
                  currentRatingNumber > 0 && s <= Math.round(currentRatingNumber)
                    ? 'fill-blue-600 text-blue-600'
                    : 'text-slate-300'
                }
              />
            ))}
          </div>
          <p className="text-xs font-semibold text-slate-600 mt-1">
            {totalReviewsCount > 0
              ? t('product.actualReviewsCount', { count: totalReviewsCount })
              : t('product.noReviewsAtAll')}
          </p>
        </div>
        <div className="text-xs text-slate-600 space-y-1">
          <p className="font-bold text-[#1c3973] flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-blue-600" />
            {t('product.reviewsSyncedTitle')}
          </p>
          <p className="text-slate-600 leading-relaxed">{t('product.reviewsSyncedDesc')}</p>
        </div>
      </div>

      {/* 2. Form gửi đánh giá Sản phẩm + Đánh giá Shop cho Buyer */}
      <form
        onSubmit={handleSubmitReview}
        className="p-5 rounded-lg border border-slate-200 bg-white shadow-xs space-y-4"
      >
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare size={16} className="text-blue-600" />
          {t('product.submitReviewHeading')}
        </h4>

        {successMsg && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-md text-xs font-semibold flex items-center gap-2">
            <CheckCircle size={16} className="text-blue-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3 space-y-2">
            <span className="block text-xs font-semibold text-slate-700">
              {t('product.rateProductQuality')}
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setUserRating(star)}
                  className="p-1 focus:outline-none cursor-pointer"
                >
                  <Star
                    size={19}
                    className={`transition ${
                      (hoverRating || userRating) >= star
                        ? 'fill-blue-600 text-blue-600'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-bold text-blue-700 ml-1.5">
                {t('product.starsOutOfFive', { rating: hoverRating || userRating })}
              </span>
            </div>
          </div>

          {sellerId && (
            <div className="rounded-md border border-blue-100 bg-blue-50/40 p-3 space-y-2">
              <label className="flex items-center justify-between text-xs font-semibold text-[#1c3973] cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <Store size={14} className="text-blue-600" />
                  {t('product.rateShopService', { shop: shopName || 'Shop' })}
                </span>
                <input
                  type="checkbox"
                  checked={includeShopReview}
                  onChange={(e) => setIncludeShopReview(e.target.checked)}
                  className="accent-blue-600"
                />
              </label>
              {includeShopReview && (
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setShopRating(star)}
                      className="p-1 focus:outline-none cursor-pointer"
                    >
                      <Star
                        size={19}
                        className={`transition ${
                          shopRating >= star ? 'fill-blue-600 text-blue-600' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-blue-700 ml-1.5">
                    {t('product.starsOutOfFive', { rating: shopRating })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <textarea
          rows={3}
          required
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('product.reviewPlaceholder')}
          className="w-full text-xs p-3 rounded-md border border-slate-300 bg-white text-slate-800 focus:border-blue-600 focus:outline-none"
        />

        {sellerId && includeShopReview && (
          <input
            type="text"
            value={shopComment}
            onChange={(e) => setShopComment(e.target.value)}
            placeholder={t('product.shopReviewPlaceholder')}
            className="w-full text-xs px-3 py-2.5 rounded-md border border-slate-300 bg-white text-slate-800 focus:border-blue-600 focus:outline-none"
          />
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !comment.trim()}
            className="px-5 py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition disabled:opacity-40 cursor-pointer"
          >
            {isSubmitting ? t('product.submittingReview') : t('product.submitReviewButton')}
          </button>
        </div>
      </form>

      {/* 3. Danh sách đánh giá & Phản hồi của Seller */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-slate-900">
          {t('product.customerReviewsHeading', { count: reviews.length })}
        </h4>

        {loading ? (
          <p className="text-xs text-slate-400 italic">{t('product.loadingReviews')}</p>
        ) : reviews.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">{t('product.emptyReviews')}</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {reviews.map((rev) => (
              <ReviewItem key={rev.id} rev={rev} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductReviewsSection;
