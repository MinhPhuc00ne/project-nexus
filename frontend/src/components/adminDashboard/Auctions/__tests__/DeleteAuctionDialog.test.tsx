import { AuctionStatus } from '@nexus/contracts';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../../i18n';
import {
  adminDeleteAuctionApi,
  type AdminAuctionEntity,
} from '@/features/auction/services/auction.service';
import { getStoredToken } from '@/features/auth/services/auth';
import { ToastProvider } from '../../../ToastNotification';
import DeleteAuctionDialog from '../DeleteAuctionDialog';

vi.mock('@/features/auction/services/auction.service', () => ({
  adminDeleteAuctionApi: vi.fn(),
}));

vi.mock('@/features/auth/services/auth', () => ({
  getStoredToken: vi.fn(),
}));

describe('DeleteAuctionDialog', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('vi');
    vi.mocked(getStoredToken).mockReturnValue('session');
  });

  it('prevents duplicate delete requests and invokes onDeleted only after server confirms deletion', async () => {
    let resolveDelete!: (result: { success: boolean; deletedId: string }) => void;
    vi.mocked(adminDeleteAuctionApi).mockReturnValue(
      new Promise((resolve) => {
        resolveDelete = resolve;
      }),
    );

    const auction: AdminAuctionEntity = {
      id: 'room-1',
      title: 'Room',
      status: AuctionStatus.DRAFT,
      startTime: '2030-06-01T00:00:00Z',
      endTime: '2030-06-02T00:00:00Z',
      minBuyerReputation: 100,
      minSellerReputation: 80,
      isConsignmentLocked: false,
      totalBidsCount: 0,
      startingPrice: 0,
    };

    const onDeleted = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <ToastProvider>
          <DeleteAuctionDialog auction={auction} onClose={vi.fn()} onDeleted={onDeleted} />
        </ToastProvider>
      </I18nextProvider>,
    );

    const confirmButton = screen.getByRole('button', {
      name: i18n.t('admin:management.confirmDelete'),
    });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    expect(adminDeleteAuctionApi).toHaveBeenCalledTimes(1);
    expect(onDeleted).not.toHaveBeenCalled();

    resolveDelete({ success: true, deletedId: 'room-1' });

    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledTimes(1);
    });
  });
});
