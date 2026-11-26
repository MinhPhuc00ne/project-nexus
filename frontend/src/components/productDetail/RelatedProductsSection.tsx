import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Image as PictureOutlined } from 'lucide-react';
import { getRelatedProducts } from '@/features/catalog/services/products.service';
import useProductResource from './useProductResource';

export default function RelatedProductsSection({ currentProductId }: { currentProductId: string }) {
  const { t } = useTranslation('guest');
  const load = useCallback(() => getRelatedProducts(currentProductId), [currentProductId]);
  const { data: products, loading, error, retry } = useProductResource(load);
  return (
    <section className="pb-12">
      <h2 className="mb-5 text-lg font-bold text-slate-900">{t('product.relatedTitle')}</h2>
      {loading ? (
        <p role="status" className="text-sm text-slate-500">
          {t('product.loadingProduct')}
        </p>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-red-100 bg-white p-4 text-sm">
          <p>{error}</p>
          <button type="button" onClick={retry} className="mt-2 text-blue-600">
            {t('product.retry')}
          </button>
        </div>
      ) : !products?.length ? (
        <p className="text-sm text-slate-500">{t('product.relatedEmpty')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-blue-400"
            >
              <div className="flex aspect-square items-center justify-center bg-slate-50 p-4">
                {product.images[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <PictureOutlined className="text-3xl text-slate-300" />
                )}
              </div>
              <div className="space-y-2 p-4">
                <h3 className="line-clamp-2 text-sm font-semibold text-slate-800">
                  {product.name}
                </h3>
                <p className="text-sm font-bold text-blue-600">{product.formattedPrice}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
