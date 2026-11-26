import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import CartPage from '../CartPage';
import { fetchCart, getCartItems } from '@/features/cart/services/cart';
import type { CartItem } from '@/features/cart/types/cart.types';

vi.mock('@/features/cart/services/cart', () => ({
  getCartItems: vi.fn(),
  fetchCart: vi.fn(),
  updateCartQty: vi.fn(),
  removeFromCart: vi.fn(),
  toggleSelectItem: vi.fn(),
  toggleSelectAll: vi.fn(),
}));
vi.mock('@/features/auth/services/auth', () => ({ getStoredToken: () => null }));
vi.mock('@/features/account/services/address', () => ({ getAddresses: vi.fn() }));
vi.mock('@/features/orders/services/orders', () => ({ getCheckoutQuoteApi: vi.fn() }));
vi.mock('../../../components/ToastNotification', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));
vi.mock('../../../components/cart/CheckoutModal', () => ({ default: () => null }));

describe('cart loading states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCartItems).mockReturnValue([]);
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows loading instead of claiming the cart is empty before the response arrives', async () => {
    let finish!: (items: CartItem[]) => void;
    vi.mocked(fetchCart).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('status')).toHaveTextContent(i18n.t('commerce:cart.loading'));
    expect(screen.queryByText(i18n.t('commerce:cart.empty'))).not.toBeInTheDocument();
    finish([]);
    expect(await screen.findByText(i18n.t('commerce:cart.empty'))).toBeVisible();
  });

  it('offers a forced retry when loading fails without showing a false empty state', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fetchCart)
      .mockRejectedValueOnce(new Error('Connection unavailable'))
      .mockResolvedValueOnce([]);
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('commerce:cart.loadFailed'));
    expect(screen.queryByText(i18n.t('commerce:cart.empty'))).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('common:actions.retry') }));
    expect(await screen.findByText(i18n.t('commerce:cart.empty'))).toBeVisible();
    expect(fetchCart).toHaveBeenLastCalledWith({ force: true });
  });
});
