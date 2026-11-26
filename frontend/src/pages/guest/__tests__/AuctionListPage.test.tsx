import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { AuctionStatus } from '@nexus/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { getAuctionsApi, type AuctionEntity } from '@/features/auction/services/auction.service';
import AuctionListPage from '../AuctionListPage';
import { HomeLiveAuction } from '../../../components/home/HomeLiveAuction';

vi.mock('@/features/auction/services/auction.service', () => ({
  getAuctionsApi: vi.fn(),
  formatAuctionImage: (value: string) => value,
}));

const auction: AuctionEntity = {
  id: 'room-1',
  title: 'Vintage watch collection',
  status: AuctionStatus.ACTIVE,
  imageUrl: 'https://example.com/watch.jpg',
  startTime: '2030-01-01T00:00:00Z',
  endTime: '2099-01-01T00:00:00Z',
  originalEndTime: '2099-01-01T00:00:00Z',
  startingPrice: 1000000,
  currentHighestBid: 1500000,
  bidIncrement: 100000,
  totalBidsCount: 6,
  isExtended: false,
};
function DetailProbe() {
  return <h1>Room {useParams().id}</h1>;
}
function mount(initial = '/auction') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route path="/" element={<HomeLiveAuction auctions={[auction]} />} />
          <Route path="/auction" element={<AuctionListPage />} />
          <Route path="/auction/:id" element={<DetailProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('auction discovery flow', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await i18n.changeLanguage('en');
    vi.mocked(getAuctionsApi).mockImplementation(async (query) => ({
      items: [auction],
      pagination: { page: query?.page || 1, total: 19, limit: 9, totalPages: 3 },
    }));
  });

  it('opens the full list from home, then the selected room', async () => {
    mount('/');
    fireEvent.click(screen.getByRole('link', { name: 'View all auction sessions' }));
    await screen.findByRole('heading', { name: 'Find your next bid' });
    fireEvent.click(await screen.findByRole('link', { name: 'Enter live room' }));
    expect(await screen.findByRole('heading', { name: 'Room room-1' })).toBeInTheDocument();
  });

  it('uses server pagination and resets the page when filtering', async () => {
    mount();
    await screen.findByText('1 / 3');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('2 / 3');
    expect(getAuctionsApi).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    fireEvent.click(screen.getByRole('button', { name: 'Scheduled' }));
    await waitFor(() =>
      expect(getAuctionsApi).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, status: AuctionStatus.SCHEDULED }),
      ),
    );
    expect(await screen.findByText('1 / 3')).toBeInTheDocument();
  });

  it('submits a trimmed search while keeping the selected status', async () => {
    mount('/auction?status=EXTENDED&page=2');
    await screen.findByText('2 / 3');
    fireEvent.change(screen.getByRole('textbox', { name: 'Search auction sessions' }), {
      target: { value: '  watches  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search auction sessions' }));
    await waitFor(() =>
      expect(getAuctionsApi).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, status: AuctionStatus.EXTENDED, search: 'watches' }),
      ),
    );
  });

  it('shows an empty result without opening an arbitrary room', async () => {
    vi.mocked(getAuctionsApi).mockResolvedValue({
      items: [],
      pagination: { page: 1, total: 0, limit: 9, totalPages: 0 },
    });
    mount();
    expect(await screen.findByText('No sessions found')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Enter live room' })).not.toBeInTheDocument();
  });

  it('shows request failures and lets the visitor retry', async () => {
    vi.mocked(getAuctionsApi).mockRejectedValueOnce(new Error('Offline'));
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load sessions');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: 'Enter live room' })).toHaveAttribute(
      'href',
      '/auction/room-1',
    );
  });

  it('shows upcoming sessions as upcoming and uses their detail URL', () => {
    render(
      <MemoryRouter>
        <HomeLiveAuction auctions={[{ ...auction, status: AuctionStatus.SCHEDULED }]} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore session' })).toHaveAttribute(
      'href',
      '/auction/room-1',
    );
    expect(screen.queryByRole('link', { name: 'Enter live room' })).not.toBeInTheDocument();
  });
});
