import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import SellerLinkedBankCard from '../SellerLinkedBankCard';

const mockRefreshProfile = vi.fn();
const mockToastSuccess = vi.fn();
const mockUpdateMyProfile = vi.fn();
let mockSellerUser: {
  id: string;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolderName?: string | null;
} = { id: 'seller-1' };

vi.mock('../../../services/auth', () => ({
  getStoredToken: () => 'test-token',
  getStoredUser: () => ({ id: 'seller-1' }),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    refreshProfile: mockRefreshProfile,
  }),
}));

vi.mock('../SellerSession', () => ({
  useSellerSession: () => mockSellerUser,
}));

vi.mock('../../ToastNotification', () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

vi.mock('../../../services/profile', () => ({
  updateMyProfile: (...args: unknown[]) => mockUpdateMyProfile(...args),
}));

describe('SellerLinkedBankCard', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
    mockUpdateMyProfile.mockResolvedValue({});
  });

  it('shows empty state when no bank account is linked and saves new bank details', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    mockSellerUser = {
      id: 'seller-1',
      bankName: null,
      accountNumber: null,
      accountHolderName: null,
    };

    render(<SellerLinkedBankCard onSaved={onSaved} />);

    expect(screen.getByText('No payout account linked yet')).toBeInTheDocument();

    const linkButtons = screen.getAllByRole('button', { name: /Link account/i });
    await user.click(linkButtons[0]);

    await user.type(screen.getByLabelText(/Bank \/ Payment channel/i), 'Vietcombank');
    await user.type(screen.getByLabelText(/Account number/i), '1029384756');
    await user.type(screen.getByLabelText(/Account holder name/i), 'nguyen van a');
    await user.type(screen.getByLabelText(/Confirm password/i), 'Secret123!');

    await user.click(screen.getByRole('button', { name: /Save account/i }));

    await waitFor(() => {
      expect(mockUpdateMyProfile).toHaveBeenCalledWith(
        {
          bankName: 'Vietcombank',
          accountNumber: '1029384756',
          accountHolderName: 'NGUYEN VAN A',
        },
        'Secret123!',
      );
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Linked bank account saved.');
    expect(mockRefreshProfile).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('displays linked bank details when already configured', () => {
    mockSellerUser = {
      id: 'seller-1',
      bankName: 'MB Bank',
      accountNumber: '9988776655',
      accountHolderName: 'TRAN THI B',
    };

    render(<SellerLinkedBankCard />);

    expect(screen.getByText('MB Bank')).toBeInTheDocument();
    expect(screen.getByText('9988776655')).toBeInTheDocument();
    expect(screen.getByText('TRAN THI B')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit account/i })).toBeInTheDocument();
  });
});
