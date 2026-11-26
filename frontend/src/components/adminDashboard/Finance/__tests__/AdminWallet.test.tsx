import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import QRCode from 'qrcode';
import i18n from '../../../../i18n';
import {
  depositToAdminWallet,
  getAdminWallet,
  getAdminWalletTransactions,
} from '@/features/admin/services/admin';
import {
  checkBuyerDepositStatusApi,
  type WalletDepositStatus,
} from '@/features/wallet/services/wallet.service';
import { adminRequest } from '@/features/admin/services/adminRequest';
import AdminWallet from '../AdminWallet';

vi.mock('@/features/admin/services/admin', () => ({
  depositToAdminWallet: vi.fn(),
  getAdminWallet: vi.fn(),
  getAdminWalletTransactions: vi.fn(),
}));
vi.mock('@/features/wallet/services/wallet.service', () => ({
  checkBuyerDepositStatusApi: vi.fn(),
}));
vi.mock('@/features/admin/services/adminRequest', () => ({ adminRequest: vi.fn() }));
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn() } }));

beforeEach(async () => {
  vi.resetAllMocks();
  await i18n.changeLanguage('en');
  vi.mocked(getAdminWallet).mockResolvedValue({
    walletId: 'wallet',
    userId: 'admin',
    balance: 0,
    lockedBalance: 0,
    currency: 'VND',
    totalPlatformFeeCollected: 0,
    totalDeposited: 0,
    totalTransactions: 0,
    updatedAt: new Date().toISOString(),
  });
  vi.mocked(getAdminWalletTransactions).mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  vi.mocked(
    QRCode.toDataURL as unknown as (text: string, options?: unknown) => Promise<string>,
  ).mockResolvedValue('data:image/png;base64,qr');
});

it('requests PayOS through the existing authenticated wallet deposit endpoint', async () => {
  const service = await import('@/features/admin/services/adminCommerce');
  await service.depositToAdminWallet({ amount: 100000, description: 'Reserve' });
  expect(adminRequest).toHaveBeenCalledWith({
    url: '/commerce/wallet/deposit',
    method: 'POST',
    data: { amount: 100000, description: 'Reserve', provider: 'PAYOS' },
  });
});

it('shows the backend QR and confirms the deposit only after a successful backend status', async () => {
  let resolveStatus!: (status: WalletDepositStatus) => void;
  vi.mocked(checkBuyerDepositStatusApi).mockReturnValue(
    new Promise((resolve) => {
      resolveStatus = resolve;
    }),
  );
  vi.mocked(depositToAdminWallet).mockResolvedValue({
    success: true,
    paymentProvider: 'PAYOS',
    orderCode: 123,
    checkoutUrl: 'https://pay.payos.vn/test',
    qrCode: 'backend-emv-payload',
    amount: 100000,
    transactionId: 'pending',
    message: 'Created',
  });
  render(<AdminWallet />);
  const input = screen.getByLabelText('Amount (VND)');
  fireEvent.change(input, { target: { value: '100000' } });
  expect(input).toHaveValue('100.000');
  fireEvent.click(screen.getByRole('button', { name: 'Deposit to wallet' }));
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  await waitFor(() =>
    expect(QRCode.toDataURL).toHaveBeenCalledWith('backend-emv-payload', { width: 320, margin: 2 }),
  );
  expect(screen.getByRole('link', { name: 'Open PayOS payment page' })).toHaveAttribute(
    'href',
    'https://pay.payos.vn/test',
  );
  expect(screen.queryByText('Payment confirmed. Wallet balance updated.')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Deposit to wallet' })).toBeDisabled();
  await act(async () => {
    resolveStatus({
      orderCode: 123,
      status: 'SUCCESS',
      amount: 100000,
      balance: 100000,
      createdAt: '',
    });
  });
  expect(await screen.findByRole('dialog', { name: 'Transfer successful' })).toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Open PayOS payment page' })).not.toBeInTheDocument();
  expect(checkBuyerDepositStatusApi).toHaveBeenCalledTimes(1);
  await act(async () => {
    await i18n.changeLanguage('vi');
  });
  expect(screen.getByRole('dialog', { name: 'Chuyển khoản thành công' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Hoàn tất' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Nạp vào ví' })).toBeEnabled();
});
