import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuctionStatus } from '@nexus/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { getAuctionsApi, type AuctionEntity } from '@/features/auction/services/auction.service';
import AuthHeroSection from '../AuthHeroSection';

vi.mock('@/features/auction/services/auction.service', () => ({
  getAuctionsApi: vi.fn(),
  formatAuctionImage: (value: string) => value,
}));

const live: AuctionEntity = {
  id: 'live-room',
  title: 'Live watch collection',
  status: AuctionStatus.ACTIVE,
  startTime: '2030-01-01T00:00:00Z',
  endTime: '2099-01-01T00:00:00Z',
  originalEndTime: '2099-01-01T00:00:00Z',
  startingPrice: 1000000,
  currentHighestBid: 1500000,
  bidIncrement: 100000,
  totalBidsCount: 6,
  isExtended: false,
};
const scheduled: AuctionEntity = {
  ...live,
  id: 'next-room',
  title: 'Upcoming camera collection',
  status: AuctionStatus.SCHEDULED,
};

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AuthHeroSection />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function loadBanner() {
  mount();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10);
  });
}

function activeTitle() {
  return screen.getByRole('heading', { level: 3 });
}

describe('login auction banner', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.useFakeTimers();
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    vi.mocked(getAuctionsApi).mockImplementation(async (query) => {
      const items: AuctionEntity[] = [];
      if (query?.status === AuctionStatus.ACTIVE) items.push(live);
      if (query?.status === AuctionStatus.SCHEDULED) items.push(scheduled);
      return { items, pagination: { page: 1, limit: 4, total: items.length, totalPages: 1 } };
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('rotates real sessions every five seconds and loops back without refetching', async () => {
    await loadBanner();
    expect(activeTitle()).toHaveTextContent(live.title);
    expect(screen.getByRole('link', { name: 'Explore live session' })).toHaveAttribute(
      'href',
      '/auction/live-room',
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(activeTitle()).toHaveTextContent(scheduled.title);
    expect(screen.getByRole('link', { name: 'View upcoming session' })).toHaveAttribute(
      'href',
      '/auction/next-room',
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(activeTitle()).toHaveTextContent(live.title);
    expect(getAuctionsApi).toHaveBeenCalledTimes(3);
  });

  it('pauses while reading with the mouse and supports manual navigation and resuming', async () => {
    await loadBanner();
    const region = screen.getByRole('region', { name: 'Featured auction sessions' });
    fireEvent.mouseEnter(region);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(activeTitle()).toHaveTextContent(live.title);
    fireEvent.mouseLeave(region);
    fireEvent.click(screen.getByRole('button', { name: 'Next session' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(activeTitle()).toHaveTextContent(scheduled.title);
    fireEvent.click(screen.getByRole('button', { name: 'Resume automatic slides' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(activeTitle()).toHaveTextContent(live.title);
  });

  it('stops rotating while keyboard focus is inside the banner', async () => {
    await loadBanner();
    fireEvent.focus(screen.getByRole('link', { name: 'Explore live session' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(activeTitle()).toHaveTextContent(live.title);
  });

  it('honours reduced motion', async () => {
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);
    await loadBanner();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(activeTitle()).toHaveTextContent(live.title);
    fireEvent.click(screen.getByRole('button', { name: 'Next session' }));
    expect(activeTitle()).toHaveTextContent(scheduled.title);
  });

  it('shows a truthful empty state without a sample auction', async () => {
    vi.mocked(getAuctionsApi).mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 4, total: 0, totalPages: 0 },
    });
    await loadBanner();
    expect(activeTitle()).toHaveTextContent('A new opportunity awaits.');
    expect(screen.getByRole('link', { name: 'Explore auctions' })).toHaveAttribute(
      'href',
      '/auction',
    );
    expect(screen.queryByText('Live now')).not.toBeInTheDocument();
  });

  it('handles network failure with a retry action', async () => {
    vi.mocked(getAuctionsApi).mockRejectedValue(new Error('Offline'));
    await loadBanner();
    expect(activeTitle()).toHaveTextContent('See you at the next auction.');
    expect(screen.getByText(/You can still sign in as usual/)).toBeInTheDocument();
    vi.mocked(getAuctionsApi).mockResolvedValue({
      items: [live],
      pagination: { page: 1, limit: 4, total: 1, totalPages: 1 },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reload sessions' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(activeTitle()).toHaveTextContent(live.title);
    expect(screen.queryByRole('button', { name: 'Next session' })).not.toBeInTheDocument();
  });
});
