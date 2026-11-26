import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import CartOrderSummary from '../CartOrderSummary';

function renderSummary(selected = true) {
  const onApplyVoucher = vi.fn();
  const onProceedCheckout = vi.fn();
  render(
    <CartOrderSummary
      selectedItems={
        selected
          ? [
              {
                id: 'cart-1',
                name: 'Watch',
                price: 250000,
                formattedPrice: '',
                qty: 2,
                img: '',
                selected: true,
              },
            ]
          : []
      }
      rawSubtotal={selected ? 500000 : 0}
      grandTotal={selected ? 500000 : 0}
      shippingFee={null}
      isQuotingShipping={false}
      shippingQuoteFailed={false}
      hasDeliveryAddress={false}
      appliedVoucher={null}
      onApplyVoucher={onApplyVoucher}
      onRemoveVoucher={vi.fn()}
      onProceedCheckout={onProceedCheckout}
    />,
  );
  return { onApplyVoucher, onProceedCheckout };
}

describe('cart summary interactions', () => {
  it('keeps checkout unavailable until an item is selected', () => {
    const { onProceedCheckout } = renderSummary(false);
    const checkout = screen.getByRole('button', {
      name: i18n.t('commerce:cart.proceedCheckoutCount', { count: 0 }),
    });
    expect(checkout).toBeDisabled();
    fireEvent.click(checkout);
    expect(onProceedCheckout).not.toHaveBeenCalled();
  });

  it('normalizes voucher input and displays invalid-code feedback', () => {
    const { onApplyVoucher } = renderSummary();
    const input = screen.getByRole('textbox', { name: i18n.t('commerce:cart.voucherTitle') });
    const apply = screen.getByRole('button', { name: i18n.t('commerce:cart.applyVoucher') });
    fireEvent.change(input, { target: { value: 'invalid' } });
    fireEvent.click(apply);
    expect(screen.getByRole('alert')).toHaveTextContent(
      i18n.t('commerce:cart.voucherInvalidError'),
    );
    expect(onApplyVoucher).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: ' freeship ' } });
    fireEvent.click(apply);
    expect(onApplyVoucher).toHaveBeenCalledWith('FREESHIP');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
