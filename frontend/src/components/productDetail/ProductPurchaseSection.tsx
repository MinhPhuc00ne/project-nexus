import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ShoppingCart as ShoppingCartOutlined } from 'lucide-react';
import { Star, Tag, Heart } from 'lucide-react';
import type { ProductDetail } from '../../types/product.types';

export interface ProductPurchaseSectionProps {
  product: ProductDetail;
  quantity: number;
  onQuantityChange: (q: number) => void;
  canBuy: boolean;
  isSubmitting: boolean;
  onAddToCart: () => void;
  onBuyNow: () => void;
  isInWishlist: boolean;
  onToggleWishlist: () => void;
}

export const ProductPurchaseSection: React.FC<ProductPurchaseSectionProps> = ({
  product,
  quantity,
  onQuantityChange,
  canBuy,
  isSubmitting,
  onAddToCart,
  onBuyNow,
  isInWishlist,
  onToggleWishlist,
}) => {
  const { t } = useTranslation('commerce');
  return (
    <div className="space-y-6 lg:col-span-7">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
        {/* Rating summary under title */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
          {(product.reviewsCount ?? 0) > 0 ? (
            <div className="flex items-center gap-1 font-bold text-amber-500">
              <span className="underline">
                {product.rating ? product.rating.toFixed(1) : '0.0'}
              </span>
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={12}
                    className={
                      s <= Math.round(product.rating ?? 0)
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-slate-200 text-slate-200'
                    }
                  />
                ))}
              </div>
            </div>
          ) : (
            <span className="font-medium text-slate-400">{t('productPurchase.noReviews')}</span>
          )}
          <span className="text-slate-300">|</span>
          <span className="text-slate-600">
            <strong className="text-slate-900">{product.reviewsCount ?? 0}</strong>{' '}
            {t('productPurchase.reviewsLabel')}
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600">
            {t('productPurchase.soldLabel')}{' '}
            <strong className="text-slate-900">{product.soldCount ?? 0}</strong>
          </span>
        </div>
      </div>

      <p className={canBuy ? 'text-emerald-700' : 'text-slate-500'}>
        {canBuy
          ? t('productPurchase.inStock', { count: product.stock })
          : t('productPurchase.outOfStock')}
      </p>

      <p className="rounded-xl bg-blue-50 p-5 text-3xl font-bold text-blue-600">
        {product.formattedPrice}
      </p>

      <div className="flex items-center gap-2.5 text-sm">
        <span className="font-medium text-slate-500">{t('productPurchase.categoryLabel')}</span>
        {product.category?.id ? (
          <Link
            to={`/search?categoryId=${product.category.id}&categoryName=${encodeURIComponent(product.category.name)}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            <Tag size={13} />
            {product.category?.parent?.name
              ? `${product.category.parent.name} › ${product.category.name}`
              : product.categoryName || t('productPurchase.uncategorized')}
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Tag size={13} />
            {product.categoryName || t('productPurchase.uncategorized')}
          </span>
        )}
      </div>

      <label className="block space-y-2 text-sm font-medium text-slate-700">
        <span>{t('productPurchase.quantityLabel')}</span>
        <input
          type="number"
          min={1}
          max={product.stock}
          step={1}
          disabled={!canBuy || isSubmitting}
          value={quantity}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isInteger(next)) {
              onQuantityChange(Math.max(1, Math.min(product.stock, next)));
            }
          }}
          className="block w-28 rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100"
        />
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!canBuy || isSubmitting}
          onClick={onAddToCart}
          className="rounded-xl border border-blue-600 px-5 py-3 font-semibold text-blue-600 transition hover:bg-blue-50 disabled:opacity-40"
        >
          <ShoppingCartOutlined />{' '}
          {isSubmitting ? t('productPurchase.addingToCart') : t('productPurchase.addToCart')}
        </button>
        <button
          type="button"
          disabled={!canBuy || isSubmitting}
          onClick={onBuyNow}
          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-40"
        >
          {t('productPurchase.buyNow')}
        </button>
        <button
          type="button"
          onClick={onToggleWishlist}
          title={
            isInWishlist ? t('productPurchase.removeWishlist') : t('productPurchase.addWishlist')
          }
          aria-label={
            isInWishlist ? t('productPurchase.removeWishlist') : t('productPurchase.addWishlist')
          }
          className={`flex cursor-pointer items-center justify-center rounded-xl border p-3 transition ${
            isInWishlist
              ? 'border-rose-200 bg-rose-50 text-rose-600'
              : 'border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:text-rose-600'
          }`}
        >
          <Heart size={20} className={isInWishlist ? 'fill-rose-500 text-rose-500' : ''} />
        </button>
      </div>
    </div>
  );
};

export default ProductPurchaseSection;
