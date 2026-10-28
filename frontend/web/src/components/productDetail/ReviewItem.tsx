import React from 'react';
import { Star } from 'lucide-react';
import type { ProductReviewItem } from '../../services/reviews.service';

export const ReviewItem: React.FC<{ rev: ProductReviewItem }> = ({ rev }) => {
  return (
    <div className="py-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center font-bold text-xs text-slate-600">
            {rev.reviewer?.avatarUrl ? (
              <img
                src={rev.reviewer.avatarUrl}
                alt={rev.reviewer.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              (rev.reviewer?.fullName || 'B').charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">
              {rev.reviewer?.fullName || 'Người mua ẩn danh'}
            </p>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={12}
                  className={
                    s <= (rev.rating ?? 0)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-200 fill-slate-200'
                  }
                />
              ))}
            </div>
          </div>
        </div>
        <span className="text-[11px] text-slate-400">
          {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('vi-VN') : ''}
        </span>
      </div>

      <p className="text-xs text-slate-700 leading-relaxed pl-10.5">{rev.comment}</p>

      {rev.sellerResponse && (
        <div className="ml-10 mt-2 p-3.5 bg-slate-50 border-l-2 border-blue-500 rounded-r-xl space-y-1">
          <p className="text-xs font-bold text-blue-700">
            Phản hồi từ {rev.sellerResponse.shopName}:
          </p>
          <p className="text-xs text-slate-600">{rev.sellerResponse.comment}</p>
          <p className="text-[10px] text-slate-400">
            {rev.sellerResponse.respondedAt
              ? new Date(rev.sellerResponse.respondedAt).toLocaleDateString('vi-VN')
              : ''}
          </p>
        </div>
      )}
    </div>
  );
};

export default ReviewItem;
