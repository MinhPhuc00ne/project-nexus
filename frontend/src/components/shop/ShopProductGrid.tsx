import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, Eye, Search, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '../../i18n/formatters';
import type { CatalogProduct } from '@/features/catalog/services/products.service';

interface ShopProductGridProps {
  products: CatalogProduct[];
  totalProducts: number;
  search: string;
  onSearchChange: (value: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onAddToCart: (product: CatalogProduct, e: React.MouseEvent) => void;
}

export const ShopProductGrid: React.FC<ShopProductGridProps> = ({
  products,
  totalProducts,
  search,
  onSearchChange,
  page,
  totalPages,
  onPageChange,
  onAddToCart,
}) => {
  const { t } = useTranslation('guest');
  return (
    <main className="storefront-container py-6 sm:py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink">{t('shop.gridTitle')}</h2>
          <p className="text-xs text-muted mt-1">{t('shop.gridSubtitle')}</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <label className="relative block sm:w-72">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t('shop.productSearchPlaceholder')}
              aria-label={t('shop.productSearchPlaceholder')}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
          <span className="text-xs font-semibold text-slate-400 sm:text-right">
            {t('shop.gridShowing', { shown: products.length, total: totalProducts })}
          </span>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-sm">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-ink mb-1">
            {search ? t('shop.searchEmptyTitle') : t('shop.gridEmptyTitle')}
          </h3>
          <p className="text-xs text-muted mb-6">
            {search ? t('shop.searchEmptyDesc', { search }) : t('shop.gridEmptyDesc')}
          </p>
          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition"
            >
              {t('shop.clearProductSearch')}
            </button>
          ) : (
            <Link
              to="/search"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition"
            >
              {t('shop.exploreOtherProducts')}
            </Link>
          )}
        </div>
      ) : (
        <div className="storefront-product-grid">
          {products.map((product) => (
            <div
              key={product.id}
              className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
            >
              <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                <img
                  src={
                    product.thumbnail ||
                    product.images[0] ||
                    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'
                  }
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';
                  }}
                />
                {product.threeModelKey && (
                  <span className="absolute top-3 left-3 bg-blue-600/90 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    3D Model
                  </span>
                )}
              </div>

              <div className="p-4 flex flex-col flex-1">
                {product.category && (
                  <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-1">
                    {product.category.name}
                  </span>
                )}
                <Link
                  to={`/product/${product.id}`}
                  className="text-sm font-semibold text-ink group-hover:text-blue-600 transition line-clamp-2 mb-2"
                >
                  {product.title}
                </Link>

                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      {t('shop.listedPrice')}
                    </span>
                    <span className="text-base font-semibold text-blue-600">
                      {formatCurrency(product.basePrice)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/product/${product.id}`}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                      title={t('shop.viewDetails')}
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => onAddToCart(product, e)}
                      className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm"
                      title={t('shop.addToCartShort')}
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12 pt-6 border-t border-slate-200">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {t('shop.prevPage')}
          </button>
          <span className="text-xs font-semibold text-muted px-3">
            {t('shop.pageOf', { page, totalPages })}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {t('shop.nextPage')}
          </button>
        </div>
      )}
    </main>
  );
};

export default ShopProductGrid;
