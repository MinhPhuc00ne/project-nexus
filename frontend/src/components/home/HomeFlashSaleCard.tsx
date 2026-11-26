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
      className="block overflow-hidden nexus-product-card p-2.5"
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
          <span className="absolute left-2 top-2 rounded bg-[var(--color-primary)] px-2 py-1 text-[10px] font-bold text-white shadow-sm">
            -{product.discount}%
          </span>
        ) : null}
      </div>

      <div className="px-1 pb-1 pt-2">
        <h3 className="truncate text-xs font-semibold text-slate-700 hover:text-[var(--color-primary)] transition">
          {product.name}
        </h3>

        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-sm font-extrabold text-[var(--color-primary)]">
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
