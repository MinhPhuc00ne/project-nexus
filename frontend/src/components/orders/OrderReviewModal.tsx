import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, CheckCircle2, AlertCircle, Loader2, Store, Package } from 'lucide-react';
import { formatCurrency } from '../../i18n/formatters';
import Popup from '../Popup';
import { submitProductReviewApi, submitShopReviewApi } from '../../services/reviews.service';
import type { BuyerOrder } from '../../services/orders';

interface OrderReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: BuyerOrder;
  onSuccess?: () => void;
}

export default function OrderReviewModal({
  isOpen,
  onClose,
  order,
  onSuccess,
}: OrderReviewModalProps) {
  const { t } = useTranslation('commerce');
  const items = Array.isArray(order.items) ? order.items : [];

  // Ratings for each product
  const [productRatings, setProductRatings] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    items.forEach((item) => {
      const pid = item.productId || item.product?.id || item.id;
      init[pid] = 5;
    });
    return init;
  });

  const [productComments, setProductComments] = useState<Record<string, string>>({});

  // Shop review
  const [shopRating, setShopRating] = useState<number>(5);
  const [shopComment, setShopComment] = useState<string>('');
  const [includeShop, setIncludeShop] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      // Gửi đánh giá cho từng sản phẩm trong đơn hàng
      for (const item of items) {
        const productId = item.productId || item.product?.id;
        if (!productId) continue;
        const rating = productRatings[productId] || 5;
        const comment = (productComments[productId] || '').trim();

        await submitProductReviewApi(order.id, productId, {
          rating,
          comment: comment || t('orders.reviewModal.defaultProductComment'),
        });
      }

      // Gửi đánh giá gian hàng nếu có chọn
      if (includeShop) {
        await submitShopReviewApi(order.id, {
          rating: shopRating,
          comment: shopComment.trim() || t('orders.reviewModal.defaultShopComment'),
        });
      }

      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('orders.reviewModal.submitFailed');
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <Popup
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
          <span>
            {t('orders.reviewModal.title', { code: order.orderNumber || order.id?.slice(0, 8) })}
          </span>
        </div>
      }
      size="lg"
    >
      {success ? (
        <div className="py-6 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              {t('orders.reviewModal.thankYouTitle')}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {t('orders.reviewModal.thankYouDesc')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
          >
            {t('orders.reviewModal.close')}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Danh sách sản phẩm trong đơn */}
          <div className="space-y-4">
            <h4 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-700">
              <Package size={14} className="text-blue-600" />
              <span>{t('orders.reviewModal.rateProductsTitle')}</span>
            </h4>

            {items.map((item) => {
              const pid = item.productId || item.product?.id || item.id;
              const title = item.product?.title || t('orders.reviewModal.defaultProductName');
              const firstImage = item.product?.images?.[0];
              const img =
                item.product?.thumbnail ||
                (typeof firstImage === 'string'
                  ? firstImage
                  : firstImage?.imageUrl || firstImage?.url) ||
                '/placeholder-product.png';
              const currentRating = productRatings[pid] || 5;

              return (
                <div
                  key={pid}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={img}
                      alt={title}
                      className="h-12 w-12 rounded-lg object-cover border border-slate-200"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900">{title}</p>
                      <p className="text-[11px] text-slate-500">
                        {formatCurrency(Number(item.unitPrice || item.subtotal || 0))} x{' '}
                        {item.quantity}
                      </p>
                    </div>
                  </div>

                  {/* Chọn sao */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">
                      {t('orders.reviewModal.ratingLabel')}
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setProductRatings((prev) => ({ ...prev, [pid]: star }))}
                          className="p-1 text-slate-300 hover:text-amber-400 transition cursor-pointer"
                        >
                          <Star
                            size={18}
                            className={
                              star <= currentRating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300'
                            }
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-bold text-amber-600 ml-1">
                      {t(
                        (
                          {
                            1: 'orders.reviewModal.rating1',
                            2: 'orders.reviewModal.rating2',
                            3: 'orders.reviewModal.rating3',
                            4: 'orders.reviewModal.rating4',
                            5: 'orders.reviewModal.rating5',
                          } as const
                        )[currentRating] ?? 'orders.reviewModal.rating5',
                      )}
                    </span>
                  </div>

                  {/* Nhận xét */}
                  <div>
                    <textarea
                      rows={2}
                      value={productComments[pid] || ''}
                      onChange={(e) =>
                        setProductComments((prev) => ({ ...prev, [pid]: e.target.value }))
                      }
                      placeholder={t('orders.reviewModal.productCommentPlaceholder')}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Đánh giá gian hàng (Shop) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeShop}
                  onChange={(e) => setIncludeShop(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <Store size={14} className="text-sky-600" />
                <span>{t('orders.reviewModal.rateShopLabel')}</span>
              </label>
            </div>

            {includeShop && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">
                    {t('orders.reviewModal.shopTrustLabel')}
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setShopRating(star)}
                        className="p-1 text-slate-300 hover:text-amber-400 transition cursor-pointer"
                      >
                        <Star
                          size={18}
                          className={
                            star <= shopRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={shopComment}
                  onChange={(e) => setShopComment(e.target.value)}
                  placeholder={t('orders.reviewModal.shopCommentPlaceholder')}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:outline-hidden"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              {t('orders.reviewModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>{t('orders.reviewModal.submitting')}</span>
                </>
              ) : (
                <span>{t('orders.reviewModal.submitNow')}</span>
              )}
            </button>
          </div>
        </form>
      )}
    </Popup>
  );
}
