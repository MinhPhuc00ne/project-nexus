import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import BuyerWithdrawalModal from '../BuyerWithdrawalModal';
import type { UserProfile } from '../../../types/user.types';

const mockProfile: UserProfile = {
  id: 'buyer-1',
  email: 'buyer@nexus.test',
  fullName: 'Nguyen Van A',
  role: 'BUYER',
  bankName: 'Vietcombank',
  accountNumber: '1234567890',
  accountHolderName: 'NGUYEN VAN A',
};

describe('BuyerWithdrawalModal', () => {
  it('allows switching between saved bank account and a custom bank account', () => {
    const onSubmit = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <BuyerWithdrawalModal
          balance={500000}
          profile={mockProfile}
          submitting={false}
          onClose={vi.fn()}
          onSubmit={onSubmit}
        />
      </I18nextProvider>,
    );

    const bankInput = screen.getByDisplayValue('Vietcombank') as HTMLInputElement;
    expect(bankInput.disabled).toBe(true);

    const toggleBtn = screen.getByRole('button', {
      name: /use another bank account|dùng tài khoản ngân hàng khác/i,
    });
    fireEvent.click(toggleBtn);
    expect(bankInput.disabled).toBe(false);

    fireEvent.change(bankInput, { target: { value: 'Techcombank' } });
    expect(bankInput.value).toBe('Techcombank');

    const revertBtn = screen.getByRole('button', {
      name: /use saved bank account|dùng tài khoản đã lưu/i,
    });
    fireEvent.click(revertBtn);
    expect(bankInput.disabled).toBe(true);
    expect(bankInput.value).toBe('Vietcombank');
  });
});
