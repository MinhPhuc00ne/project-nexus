import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../i18n/formatters';
import type { CartDropdownItem } from '../../types/cart.types';

export type { CartDropdownItem };

interface CartDropdownPanelProps {
  isOpen: boolean;
  cartItems: CartDropdownItem[];
  onClose: () => void;
}

export const CartDropdownPanel: React.FC<CartDropdownPanelProps> = ({
  isOpen,
  cartItems,
  onClose,
}) => {
  const { t } = useTranslation('common');
  if (!isOpen) return null;

  return (
    <div className="animate-home-popover-enter motion-reduce:animate-none absolute right-0 top-[calc(100%+6px)] z-[1100] w-[380px] overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-[0_16px_40px_rgb(20_34_62_/_14%)]">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h4 className="m-0 text-sm font-bold text-slate-800">{t('header.cartTitle')}</h4>
        <span className="text-xs text-slate-500">
          {t('header.cartItemsCount', { count: cartItems.length })}
        </span>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {cartItems.length > 0 ? (
          cartItems.map((item) => {
            const match = item.name.match(/\s*\((.*?)\)$/);
            const cleanTitle = match ? item.name.replace(/\s*\([^)]*\)$/, '').trim() : item.name;
            const effectiveSelections: Record<string, string> = { ...(item.selections || {}) };
            if (Object.keys(effectiveSelections).length === 0 && match && match[1]) {
              const parts = match[1].split(/,\s*/);
              for (const part of parts) {
                const [k, v] = part.split(/:\s*/);
                if (k && v) effectiveSelections[k.trim()] = v.trim();
              }
            }
            const hasSelections = Object.keys(effectiveSelections).length > 0;

            return (
              <Link
                key={item.id}
                to={`/product/${item.id}`}
                className="flex gap-3 border-b border-slate-100 px-4 py-3 hover:bg-slate-50 transition"
                onClick={onClose}
              >
                {item.img && (
                  <img
                    src={item.img}
                    alt={item.name}
                    className="h-[52px] w-[52px] shrink-0 rounded-md border border-slate-200 object-cover p-0.5 bg-white"
                  />
                )}

                <div className="min-w-0 flex-1">
                  <h5 className="mb-0.5 line-clamp-2 text-[13px] font-semibold text-slate-800 hover:text-[#f24e1e]">
                    {cleanTitle}
                  </h5>

                  {hasSelections && (
                    <p className="text-[11px] text-slate-400 truncate mb-1">
                      {Object.entries(effectiveSelections)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' • ')}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-[#f24e1e]">
                      {typeof item.price === 'number' ? formatCurrency(item.price) : item.price}
                    </span>
                    {item.qty && (
                      <span className="text-xs text-slate-400 font-medium">x{item.qty}</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="p-6 text-center text-[13px] text-slate-400">{t('header.emptyCart')}</div>
        )}
      </div>

      {cartItems.length > 0 && (
        <div className="p-3 border-t border-slate-100 bg-slate-50">
          <Link
            to="/cart"
            className="block w-full py-2.5 px-4 rounded-xl bg-[#f24e1e] hover:bg-[#d63b0e] text-white text-center font-bold text-xs shadow-md transition"
            onClick={onClose}
          >
            {t('header.checkoutCart')}
          </Link>
        </div>
      )}
    </div>
  );
};

export default CartDropdownPanel;
