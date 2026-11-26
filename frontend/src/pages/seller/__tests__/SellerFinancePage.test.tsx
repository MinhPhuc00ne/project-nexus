import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import SellerFinancePage from '../SellerFinancePage';

const mockRefreshProfile = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockGetSellerRevenue = vi.fn();
const mockGetSellerTransactions = vi.fn();
const mockGetSellerWithdrawals = vi.fn();
const mockDepositBuyerWalletApi = vi.fn();
const mockCheckBuyerDepositStatusApi = vi.fn();

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    token: 'seller-token',
    refreshProfile: mockRefreshProfile,
  }),
}));

vi.mock('@/features/auth/services/auth', () => ({
  getStoredToken: () => 'seller-token',
  getStoredUser: () => ({ id: 'seller-1' }),
}));

vi.mock('@/features/notifications/services/notificationSocket', () => ({
  createNotificationConnection: () => ({
    socket: { on: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock('../../../components/seller/SellerSession', () => ({
  useSellerSession: () => ({
    id: 'seller-1',
    isShopSuspended: false,
    suspensionReason: null,
    bankName: 'Vietcombank',
    accountNumber: '1029384756',
    accountHolderName: 'NGUYEN VAN A',
  }),
}));

vi.mock('../../../components/ToastNotification', () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
  }),
}));

vi.mock('@/features/wallet/services/sellerFinance', () => ({
  getSellerRevenue: () => mockGetSellerRevenue(),
  getSellerTransactions: () => mockGetSellerTransactions(),
  getSellerWithdrawals: () => mockGetSellerWithdrawals(),
  createSellerWithdrawal: vi.fn(),
}));

vi.mock('@/features/wallet/services/wallet.service', () => ({
  depositBuyerWalletApi: (...args: unknown[]) => mockDepositBuyerWalletApi(...args),
  checkBuyerDepositStatusApi: (...args: unknown[]) => mockCheckBuyerDepositStatusApi(...args),
}));

const PAYOS_QR_ALT = 'PayOS VietQR';

const sampleRevenue = {
  wallet: {
    balance: 200000,
    lockedBalance: 0,
    currency: 'VND',
    availableToWithdraw: 200000,
  },
  metrics: {
    totalOrders: 2,
    completedOrdersCount: 2,
    pendingOrdersCount: 0,
    cancelledOrdersCount: 0,
    totalGrossRevenue: 500000,
    completedRevenue: 500000,
    pendingEscrowRevenue: 0,
    platformFeeRatePercentage: 5,
    estimatedPlatformFee: 25000,
    netRevenue: 475000,
  },
  monthlyBreakdown: [],
};

describe('SellerFinancePage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
    mockGetSellerRevenue.mockResolvedValue(sampleRevenue);
    mockGetSellerTransactions.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
    mockGetSellerWithdrawals.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens inline PayOS QR popup, allows reopening after close, and closes on polling success', async () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    mockDepositBuyerWalletApi.mockResolvedValue({
      success: true,
      orderCode: 987654,
      checkoutUrl: 'https://pay.payos.vn/web/987654',
      qrCode: 'https://img.vietqr.io/sample.png',
      amount: 500000,
      accountNumber: '0000123456',
      accountName: 'NEXUS PAY',
      bin: '970422',
    });
    mockCheckBuyerDepositStatusApi.mockResolvedValue({
      orderCode: 987654,
      status: 'SUCCESS',
      amount: 500000,
      createdAt: '2026-11-24T00:00:00Z',
      balance: 700000,
    });

    render(
      <MemoryRouter>
        <SellerFinancePage />
      </MemoryRouter>,
    );

    const topUpBtn = await screen.findByRole('button', { name: /Top up wallet/i });
    await waitFor(() => expect(topUpBtn).toBeEnabled());

    vi.useFakeTimers();

    fireEvent.click(topUpBtn);

    const amountInput = screen.getByRole('textbox');
    fireEvent.change(amountInput, { target: { value: '500000' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Continue to payment/i }));
    });

    expect(mockDepositBuyerWalletApi).toHaveBeenCalledWith({
      amount: 500000,
      provider: 'PAYOS',
    });
    expect(windowOpenSpy).not.toHaveBeenCalled();

    expect(screen.getByAltText(PAYOS_QR_ALT)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open PayOS payment page/i })).toHaveAttribute(
      'href',
      'https://pay.payos.vn/web/987654',
    );

    const closeBtn = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeBtn);
    expect(screen.queryByAltText(PAYOS_QR_ALT)).not.toBeInTheDocument();

    const reopenBtn = screen.getByRole('button', { name: /View QR code/i });
    fireEvent.click(reopenBtn);
    expect(screen.getByAltText(PAYOS_QR_ALT)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(mockCheckBuyerDepositStatusApi).toHaveBeenCalledWith(987654);
    expect(screen.queryByAltText(PAYOS_QR_ALT)).not.toBeInTheDocument();
    expect(mockToastSuccess).toHaveBeenCalledWith('Wallet top-up completed successfully.');
    windowOpenSpy.mockRestore();
  });
});
