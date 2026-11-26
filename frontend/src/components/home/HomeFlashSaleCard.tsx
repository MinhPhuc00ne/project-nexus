import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../i18n/formatters';
import type { HomeProduct } from './home.types';

export interface HomeFlashSaleCardProps {
  product: HomeProduct;
}

export function HomeFlashSaleCard({ product }: HomeFlashSaleCardProps) {
  const { t } = useTranslation('guest');
  // The card used to translate ids 1 to 4 into slugs like `ap-tourbillon`,
  // because the section was filled with four hardcoded products. It shows real
  // ones now, so the link is the product's own id.
  return (
    <Link
      to={`/product/${encodeURIComponent(String(product.id))}`}
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
          <span className="text-xs text-slate-400">{t('home.flashSale.noImage')}</span>
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
            {product.price ? formatCurrency(product.price) : '--'}
          </p>
          {product.oldPrice ? (
            <p className="truncate text-[10px] text-slate-400 line-through">
              {formatCurrency(product.oldPrice)}
            </p>
          ) : null}
        </div>

        {/* How many have sold, when that is known. This was a progress bar
            against a stock of 50 that nothing reported, filled from a "sold"
            count derived from the card's position in the list. */}
        {typeof product.sold === 'number' && product.sold > 0 && (
          <p className="mt-2 text-[10px] font-semibold text-slate-500">
            {t('home.flashSale.soldCount', { count: product.sold })}
          </p>
        )}
      </div>
    </Link>
  );
}
