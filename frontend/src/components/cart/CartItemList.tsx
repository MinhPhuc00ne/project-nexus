import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trash2, Minus, Plus, ShieldCheck, AlertTriangle, Store } from 'lucide-react';
import { formatCurrency } from '../../i18n/formatters';
import type { CartItem } from '@/features/cart/types/cart.types';

interface CartItemListProps {
  items: CartItem[];
  isAllSelected: boolean;
  onToggleSelectAll: (checked: boolean) => void;
  onToggleSelectItem: (id: string | number) => void;
  onUpdateQty: (id: string | number, qty: number) => void;
  onRemoveItem: (id: string | number) => void;
}

export function CartItemList({
  items,
  isAllSelected,
  onToggleSelectAll,
  onToggleSelectItem,
  onUpdateQty,
  onRemoveItem,
}: CartItemListProps) {
  const { t } = useTranslation('commerce');
  const selectedCount = items.filter((item) => item.selected).length;
  return (
    <div className="min-w-0 space-y-4">
      <div className="nexus-panel flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <label className="flex min-h-6 cursor-pointer items-center gap-3 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(node) => {
              if (node) node.indeterminate = selectedCount > 0 && !isAllSelected;
            }}
            onChange={(event) => onToggleSelectAll(event.target.checked)}
            className="size-4 shrink-0 rounded accent-primary"
          />
          {t('cart.selectAll', { count: items.length })}
        </label>
        <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-primary">
          {t('cart.selectedItems', { count: selectedCount })}
        </span>
      </div>

      {items.map((item) => {
        const targetUrl = `/product/${item.productId || item.id}`;
        const match = item.name.match(/\s*\((.*?)\)$/);
        const cleanTitle = match ? item.name.replace(/\s*\([^)]*\)$/, '').trim() : item.name;
        const selections = { ...(item.selections || {}) };
        if (Object.keys(selections).length === 0 && match?.[1]) {
          for (const part of match[1].split(/,\s*/)) {
            const [key, value] = part.split(/:\s*/);
            if (key && value) selections[key.trim()] = value.trim();
          }
        }
        return (
          <article
            key={item.id}
            aria-label={cleanTitle}
            className={`nexus-panel min-w-0 p-4 transition-colors sm:p-5 ${item.selected ? 'border-blue-200' : ''} ${item.isOutOfStock ? 'bg-rose-50/30' : ''}`}
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <input
                type="checkbox"
                checked={Boolean(item.selected)}
                disabled={Boolean(item.isOutOfStock && !item.selected)}
                aria-label={t('cart.selectItem', { name: cleanTitle })}
                onChange={() => onToggleSelectItem(item.id)}
                className="mt-2 size-4 shrink-0 rounded accent-primary disabled:opacity-40"
              />
              <Link
                to={targetUrl}
                className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-slate-50 p-2 sm:size-24"
              >
                <img
                  src={item.img}
                  alt={cleanTitle}
                  loading="lazy"
                  className="size-full object-contain"
                />
              </Link>
              <div className="min-w-0 flex-1 space-y-2">
                {item.shopName && (
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    <Store size={13} className="shrink-0" />
                    <span className="truncate">{item.shopName}</span>
                  </p>
                )}
                <Link
                  to={targetUrl}
                  className="block text-sm font-semibold leading-relaxed text-ink hover:text-primary sm:text-base"
                >
                  {cleanTitle}
                </Link>
                {Object.keys(selections).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(selections).map(([key, value]) => (
                      <span
                        key={key}
                        className="rounded-md bg-slate-100 px-2 py-1 text-xs text-muted"
                      >
                        {key}: <span className="font-medium text-slate-700">{value}</span>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  <span className="text-xs text-muted">{t('cart.unitPrice')}</span>
                  <span className="font-semibold text-ink">
                    {formatCurrency(Number(item.price))}
                  </span>
                  {item.hasPriceChanged && item.priceAtAdded !== undefined && (
                    <span className="text-xs text-slate-400 line-through">
                      {formatCurrency(Number(item.priceAtAdded))}
                    </span>
                  )}
                </div>
                {item.isOutOfStock && (
                  <span className="inline-flex rounded-md bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700">
                    {t('cart.outOfStockBadge')}
                  </span>
                )}
                {!item.isOutOfStock && item.isStockInsufficient && (
                  <span className="inline-flex rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                    {t('cart.lowStockBadge', { count: item.availableQty })}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-medium text-muted">{t('cart.quantity')}</span>
                <div
                  role="group"
                  aria-label={t('cart.quantityFor', { name: cleanTitle })}
                  className="inline-flex items-center overflow-hidden rounded-xl border border-line bg-white"
                >
                  <button
                    type="button"
                    aria-label={t('cart.decreaseQuantity', { name: cleanTitle })}
                    disabled={item.qty <= 1 || item.isOutOfStock}
                    onClick={() => onUpdateQty(item.id, item.qty - 1)}
                    className="grid size-10 place-items-center text-slate-600 transition hover:bg-blue-50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Minus size={15} />
                  </button>
                  <span
                    aria-live="polite"
                    className="min-w-9 px-1 text-center text-sm font-semibold tabular-nums text-ink"
                  >
                    {item.qty}
                  </span>
                  <button
                    type="button"
                    aria-label={t('cart.increaseQuantity', { name: cleanTitle })}
                    disabled={
                      item.isOutOfStock ||
                      (item.availableQty !== undefined && item.qty >= item.availableQty)
                    }
                    onClick={() => onUpdateQty(item.id, item.qty + 1)}
                    className="grid size-10 place-items-center text-slate-600 transition hover:bg-blue-50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-3 sm:gap-5">
                <div className="text-right">
                  <p className="text-xs text-muted">{t('cart.amount')}</p>
                  <p className="mt-1 text-base font-semibold tabular-nums text-ink sm:text-lg">
                    {formatCurrency(Number(item.price * item.qty))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  aria-label={t('cart.removeItem', { name: cleanTitle })}
                  className="grid size-10 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
            {item.hasPriceChanged && (
              <div
                role="status"
                className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800"
              >
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                {t('cart.priceChanged', {
                  from: formatCurrency(Number(item.priceAtAdded)),
                  to: formatCurrency(Number(item.price)),
                })}
              </div>
            )}
          </article>
        );
      })}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5">
        <ShieldCheck size={22} className="mt-0.5 shrink-0 text-primary" />
        <div>
          <h2 className="text-sm font-semibold text-ink">{t('cart.escrowBannerTitle')}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">{t('cart.escrowBannerDesc')}</p>
        </div>
      </div>
    </div>
  );
}

export default CartItemList;
