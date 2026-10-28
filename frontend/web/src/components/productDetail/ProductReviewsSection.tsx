import React, { useEffect, useState } from 'react';
import { Star, MessageSquare, CheckCircle, ShieldCheck, AlertCircle } from 'lucide-react';
import {
  getProductReviewsApi,
  submitProductReviewApi,
  type ProductReviewItem,
} from '../../services/reviews.service';
import { getBuyerOrdersApi } from '../../services/orders';
import { getStoredToken } from '../../services/auth';
import ReviewItem from './ReviewItem';

interface ProductReviewsSectionProps {
  productId: string;
  productRating?: number;
  reviewsCount?: number;
}

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({
  productId,
  productRating = 0,
  reviewsCount = 0,
}) => {
  const [reviews, setReviews] = useState<ProductReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Clear any legacy client-side mock review keys
    try {
      localStorage.removeItem(`nexus:local-product-reviews:${productId}`);
    } catch {
      // Ignore
    }

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
      setErrorMsg('Vui lòng chọn số sao đánh giá (từ 1 đến 5 sao).');
      return;
    }

    if (!getStoredToken()) {
      setErrorMsg('Vui lòng đăng nhập để gửi đánh giá cho sản phẩm.');
      return;
    }

    setIsSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      // Check if user has purchased this product
      const orders = await getBuyerOrdersApi();
      const safeOrders = Array.isArray(orders) ? orders : [];
      const confirmedOrder = safeOrders.find(
        (o) =>
          (o?.status === 'CONFIRMED' || o?.status === 'COMPLETED' || o?.status === 'DELIVERED') &&
          o?.items?.some(
            (item) => item?.productId === productId || item?.product?.id === productId,
          ),
      );

      if (!confirmedOrder) {
        setErrorMsg(
          'Chỉ người mua đã hoàn tất đơn hàng đối với sản phẩm này mới có thể gửi đánh giá.',
        );
        return;
      }

      await submitProductReviewApi(productId, {
        rating: userRating,
        comment: comment.trim(),
        orderId: confirmedOrder.id,
      });

      setComment('');
      setUserRating(0);
      setSuccessMsg('Đánh giá của bạn đã được ghi nhận vào hệ thống thành công!');
      setTimeout(() => setSuccessMsg(null), 4000);

      // Reload fresh reviews from server
      const refreshed = await getProductReviewsApi(productId);
      setReviews(Array.isArray(refreshed?.items) ? refreshed.items : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi đánh giá lúc này.';
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
    <div className="space-y-8">
      {/* 1. Header tóm tắt Rating */}
      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-gradient-to-r from-amber-50/60 to-orange-50/40 border border-amber-100">
        <div className="text-center sm:text-left sm:pr-8 sm:border-r border-amber-200">
          <div className="text-4xl font-extrabold text-amber-600 tracking-tight">
            {currentDisplayRating} <span className="text-lg font-bold text-slate-500">/ 5.0</span>
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-1 mt-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={18}
                className={
                  currentRatingNumber > 0 && s <= Math.round(currentRatingNumber)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-300'
                }
              />
            ))}
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            {totalReviewsCount > 0
              ? `${totalReviewsCount} lượt đánh giá thực tế`
              : 'Chưa có đánh giá nào'}
          </p>
        </div>
        <div className="text-xs text-slate-600 space-y-1">
          <p className="font-bold text-slate-800 flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-emerald-600" />
            Đánh giá xác thực 100% từ người mua hàng NEXUS
          </p>
          <p className="text-slate-500 leading-relaxed">
            Mỗi đánh giá phản ánh trải nghiệm thực tế về sản phẩm, đóng gói và dịch vụ giao vận.
            Người bán có thể phản hồi trực tiếp để hỗ trợ quý khách.
          </p>
        </div>
      </div>

      {/* 2. Form gửi đánh giá cho Buyer */}
      <form
        onSubmit={handleSubmitReview}
        className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4"
      >
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare size={16} className="text-blue-600" />
          Viết đánh giá của bạn cho sản phẩm này
        </h4>

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Đánh giá số sao:</span>
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
                  size={20}
                  className={`transition ${
                    (hoverRating || userRating) >= star
                      ? 'fill-amber-400 text-amber-400 scale-110'
                      : 'text-slate-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <span className="text-xs font-semibold text-amber-600 ml-1">
            {(hoverRating || userRating) > 0
              ? `${hoverRating || userRating} sao`
              : '0 sao (Chưa chọn)'}
          </span>
        </div>

        <textarea
          rows={3}
          required
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Chia sẻ cảm nhận của bạn về chất lượng sản phẩm, độ sắc nét 3D, quy cách đóng gói và thời gian giao hàng..."
          className="w-full text-xs p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:bg-white focus:border-blue-600 focus:outline-none"
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !comment.trim()}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-40 cursor-pointer"
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi Đánh Giá'}
          </button>
        </div>
      </form>

      {/* 3. Danh sách đánh giá & Phản hồi của Seller */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-slate-900">
          Nhận xét từ khách hàng ({reviews.length})
        </h4>

        {loading ? (
          <p className="text-xs text-slate-400 italic">Đang tải các đánh giá...</p>
        ) : reviews.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên mua và đánh giá!
          </p>
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
