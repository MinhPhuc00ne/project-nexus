import { useState } from 'react';
import type { ProductDetail } from '../../types/product.types';

export default function ProductInfoTabs({ product }: { product: ProductDetail }) {
  const [tab, setTab] = useState('description');
  const tabs = [
    ['description', 'Mô tả sản phẩm'],
    ['specs', 'Thông số sản phẩm'],
    ['reviews', 'Đánh giá'],
  ];
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div
        className="flex flex-wrap gap-5 border-b border-slate-200 px-6"
        role="tablist"
        aria-label="Thông tin sản phẩm"
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
            className={`border-b-2 py-4 text-sm font-semibold ${tab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
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
          <p className="whitespace-pre-line">{product.description || 'Chưa có mô tả sản phẩm.'}</p>
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
            <p>Chưa có thông số sản phẩm.</p>
          ))}
        {tab === 'reviews' && <p>Chưa có dữ liệu đánh giá từ hệ thống.</p>}
      </div>
    </section>
  );
}
