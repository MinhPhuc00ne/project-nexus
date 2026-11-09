import { Link } from 'react-router-dom';
import type { HomeProduct } from './home.types';

export interface HomeFlashSaleCardProps {
  product: HomeProduct;
}

export function HomeFlashSaleCard({ product }: HomeFlashSaleCardProps) {
  const prodId =
    typeof product.id === 'string' && product.id.length > 5
      ? product.id
      : product.id === 1
        ? 'ap-tourbillon'
        : product.id === 2
          ? 'patek-celestial'
          : product.id === 3
            ? 'hublot-unico'
            : 'rolex-daytona';

  return (
    <Link
      to={`/product/${prodId}`}
      className="block overflow-hidden rounded-xl border border-slate-200 bg-white p-2 transition-[transform,box-shadow,border-color] duration-[180ms] ease-in-out hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgb(28_57_115_/_10%)] motion-reduce:transition-none motion-reduce:hover:transform-none"
    >
      <div className="relative aspect-square overflow-hidden rounded-lg border border-slate-300 bg-slate-900 p-1">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full rounded-md object-cover hover:scale-105 transition duration-300"
          />
        ) : (
          <span className="text-xs text-slate-400">Chưa có hình ảnh</span>
        )}
        {product.discount ? (
          <span className="absolute left-2 top-2 rounded bg-[#f24e1e] px-2 py-1 text-[10px] font-bold text-white shadow-sm">
            -{product.discount}%
          </span>
        ) : null}
      </div>

      <div className="px-1 pb-1 pt-2">
        <h3 className="truncate text-xs font-semibold text-slate-700 hover:text-[#f24e1e] transition">
          {product.name}
        </h3>

        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-sm font-extrabold text-[#f24e1e]">
            {product.price ? `${product.price.toLocaleString()} đ` : '--'}
          </p>
          {product.oldPrice ? (
            <p className="truncate text-[10px] text-slate-400 line-through">
              {product.oldPrice.toLocaleString()} đ
            </p>
          ) : null}
        </div>

        <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#f36a22]"
            style={{ width: `${Math.min(((product.saleSold ?? 0) / 50) * 100, 100)}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold leading-none text-white drop-shadow">
            ĐÃ BÁN {product.saleSold ?? 0}/50
          </span>
        </div>
      </div>
    </Link>
  );
}
