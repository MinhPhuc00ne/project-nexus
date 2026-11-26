import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import CartItemList from '../CartItemList';
import type { CartItem } from '@/features/cart/types/cart.types';

const item: CartItem = {
  id: 'cart-1',
  productId: 'product-1',
  name: 'Demo Watch',
  price: 250000,
  formattedPrice: '',
  qty: 1,
  img: '/watch.png',
  selected: true,
  availableQty: 3,
  selections: { Color: 'Blue' },
};

function renderItems(overrides: Partial<CartItem> = {}) {
  const onUpdateQty = vi.fn();
  const onRemoveItem = vi.fn();
  const onToggleSelectItem = vi.fn();
  const onToggleSelectAll = vi.fn();
  render(
    <MemoryRouter>
      <CartItemList
        items={[{ ...item, ...overrides }]}
        isAllSelected={Boolean(overrides.selected ?? item.selected)}
        onUpdateQty={onUpdateQty}
        onRemoveItem={onRemoveItem}
        onToggleSelectItem={onToggleSelectItem}
        onToggleSelectAll={onToggleSelectAll}
      />
    </MemoryRouter>,
  );
  return { onUpdateQty, onRemoveItem, onToggleSelectItem, onToggleSelectAll };
}

const quantityLabel = (key: 'increaseQuantity' | 'decreaseQuantity') =>
  i18n.t(`commerce:cart.${key}`, { name: item.name });

describe('cart item controls', () => {
  it('prevents reducing quantity below one and forwards a valid increment', () => {
    const { onUpdateQty } = renderItems();
    expect(screen.getByRole('button', { name: quantityLabel('decreaseQuantity') })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: quantityLabel('increaseQuantity') }));
    expect(onUpdateQty).toHaveBeenCalledWith(item.id, 2);
    expect(screen.getByText('Blue')).toBeInTheDocument();
  });

  it('prevents increasing past inventory while allowing quantity reduction', () => {
    const { onUpdateQty } = renderItems({ qty: 3 });
    expect(screen.getByRole('button', { name: quantityLabel('increaseQuantity') })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: quantityLabel('decreaseQuantity') }));
    expect(onUpdateQty).toHaveBeenCalledWith(item.id, 2);
  });

  it('allows a selected unavailable item to be deselected or removed', () => {
    const { onToggleSelectItem, onRemoveItem } = renderItems({ isOutOfStock: true });
    const row = screen.getByRole('article', { name: item.name });
    fireEvent.click(within(row).getByRole('checkbox'));
    expect(onToggleSelectItem).toHaveBeenCalledWith(item.id);
    fireEvent.click(
      within(row).getByRole('button', {
        name: i18n.t('commerce:cart.removeItem', { name: item.name }),
      }),
    );
    expect(onRemoveItem).toHaveBeenCalledWith(item.id);
    expect(
      within(row).getByRole('button', { name: quantityLabel('increaseQuantity') }),
    ).toBeDisabled();
  });
});
