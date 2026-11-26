import React from 'react';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { getIntlLocale } from '../../i18n/config';
import type { ProductReviewItem } from '@/features/reviews/services/reviews.service';

export const ReviewItem: React.FC<{ rev: ProductReviewItem }> = ({ rev }) => {
  const { t, i18n } = useTranslation('guest');
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
              {rev.reviewer?.fullName || t('product.anonymousBuyer')}
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
          {rev.createdAt
            ? new Date(rev.createdAt).toLocaleDateString(getIntlLocale(i18n.language))
            : ''}
        </span>
      </div>

      <p className="text-xs text-slate-700 leading-relaxed pl-10.5">{rev.comment}</p>
    </div>
  );
};

export default ReviewItem;
