import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Flame, Store } from 'lucide-react';
import { formatCurrency } from '../../i18n/formatters';
import { getTrendingProductsApi, type TrendingProduct } from '../../services/products.service';
import { useToast } from '../ToastNotification';

export default function HomeTrendingProducts() {
  const { t, i18n } = useTranslation('guest');
  const toast = useToast();
  const [products, setProducts] = useState<TrendingProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getTrendingProductsApi(6)
      .then(({ items }) => {
        if (active) setProducts(items);
      })
      .catch((error: unknown) => {
        console.error('Unable to load Home trending products:', error);
        toast.error(t('home.trendingProducts.loadFailed'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [t, toast]);

  let content;
  if (loading) {
    content = (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="aspect-square animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  } else if (products.length === 0) {
    content = (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
        <Flame size={22} className="mx-auto mb-2 text-orange-400" />
        <p className="text-sm font-semibold text-slate-700">
          {t('home.trendingProducts.emptyTitle')}
        </p>
        <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-slate-500">
          {t('home.trendingProducts.emptyDescription')}
        </p>
        <Link
          to="/search"
          className="mt-4 inline-flex rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
        >
          {t('home.trendingProducts.explore')}
        </Link>
      </div>
    );
  } else {
    content = (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/product/${product.id}`}
            className="group min-w-0 overflow-hidden rounded-lg border border-slate-200 transition hover:border-orange-300 hover:shadow-sm"
          >
            <div className="relative aspect-square bg-slate-100">
              <img
                src={product.thumbnail || product.images[0] || '/placeholder-product.png'}
                alt={product.title}
                loading="lazy"
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-orange-600 px-2 py-1 text-[10px] font-bold text-white shadow-xs">
                <Flame size={10} />
                {t('home.trendingProducts.trendingBadge')}
              </span>
              <span className="absolute bottom-2 left-2 rounded-full bg-slate-900/75 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
                {t('home.trendingProducts.purchaseCount', { count: product.purchaseCount })}
              </span>
            </div>
            <div className="p-2.5">
              <p className="flex items-center gap-1 truncate text-[10px] font-medium text-slate-500">
                <Store size={11} className="shrink-0 text-slate-400" />
                <span className="truncate">
                  {product.shopName ||
                    product.seller?.fullName ||
                    t('home.trendingProducts.defaultShopName')}
                </span>
              </p>
              <p className="mt-1 line-clamp-2 min-h-8 text-[11px] font-semibold text-slate-800 group-hover:text-blue-600">
                {product.title}
              </p>
              <p className="mt-1 text-xs font-bold text-blue-700">
                {formatCurrency(product.salePrice ?? product.basePrice, i18n.language)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
            <Flame size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">{t('home.trendingProducts.title')}</h2>
            <p className="mt-1 text-[11px] text-slate-500">
              {t('home.trendingProducts.description')}
            </p>
          </div>
        </div>
        <Link
          to="/search?sortBy=trending"
          className="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          {t('home.trendingProducts.viewAll')}
        </Link>
      </div>

      {content}
    </section>
  );
}
