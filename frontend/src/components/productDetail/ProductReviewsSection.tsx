import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Star,
  MessageSquare,
  CheckCircle,
  ShieldCheck,
  AlertCircle,
  Store,
  Trash2,
} from 'lucide-react';
import {
  deleteBuyerProductReviewApi,
  deleteBuyerShopReviewApi,
  getShopReviewsApi,
  getProductReviewsApi,
  saveBuyerProductReviewApi,
  saveBuyerShopReviewApi,
  type ShopReviewItem,
  type ProductReviewItem,
} from '@/features/reviews/services/reviews.service';
import { getBuyerOrdersApi } from '@/features/orders/services/orders';
import { getStoredToken, getStoredUser } from '@/features/auth/services/auth';
import { getBuyerReviewEligibility } from '../../utils/buyerReviewEligibility';
import ReviewItem from './ReviewItem';
import { useToast } from '../ToastNotification';

interface ProductReviewsSectionProps {
  productId: string;
  productTitle?: string;
  sellerId?: string;
  shopName?: string;
  productRating?: number;
  reviewsCount?: number;
}

function getReviewSubmitErrorMessage(
  rating: number,
  isAuthenticated: boolean,
  orderId: string | null,
  hasLoadError: boolean,
  messages: {
    selectStar: string;
    login: string;
    orderRequired: string;
    loadFailed: string;
  },
): string | null {
  if (rating === 0) return messages.selectStar;
  if (!isAuthenticated) return messages.login;
  if (!orderId) return messages.orderRequired;
  if (hasLoadError) return messages.loadFailed;
  return null;
}

function buildReviewSuccessMessage(
  updatedExistingReview: boolean,
  includeShopReview: boolean,
  canReviewShop: boolean,
  sellerId: string | undefined,
  t: TFunction<'guest'>,
): string {
  if (updatedExistingReview) return t('product.reviewUpdatedSuccess');
  if (includeShopReview && canReviewShop && sellerId) {
    return t('product.reviewProductAndShopSuccess');
  }
  return t('product.reviewProductSuccess');
}

function getReviewEligibilityMessage(
  params: {
    loadingReviewEligibility: boolean;
    reviewEligibilityError: boolean;
    hasToken: boolean;
    reviewableOrderId: string | null;
    sellerId?: string;
    canReviewShop: boolean;
  },
  t: TFunction<'guest'>,
): string | null {
  if (params.loadingReviewEligibility) return t('product.checkingReviewEligibility');
  if (params.reviewEligibilityError) return t('product.reviewEligibilityUnavailable');
  if (!params.hasToken) return t('product.loginToReviewError');
  if (!params.reviewableOrderId) return t('product.completedOrderRequired');
  if (params.sellerId && !params.canReviewShop) return t('product.shopReviewRequiresTwoProducts');
  return null;
}

function getSubmitReviewLabel(
  isSubmitting: boolean,
  hasOwnProductReview: boolean,
  t: TFunction<'guest'>,
): string {
  if (isSubmitting) return t('product.submittingReview');
  if (hasOwnProductReview) return t('product.updateReview');
  return t('product.submitReviewButton');
}

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({
  productId,
  sellerId,
  shopName,
  productRating = 0,
  reviewsCount = 0,
}) => {
  const { t } = useTranslation('guest');
  const toast = useToast();
  const [reviews, setReviews] = useState<ProductReviewItem[]>([]);
  const [ownProductReview, setOwnProductReview] = useState<ProductReviewItem | null>(null);
  const [ownShopReview, setOwnShopReview] = useState<ShopReviewItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewLoadError, setReviewLoadError] = useState(false);
  const [userRating, setUserRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [shopRating, setShopRating] = useState<number>(5);
  const [includeShopReview, setIncludeShopReview] = useState<boolean>(true);
  const [shopComment, setShopComment] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reviewableOrderId, setReviewableOrderId] = useState<string | null>(null);
  const [reviewableOrderIds, setReviewableOrderIds] = useState<string[]>([]);
  const [reviewableShopOrderIds, setReviewableShopOrderIds] = useState<string[]>([]);
  const [canReviewShop, setCanReviewShop] = useState(false);
  const [loadingReviewEligibility, setLoadingReviewEligibility] = useState(false);
  const [reviewEligibilityError, setReviewEligibilityError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const userId = getStoredUser()?.id;
    Promise.all([
      getProductReviewsApi(productId, 1, 100),
      sellerId ? getShopReviewsApi(sellerId, 1, 100) : Promise.resolve(null),
    ])
      .then(([productResponse, shopResponse]) => {
        if (!isMounted) return;
        const productReviews = Array.isArray(productResponse?.items) ? productResponse.items : [];
        const buyerProductReview =
          productReviews.find((review) => review.reviewer?.id === userId) ?? null;
        const buyerShopReview =
          shopResponse?.items?.find((review) => review.reviewer?.id === userId) ?? null;
        setReviews(productReviews);
        setOwnProductReview(buyerProductReview);
        setOwnShopReview(buyerShopReview);
        if (buyerProductReview) {
          setUserRating(buyerProductReview.rating);
          setComment(buyerProductReview.comment || '');
        }
        if (buyerShopReview) {
          setShopRating(buyerShopReview.rating);
          setShopComment(buyerShopReview.comment || '');
        }
      })
      .catch((error: unknown) => {
        console.error('Unable to load reviews:', error);
        if (isMounted) setReviewLoadError(true);
        toast.error(t('product.reviewsLoadFailed'));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [productId, sellerId, t, toast]);

  useEffect(() => {
    let isMounted = true;
    setReviewableOrderId(null);
    setReviewableOrderIds([]);
    setReviewableShopOrderIds([]);
    setCanReviewShop(false);
    setReviewEligibilityError(false);
    if (!getStoredToken()) {
      setLoadingReviewEligibility(false);
      return () => {
        isMounted = false;
      };
    }

    setLoadingReviewEligibility(true);
    getBuyerOrdersApi()
      .then((orders) => {
        if (!isMounted) return;
        const eligibility = getBuyerReviewEligibility(orders, productId, sellerId);
        setReviewableOrderId(eligibility.productOrderId ?? null);
        setReviewableOrderIds(eligibility.productOrderIds);
        setReviewableShopOrderIds(eligibility.shopOrderIds);
        setCanReviewShop(eligibility.canReviewShop);
      })
      .catch((error) => {
        console.warn('Unable to verify Buyer review eligibility:', error);
        if (isMounted) setReviewEligibilityError(true);
      })
      .finally(() => {
        if (isMounted) setLoadingReviewEligibility(false);
      });

    return () => {
      isMounted = false;
    };
  }, [productId, sellerId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || isSubmitting) return;

    const validationError = getReviewSubmitErrorMessage(
      userRating,
      Boolean(getStoredToken()),
      reviewableOrderId,
      reviewLoadError,
      {
        selectStar: t('product.selectStarError'),
        login: t('product.loginToReviewError'),
        orderRequired: t('product.completedOrderRequired'),
        loadFailed: t('product.reviewsLoadFailed'),
      },
    );
    if (validationError) {
      setErrorMsg(validationError);
      toast.error(validationError);
      return;
    }

    if (!reviewableOrderId) return;
    setIsSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const productReviewData = { rating: userRating, comment: comment.trim() };
      await saveBuyerProductReviewApi(
        Boolean(ownProductReview),
        reviewableOrderId,
        reviewableOrderIds,
        productId,
        productReviewData,
      );

      if (includeShopReview && canReviewShop && sellerId) {
        await saveBuyerShopReviewApi(
          Boolean(ownShopReview),
          reviewableOrderId,
          reviewableShopOrderIds,
          {
            rating: shopRating,
            comment: shopComment.trim() || comment.trim(),
          },
        );
      }

      const updatedExistingReview = Boolean(
        ownProductReview || (includeShopReview && ownShopReview),
      );
      const successMessage = buildReviewSuccessMessage(
        updatedExistingReview,
        includeShopReview,
        canReviewShop,
        sellerId,
        t,
      );
      setSuccessMsg(successMessage);
      toast.success(successMessage);
      setTimeout(() => setSuccessMsg(null), 4000);

      const [refreshed, refreshedShop] = await Promise.all([
        getProductReviewsApi(productId, 1, 100),
        sellerId ? getShopReviewsApi(sellerId, 1, 100) : Promise.resolve(null),
      ]);
      const currentUserId = getStoredUser()?.id;
      const productReviews = Array.isArray(refreshed?.items) ? refreshed.items : [];
      setReviewLoadError(false);
      setReviews(productReviews);
      setOwnProductReview(
        productReviews.find((review) => review.reviewer?.id === currentUserId) ?? null,
      );
      setOwnShopReview(
        refreshedShop?.items?.find((review) => review.reviewer?.id === currentUserId) ?? null,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('product.submitReviewFailed');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOwnReview = async (kind: 'product' | 'shop') => {
    if (!window.confirm(t('product.confirmDeleteReview'))) return;
    setIsSubmitting(true);
    try {
      if (kind === 'product') {
        await deleteBuyerProductReviewApi(reviewableOrderIds, productId);
        setOwnProductReview(null);
        setComment('');
        setUserRating(5);
      } else {
        await deleteBuyerShopReviewApi(reviewableShopOrderIds);
        setOwnShopReview(null);
        setShopComment('');
        setShopRating(5);
      }

      toast.success(t('product.reviewDeletedSuccess'));
      setSuccessMsg(t('product.reviewDeletedSuccess'));
      const [refreshed, refreshedShop] = await Promise.all([
        getProductReviewsApi(productId, 1, 100),
        sellerId ? getShopReviewsApi(sellerId, 1, 100) : Promise.resolve(null),
      ]);
      const currentUserId = getStoredUser()?.id;
      const productReviews = Array.isArray(refreshed?.items) ? refreshed.items : [];
      setReviews(productReviews);
      setOwnProductReview(
        productReviews.find((review) => review.reviewer?.id === currentUserId) ?? null,
      );
      setOwnShopReview(
        refreshedShop?.items?.find((review) => review.reviewer?.id === currentUserId) ?? null,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('product.reviewDeleteFailed');
      toast.error(message);
      setErrorMsg(message);
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
  const reviewEligibilityMessage = getReviewEligibilityMessage(
    {
      loadingReviewEligibility,
      reviewEligibilityError,
      hasToken: Boolean(getStoredToken()),
      reviewableOrderId,
      sellerId,
      canReviewShop,
    },
    t,
  );
  const submitReviewLabel = getSubmitReviewLabel(isSubmitting, Boolean(ownProductReview), t);
  let reviewListContent;
  if (loading) {
    reviewListContent = (
      <p className="text-xs text-slate-400 italic">{t('product.loadingReviews')}</p>
    );
  } else if (reviews.length === 0) {
    reviewListContent = (
      <p className="text-xs text-slate-500 py-4 text-center">{t('product.emptyReviews')}</p>
    );
  } else {
    reviewListContent = (
      <div className="divide-y divide-slate-100">
        {reviews.map((rev) => (
          <ReviewItem key={rev.id} rev={rev} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Rating Summary Header (Blue & White Theme) */}
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

      {/* 2. Product + Shop Review Submission Form for Buyer */}
      <form
        onSubmit={handleSubmitReview}
        className="p-5 rounded-lg border border-slate-200 bg-white shadow-xs space-y-4"
      >
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare size={16} className="text-blue-600" />
          {t(ownProductReview ? 'product.editReviewHeading' : 'product.submitReviewHeading')}
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

          {sellerId && canReviewShop && (
            <div className="rounded-md border border-blue-100 bg-blue-50/40 p-3 space-y-2">
              <label className="flex items-center justify-between text-xs font-semibold text-[#1c3973] cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <Store size={14} className="text-blue-600" />
                  {t(ownShopReview ? 'product.editShopReview' : 'product.rateShopService', {
                    shop: shopName || 'Shop',
                  })}
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

        {reviewEligibilityMessage && (
          <p
            className={`text-[11px] ${reviewEligibilityError ? 'text-rose-600' : 'text-slate-500'}`}
          >
            {reviewEligibilityMessage}
          </p>
        )}
        {reviewLoadError && (
          <p className="text-[11px] text-rose-600">{t('product.reviewsLoadFailed')}</p>
        )}

        {sellerId && canReviewShop && includeShopReview && (
          <input
            type="text"
            value={shopComment}
            onChange={(e) => setShopComment(e.target.value)}
            placeholder={t('product.shopReviewPlaceholder')}
            className="w-full text-xs px-3 py-2.5 rounded-md border border-slate-300 bg-white text-slate-800 focus:border-blue-600 focus:outline-none"
          />
        )}

        <div className="flex justify-end">
          <div className="flex flex-wrap justify-end gap-2">
            {ownProductReview && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleDeleteOwnReview('product')}
                className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 px-4 py-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
              >
                <Trash2 size={13} />
                {t('product.deleteReview')}
              </button>
            )}
            {ownShopReview && includeShopReview && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleDeleteOwnReview('shop')}
                className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 px-4 py-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
              >
                <Trash2 size={13} />
                {t('product.deleteShopReview')}
              </button>
            )}
            <button
              type="submit"
              disabled={
                isSubmitting ||
                loading ||
                reviewLoadError ||
                !comment.trim() ||
                loadingReviewEligibility ||
                !reviewableOrderId
              }
              className="px-5 py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition disabled:opacity-40 cursor-pointer"
            >
              {submitReviewLabel}
            </button>
          </div>
        </div>
      </form>

      {/* 3. Review List & Seller Replies */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-slate-900">
          {t('product.customerReviewsHeading', { count: reviews.length })}
        </h4>

        {reviewListContent}
      </div>
    </div>
  );
};

export default ProductReviewsSection;
