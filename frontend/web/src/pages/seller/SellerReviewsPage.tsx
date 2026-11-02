import { useEffect, useMemo, useState } from 'react';
import {
  MessageOutlined,
  SafetyCertificateOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import { useSellerSession } from '../../components/seller/SellerSession';
import { EmptyState, PageHeading, Panel } from '../../components/seller/SellerUI';
import { trustLabels } from '../../components/seller/sellerData';
import {
  getSellerProductReviewsApi,
  type ProductReviewItem,
} from '../../services/reviews.service';

type ReviewTab = 'all' | 'positive' | 'improve';

function formatDate(value: string): string {
  return new Date(value).toLocaleString('vi-VN');
}

export default function SellerReviewsPage() {
  const user = useSellerSession();
  const [tab, setTab] = useState<ReviewTab>('all');
  const [reviews, setReviews] = useState<ProductReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getSellerProductReviewsApi()
      .then((response) => {
        if (active) setReviews(Array.isArray(response.items) ? response.items : []);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Không thể tải đánh giá từ máy chủ.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const averageRating = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((total, review) => total + review.rating, 0) / reviews.length;
  }, [reviews]);

  const visibleReviews = useMemo(() => {
    if (tab === 'positive') return reviews.filter((review) => review.rating >= 4);
    if (tab === 'improve') return reviews.filter((review) => review.rating <= 3);
    return reviews;
  }, [reviews, tab]);

  const tabs: Array<{ key: ReviewTab; label: string }> = [
    { key: 'all', label: `Tất cả (${reviews.length})` },
    { key: 'positive', label: `Tích cực (${reviews.filter((review) => review.rating >= 4).length})` },
    { key: 'improve', label: `Cần cải thiện (${reviews.filter((review) => review.rating <= 3).length})` },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-5" data-seller="page-stack">
      <PageHeading
        title="Đánh giá & khách hàng"
        description="Theo dõi đánh giá sản phẩm thật từ người mua sau khi đơn hàng hoàn tất."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Đánh giá sản phẩm" subtitle="Tổng hợp phản hồi từ người mua">
          <div className="flex items-center gap-5 rounded-xl border border-blue-100 bg-blue-50/60 p-5">
            <div className="text-center">
              <strong className="block text-4xl font-bold text-[#1c3973]">
                {averageRating ? averageRating.toFixed(1) : '—'}
                <small className="text-base text-slate-500">/5</small>
              </strong>
              <div className="mt-2 flex justify-center gap-1 text-blue-600">
                {[1, 2, 3, 4, 5].map((star) =>
                  star <= Math.round(averageRating) ? (
                    <StarFilled key={star} />
                  ) : (
                    <StarOutlined key={star} className="text-slate-300" />
                  ),
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">{reviews.length} đánh giá</p>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviews.filter((review) => review.rating === star).length;
                const width = reviews.length ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="w-10">{star} sao</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                      <i className="block h-full rounded-full bg-blue-600" style={{ width: `${width}%` }} />
                    </div>
                    <span className="w-5 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>

        <Panel
          title="Uy tín người bán"
          subtitle="Thông tin từ tài khoản của bạn"
          action={<SafetyCertificateOutlined className="text-xl text-blue-600" aria-hidden="true" />}
        >
          <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5">
            <p className="text-xs font-medium text-slate-500">ĐIỂM UY TÍN</p>
            <strong className="mt-1 block text-3xl text-[#1c3973]">
              {user.reputationScore} <small className="text-base text-slate-500">/ 100</small>
            </strong>
            <p className="mt-2 text-sm text-slate-600">
              {trustLabels[user.trustLevel] || user.trustLevel}
            </p>
          </div>
          <p className="mt-4 text-xs leading-6 text-slate-500">
            API hiện chỉ hỗ trợ nhận đánh giá sản phẩm. Chức năng phản hồi đánh giá sẽ được mở khi
            Backend bổ sung endpoint tương ứng.
          </p>
        </Panel>
      </div>

      <Panel title="Phản hồi từ khách hàng" subtitle="Dữ liệu lấy từ GET /seller/product-reviews">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                tab === item.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <EmptyState title="Đang tải đánh giá" description="Đang lấy phản hồi từ hệ thống." />
        ) : error ? (
          <EmptyState title="Không thể tải đánh giá" description={error} />
        ) : visibleReviews.length === 0 ? (
          <EmptyState
            title="Chưa có phản hồi trong mục này"
            description="Đánh giá hợp lệ từ người mua sẽ hiển thị tại đây."
          />
        ) : (
          <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-4">
            {visibleReviews.map((review) => (
              <article key={review.id} className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="flex items-center gap-2 text-sm text-slate-800">
                    <MessageOutlined className="text-blue-600" />
                    {review.reviewer.fullName}
                  </strong>
                  <span className="text-sm font-semibold text-blue-700">
                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {review.comment || 'Người mua không để lại nội dung.'}
                </p>
                <p className="mt-2 text-xs text-slate-400">{formatDate(review.createdAt)}</p>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
