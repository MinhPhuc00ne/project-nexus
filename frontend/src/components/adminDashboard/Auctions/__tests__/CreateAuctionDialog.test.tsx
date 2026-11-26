import { MemoryRouter } from 'react-router-dom';
import { AuctionStatus } from '@nexus/types';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../../i18n';
import {
  adminCreateAuctionApi,
  adminUpdateAuctionApi,
  type AdminAuctionEntity,
} from '@/features/auction/services/auction.service';
import { getStoredToken } from '@/features/auth/services/auth';
import { ToastProvider } from '../../../ToastNotification';
import { promoteAuctionBanner } from '../auctionBannerPromotion';
import CreateAuctionDialog from '../CreateAuctionDialog';

vi.mock('@/features/auction/services/auction.service', () => ({
  adminCreateAuctionApi: vi.fn(),
  adminUpdateAuctionApi: vi.fn(),
}));

vi.mock('@/features/auth/services/auth', () => ({
  getStoredToken: vi.fn(),
}));

vi.mock('../auctionBannerPromotion', () => ({
  promoteAuctionBanner: vi.fn(),
}));

function renderDialog(props: Partial<Parameters<typeof CreateAuctionDialog>[0]> = {}) {
  const onClose = props.onClose ?? vi.fn();
  const onCreated = props.onCreated ?? vi.fn();
  const view = render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <ToastProvider>
          <CreateAuctionDialog onClose={onClose} onCreated={onCreated} auction={props.auction} />
        </ToastProvider>
      </MemoryRouter>
    </I18nextProvider>,
  );
  return { ...view, onClose, onCreated };
}

function fillCreateFields(
  container: HTMLElement,
  { withImage = true }: { withImage?: boolean } = {},
) {
  fireEvent.change(screen.getByLabelText(/Tên phiên đấu giá/), {
    target: { value: 'New room' },
  });
  fireEvent.change(screen.getByLabelText(/^Bắt đầu/), {
    target: { value: '2030-01-01T10:00' },
  });
  fireEvent.change(screen.getByLabelText(/^Kết thúc/), {
    target: { value: '2030-01-01T12:00' },
  });
  fireEvent.change(screen.getByLabelText(/Hạn ký gửi/), {
    target: { value: '2030-01-01T11:00' },
  });
  if (withImage) {
    const urlInput = container.querySelector('input[inputmode="url"]') as HTMLInputElement;
    fireEvent.change(urlInput, { target: { value: 'https://example.com/room.png' } });
  }
}

describe('CreateAuctionDialog', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('vi');
    vi.mocked(getStoredToken).mockReturnValue('session');
    vi.mocked(adminCreateAuctionApi).mockImplementation(
      async (payload) =>
        ({
          ...payload,
          id: 'created',
          status: AuctionStatus.SCHEDULED,
          totalBidsCount: 0,
          startingPrice: 0,
        }) as AdminAuctionEntity,
    );
    vi.mocked(promoteAuctionBanner).mockResolvedValue({
      banner: { id: 'banner-1' } as never,
      created: true,
    });
  });

  it('works with the promote switch and validates image presence before creating', async () => {
    const first = renderDialog();
    fillCreateFields(document.body, { withImage: true });

    const toggle = screen.getByRole('switch');
    expect(toggle).toBeEnabled();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => {
      expect(adminCreateAuctionApi).toHaveBeenCalledTimes(1);
      expect(promoteAuctionBanner).toHaveBeenCalledTimes(1);
      expect(first.onCreated).toHaveBeenCalledTimes(1);
    });
    first.unmount();

    vi.clearAllMocks();
    renderDialog();
    fillCreateFields(document.body, { withImage: false });
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.submit(document.querySelector('form')!);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      i18n.t('admin:management.bannerImageRequired'),
    );
    expect(adminCreateAuctionApi).not.toHaveBeenCalled();
  });

  it('preserves room creation when banner promotion fails and directs retry to banner button', async () => {
    vi.mocked(promoteAuctionBanner).mockRejectedValueOnce(new Error('Unavailable'));
    const { onCreated } = renderDialog();
    fillCreateFields(document.body, { withImage: true });

    fireEvent.click(screen.getByRole('switch'));
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(adminCreateAuctionApi).toHaveBeenCalledTimes(1);
      expect(onCreated).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText(/Lên banner/)).toBeInTheDocument();
  });

  it('never creates an auction when schedule, deadline, or reputation scores are invalid', async () => {
    const mutations: Array<() => void> = [
      () =>
        fireEvent.change(screen.getByLabelText(/^Bắt đầu/), {
          target: { value: '' },
        }),
      () =>
        fireEvent.change(screen.getByLabelText(/Hạn ký gửi/), {
          target: { value: '2030-01-01T09:00' },
        }),
      () =>
        fireEvent.change(screen.getByLabelText(/Điểm uy tín Buyer tối thiểu/), {
          target: { value: '-1' },
        }),
    ];

    for (const mutate of mutations) {
      const view = renderDialog();
      fillCreateFields(document.body, { withImage: true });
      mutate();
      fireEvent.submit(document.querySelector('form')!);

      const alerts = await screen.findAllByRole('alert');
      expect(alerts.length).toBeGreaterThan(0);
      expect(adminCreateAuctionApi).not.toHaveBeenCalled();
      expect(view.onCreated).not.toHaveBeenCalled();
      view.unmount();
    }
  });

  it('sends PATCH data in edit mode, preserves original date precision, and clears deadline explicitly', async () => {
    const existingAuction: AdminAuctionEntity = {
      id: 'room-1',
      status: AuctionStatus.SCHEDULED,
      title: 'Original',
      description: '',
      imageUrl: '/images/test.png',
      minBuyerReputation: 40,
      minSellerReputation: 50,
      isConsignmentLocked: false,
      startTime: '2030-01-01T10:00:12.123Z',
      endTime: '2030-01-01T12:00:12.123Z',
      consignmentDeadline: '2030-01-01T11:00:12.123Z',
      totalBidsCount: 0,
      startingPrice: 0,
    };

    vi.mocked(adminUpdateAuctionApi).mockImplementation(async (id) => ({
      ...existingAuction,
      id,
    }));

    const onCreated = vi.fn();
    renderDialog({ auction: existingAuction, onCreated });

    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('admin:auctions.create.deadline.clear') }),
    );
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(adminUpdateAuctionApi).toHaveBeenCalledTimes(1);
    });

    expect(adminCreateAuctionApi).not.toHaveBeenCalled();
    expect(adminUpdateAuctionApi).toHaveBeenCalledWith('room-1', {
      title: 'Original',
      description: '',
      imageUrl: '/images/test.png',
      startTime: existingAuction.startTime,
      endTime: existingAuction.endTime,
      consignmentDeadline: null,
      minBuyerReputation: 40,
      minSellerReputation: 50,
    });
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 'room-1' }));
  });
});
