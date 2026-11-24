import { useState } from 'react';
import { render, screen } from '@testing-library/react';
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
});
