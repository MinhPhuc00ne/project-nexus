import type { HomeProduct } from './home.types';

export interface HomeAuctionCardProps {
  product: HomeProduct;
}

export function HomeAuctionCard({ product }: HomeAuctionCardProps) {
  const prodId =
    product.id === 1
      ? 'ap-tourbillon'
      : product.id === 2
        ? 'rolex-daytona'
        : product.id === 3
          ? 'hublot-unico'
          : 'patek-celestial';

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2 transition-[transform,box-shadow,border-color] duration-[180ms] ease-in-out hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgb(28_57_115_/_10%)] motion-reduce:transition-none motion-reduce:hover:transform-none">
      <a
        href={`/product/${prodId}`}
        className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-slate-100 block"
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full rounded-lg object-cover hover:scale-105 transition duration-300"
          />
        ) : (
          <span className="text-xs text-slate-400">Chưa có hình ảnh</span>
        )}
        <span className="absolute left-2 top-2 rounded bg-sky-500 px-2 py-1 text-[10px] font-bold text-white">
          3D MODEL
        </span>
        <button
          type="button"
          aria-label={`Xem mô hình ${product.name}`}
          className="absolute bottom-2 right-2 rounded-md border border-white/70 bg-slate-900/70 px-2.5 py-1.5 text-[10px] font-semibold text-white transition hover:bg-slate-900 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = '/auction';
          }}
        >
          Xem 3D
        </button>
      </a>

      <div className="p-2">
        <a href={`/product/${prodId}`}>
          <h3 className="text-xs font-bold text-slate-700 hover:text-[#f24e1e] transition">
            {product.name || 'Chưa có dữ liệu'}
          </h3>
        </a>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs font-extrabold text-sky-500">
            {product.price ? `${product.price.toLocaleString()} đ` : '--'}
          </span>

          <span className="text-[10px] text-slate-400">
            {product.sold ? `${product.sold} lượt bid` : '-- lượt bid'}
          </span>
        </div>
      </div>
    </div>
  );
}
