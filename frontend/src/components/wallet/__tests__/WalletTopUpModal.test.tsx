import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import type { WalletDepositProvider } from '../../../services/wallet.service';
import WalletTopUpModal from '../WalletTopUpModal';

function Harness({ onAmountChange }: { onAmountChange: (val: string) => void }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<WalletDepositProvider>('PAYOS');

  return (
    <WalletTopUpModal
      isOpen
      onClose={vi.fn()}
      topUpAmount={amount}
      setTopUpAmount={(val) => {
        setAmount(val);
        onAmountChange(val);
      }}
      selectedMethod={method}
      setSelectedMethod={setMethod}
      onConfirm={vi.fn()}
      submitting={false}
    />
  );
}

describe('WalletTopUpModal', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('formats typed amount with dot separators and stores raw digits', async () => {
    const user = userEvent.setup();
    const onAmountChange = vi.fn();

    render(<Harness onAmountChange={onAmountChange} />);

    const input = screen.getByPlaceholderText(/Nhập số tiền khác/i);
    await user.type(input, '10000000');

    expect(input).toHaveValue('10.000.000');
    expect(onAmountChange).toHaveBeenLastCalledWith('10000000');

    await user.type(input, '{Backspace}');
    expect(input).toHaveValue('1.000.000');
    expect(onAmountChange).toHaveBeenLastCalledWith('1000000');
  });

  it('strips non-digits on paste and caps input at 10 digits', async () => {
    const user = userEvent.setup();
    const onAmountChange = vi.fn();

    render(<Harness onAmountChange={onAmountChange} />);

    const input = screen.getByPlaceholderText(/Nhập số tiền khác/i);
    await user.click(input);
    await user.paste('abc12.34xyz');

    expect(input).toHaveValue('1.234');
    expect(onAmountChange).toHaveBeenLastCalledWith('1234');

    await user.clear(input);
    await user.paste('1234567890123');

    expect(input).toHaveValue('1.234.567.890');
    expect(onAmountChange).toHaveBeenLastCalledWith('1234567890');
  });

  it('preserves editing in the middle of the formatted amount', async () => {
    const user = userEvent.setup();
    const onAmountChange = vi.fn();

    render(<Harness onAmountChange={onAmountChange} />);

    const input = screen.getByPlaceholderText(/Nhập số tiền khác/i) as HTMLInputElement;
    await user.type(input, '1000000');
    expect(input).toHaveValue('1.000.000');

    input.setSelectionRange(1, 1);
    await user.type(input, '5', { initialSelectionStart: 1, initialSelectionEnd: 1 });

    expect(input).toHaveValue('15.000.000');
    expect(onAmountChange).toHaveBeenLastCalledWith('15000000');
  });

  it('defers formatting until IME composition ends', () => {
    const onAmountChange = vi.fn();

    render(<Harness onAmountChange={onAmountChange} />);

    const input = screen.getByPlaceholderText(/Nhập số tiền khác/i) as HTMLInputElement;
    fireEvent.compositionStart(input);
    fireEvent.compositionEnd(input, { target: { value: '250000' } });

    expect(input).toHaveValue('250.000');
    expect(onAmountChange).toHaveBeenLastCalledWith('250000');
  });
});
