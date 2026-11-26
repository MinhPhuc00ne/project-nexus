import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProductDetail } from '@/features/catalog/types/product.types';
import ProductReviewsSection from './ProductReviewsSection';

export default function ProductInfoTabs({ product }: { product: ProductDetail }) {
  const { t } = useTranslation('guest');
  const [tab, setTab] = useState('description');
  const tabs = [
    ['description', t('product.tabDescription')],
    ['specs', t('product.tabSpecs')],
    ['reviews', t('product.tabReviews')],
  ];
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
      <div
        className="flex flex-wrap gap-5 border-b border-slate-200 px-6"
        role="tablist"
        aria-label={t('product.tabsAria')}
      >
        {tabs.map(([id, label]) => (
          <button
            key={id}
            id={`product-tab-${id}`}
            type="button"
            role="tab"
            aria-controls={`product-panel-${id}`}
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`border-b-2 py-4 text-sm font-semibold cursor-pointer ${
              tab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        id={`product-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`product-tab-${tab}`}
        className="p-6 text-sm leading-7 text-slate-700"
      >
        {tab === 'description' && (
          <p className="whitespace-pre-line">{product.description || t('product.noDescription')}</p>
        )}
        {tab === 'specs' &&
          (Object.keys(product.specs).length ? (
            <dl className="divide-y divide-slate-100">
              {Object.entries(product.specs).map(([key, value]) => (
                <div key={key} className="grid grid-cols-2 gap-4 py-3">
                  <dt className="font-semibold">{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>{t('product.noSpecs')}</p>
          ))}
        {tab === 'reviews' && (
          <ProductReviewsSection
            productId={product.id}
            productTitle={product.name}
            sellerId={product.shop?.id}
            shopName={product.shop?.name}
            productRating={product.rating}
            reviewsCount={product.reviewsCount}
          />
        )}
      </div>
    </section>
  );
}
