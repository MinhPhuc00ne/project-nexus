import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import SellerLinkedBankCard from '../SellerLinkedBankCard';

const mockRefreshProfile = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockUpdateSellerBankAccount = vi.fn();
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
    error: mockToastError,
    info: vi.fn(),
  }),
}));

vi.mock('../../../services/profile', () => ({
  updateSellerBankAccount: (...args: unknown[]) => mockUpdateSellerBankAccount(...args),
}));

const VALID_ACCOUNT_NUMBER = '1029384756';
const VALID_HOLDER_NAME = 'NGUYEN VAN A';

describe('SellerLinkedBankCard', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
    mockUpdateSellerBankAccount.mockResolvedValue({});
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
    await user.type(screen.getByLabelText(/Account number/i), VALID_ACCOUNT_NUMBER);
    await user.type(screen.getByLabelText(/Account holder name/i), 'nguyen van a');

    await user.click(screen.getByRole('button', { name: /Save account/i }));

    await waitFor(() => {
      expect(mockUpdateSellerBankAccount).toHaveBeenCalledWith({
        bankName: 'Vietcombank',
        accountNumber: VALID_ACCOUNT_NUMBER,
        accountHolderName: VALID_HOLDER_NAME,
      });
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

  it('normalizes pasted account numbers containing spaces or hyphens', async () => {
    const user = userEvent.setup();
    mockSellerUser = {
      id: 'seller-1',
      bankName: null,
      accountNumber: null,
      accountHolderName: null,
    };

    render(<SellerLinkedBankCard />);

    await user.click(screen.getAllByRole('button', { name: /Link account/i })[0]);
    await user.type(screen.getByLabelText(/Bank \/ Payment channel/i), 'ACB');
    await user.type(screen.getByLabelText(/Account number/i), '1029 3847-56');
    await user.type(screen.getByLabelText(/Account holder name/i), 'le van c');
    await user.click(screen.getByRole('button', { name: /Save account/i }));

    await waitFor(() => {
      expect(mockUpdateSellerBankAccount).toHaveBeenCalledWith({
        bankName: 'ACB',
        accountNumber: '1029384756',
        accountHolderName: 'LE VAN C',
      });
    });
  });

  it('shows validation error when bank name is blank and keeps modal open', async () => {
    const user = userEvent.setup();
    mockSellerUser = {
      id: 'seller-1',
      bankName: null,
      accountNumber: null,
      accountHolderName: null,
    };

    render(<SellerLinkedBankCard />);

    await user.click(screen.getAllByRole('button', { name: /Link account/i })[0]);
    await user.type(screen.getByLabelText(/Bank \/ Payment channel/i), '   ');
    await user.type(screen.getByLabelText(/Account number/i), VALID_ACCOUNT_NUMBER);
    await user.type(screen.getByLabelText(/Account holder name/i), VALID_HOLDER_NAME);
    await user.click(screen.getByRole('button', { name: /Save account/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Please enter bank name, account number, and account holder name.',
      );
    });
    expect(mockUpdateSellerBankAccount).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows validation error when account number is too short and keeps modal open', async () => {
    const user = userEvent.setup();
    mockSellerUser = {
      id: 'seller-1',
      bankName: null,
      accountNumber: null,
      accountHolderName: null,
    };

    render(<SellerLinkedBankCard />);

    await user.click(screen.getAllByRole('button', { name: /Link account/i })[0]);
    await user.type(screen.getByLabelText(/Bank \/ Payment channel/i), 'Vietcombank');
    await user.type(screen.getByLabelText(/Account number/i), '12');
    await user.type(screen.getByLabelText(/Account holder name/i), VALID_HOLDER_NAME);
    await user.click(screen.getByRole('button', { name: /Save account/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Invalid account number (4–50 alphanumeric characters).',
      );
    });
    expect(mockUpdateSellerBankAccount).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('keeps modal open and displays error alert when API request fails', async () => {
    const user = userEvent.setup();
    mockSellerUser = {
      id: 'seller-1',
      bankName: null,
      accountNumber: null,
      accountHolderName: null,
    };
    mockUpdateSellerBankAccount.mockRejectedValueOnce(new Error('Server unavailable'));

    render(<SellerLinkedBankCard />);

    await user.click(screen.getAllByRole('button', { name: /Link account/i })[0]);
    await user.type(screen.getByLabelText(/Bank \/ Payment channel/i), 'Vietcombank');
    await user.type(screen.getByLabelText(/Account number/i), VALID_ACCOUNT_NUMBER);
    await user.type(screen.getByLabelText(/Account holder name/i), VALID_HOLDER_NAME);
    await user.click(screen.getByRole('button', { name: /Save account/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Server unavailable');
    });
    expect(mockToastError).toHaveBeenCalledWith('Server unavailable');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(mockRefreshProfile).not.toHaveBeenCalled();
  });
});
