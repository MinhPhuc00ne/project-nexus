import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, Star, Truck } from 'lucide-react';
import { formatCurrency } from '../../i18n/formatters';
import { addToCart } from '@/features/cart/services/cart';
import type { HomeProduct } from './home.types';

export interface HomeRecommendationCardProps {
  product: HomeProduct;
}

export function HomeRecommendationCard({ product }: HomeRecommendationCardProps) {
  const { t } = useTranslation('guest');
  const prodId = String(product.id);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(
      {
        id: prodId,
        productId: prodId,
        name: product.name,
        price: product.price || 18500000,
        formattedPrice: formatCurrency(product.price || 18500000),
        img:
          product.image ||
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
        shopName: 'NEXUS Official Store',
      },
      1,
    );
  };

  return (
    <div className="overflow-hidden nexus-product-card">
      <Link
        to={`/product/${prodId}`}
        className="relative flex aspect-square items-center justify-center bg-slate-100 block"
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover hover:scale-105 transition duration-300"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';
            }}
          />
        ) : (
          <span className="text-xs text-slate-400">{t('home.recommendationCard.noImage')}</span>
        )}
        <span className="absolute left-2 top-2 rounded bg-[var(--color-primary)] px-2 py-1 text-[9px] font-bold text-white">
          {product.badge ||
            (typeof product.id === 'number' && product.id % 2 === 0 ? 'HOT' : 'MALL')}
        </span>
        <button
          type="button"
          aria-label={t('home.recommendationCard.favoriteAria', { name: product.name })}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition hover:text-rose-500 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Heart size={16} />
        </button>
      </Link>

      <div className="p-2.5 sm:p-3">
        <p className="truncate text-[10px] text-slate-500">
          Nexus Store ·{' '}
          <span className="text-green-600">● {t('home.recommendationCard.active')}</span>
        </p>

        <Link to={`/product/${prodId}`}>
          <h3 className="mt-1 line-clamp-2 min-h-[34px] text-xs font-semibold text-slate-700 hover:text-[var(--color-primary)] transition">
            {product.name || t('home.recommendationCard.noData')}
          </h3>
        </Link>

        <div className="mt-2 flex items-center gap-1 text-[10px]">
          <Star size={12} className="fill-yellow-400 text-yellow-400" />
          <span className="font-semibold text-slate-600">{product.rating ?? '--'}</span>
          <span className="text-slate-400">
            {t('home.recommendationCard.soldCount', { count: product.sold ?? '--' })}
          </span>
        </div>

        <p className="mt-2 text-sm font-extrabold text-primary">
          {product.price ? formatCurrency(product.price) : '--'}
        </p>

        <p className="mt-2 flex items-center gap-1 text-[10px] text-green-600">
          <Truck size={12} /> {t('home.recommendationCard.fastShipping')}
        </p>

        <button
          type="button"
          onClick={handleAdd}
          className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[var(--color-primary)] cursor-pointer"
        >
          {t('home.recommendationCard.addToCart')}
        </button>
      </div>
    </div>
  );
}
