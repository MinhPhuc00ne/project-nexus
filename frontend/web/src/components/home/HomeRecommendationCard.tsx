import React from 'react';
import { Heart, Star, Truck } from 'lucide-react';
import { addToCart } from '../../services/cart';
import type { HomeProduct } from './home.types';

export interface HomeRecommendationCardProps {
  product: HomeProduct;
}

export function HomeRecommendationCard({ product }: HomeRecommendationCardProps) {
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
        formattedPrice: product.price
          ? `${product.price.toLocaleString('vi-VN')} ₫`
          : '18.500.000 ₫',
        img: product.image || '/images/watches/watch-1.png',
        shopName: 'NEXUS Official Store',
      },
      1,
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-[transform,box-shadow,border-color] duration-[180ms] ease-in-out hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_10px_24px_rgb(28_57_115_/_10%)] motion-reduce:transition-none motion-reduce:hover:transform-none">
      <a
        href={`/product/${prodId}`}
        className="relative flex aspect-square items-center justify-center bg-slate-100 block"
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover hover:scale-105 transition duration-300"
          />
        ) : (
          <span className="text-xs text-slate-400">Chưa có hình ảnh</span>
        )}
        <span className="absolute left-2 top-2 rounded bg-[#f24e1e] px-2 py-1 text-[9px] font-bold text-white">
          {product.badge ||
            (typeof product.id === 'number' && product.id % 2 === 0 ? 'HOT' : 'MALL')}
        </span>
        <button
          type="button"
          aria-label={`Yêu thích ${product.name}`}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition hover:text-rose-500 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Heart size={16} />
        </button>
      </a>

      <div className="p-2.5 sm:p-3">
        <p className="truncate text-[10px] text-slate-500">
          Nexus Store · <span className="text-green-600">● Hoạt động</span>
        </p>

        <a href={`/product/${prodId}`}>
          <h3 className="mt-1 line-clamp-2 min-h-[34px] text-xs font-semibold text-slate-700 hover:text-[#f24e1e] transition">
            {product.name || 'Chưa có dữ liệu'}
          </h3>
        </a>

        <div className="mt-2 flex items-center gap-1 text-[10px]">
          <Star size={12} className="fill-yellow-400 text-yellow-400" />
          <span className="font-semibold text-slate-600">{product.rating ?? '--'}</span>
          <span className="text-slate-400">({product.sold ?? '--'} đã bán)</span>
        </div>

        <p className="mt-2 text-sm font-extrabold text-orange-500">
          {product.price ? `${product.price.toLocaleString()} đ` : '--'}
        </p>

        <p className="mt-2 flex items-center gap-1 text-[10px] text-green-600">
          <Truck size={12} /> Giao hàng nhanh toàn quốc
        </p>

        <button
          type="button"
          onClick={handleAdd}
          className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-[#f24e1e] cursor-pointer"
        >
          Thêm Giỏ
        </button>
      </div>
    </div>
  );
}
