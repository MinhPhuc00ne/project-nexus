import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuctionStatus } from '@nexus/types';
import i18n from '../../../../i18n';
import type { AdminAuctionEntity } from '../../../../services/auction.service';
import AuctionRow from '../AuctionRow';

const auction: AdminAuctionEntity = {
  id: 'auction-1',
  title: 'Summer auction',
  imageUrl: '/auction.jpg',
  status: AuctionStatus.SCHEDULED,
  startTime: '2030-06-01T00:00:00Z',
  endTime: '2030-06-02T00:00:00Z',
  minBuyerReputation: 100,
  minSellerReputation: 80,
  isConsignmentLocked: false,
  totalBidsCount: 0,
  startingPrice: 0,
  _count: { items: 2, bids: 0 },
};

function renderRow(item = auction) {
  const callbacks = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onPromote: vi.fn(),
    setSelectedAuction: vi.fn(),
    setLockingAuction: vi.fn(),
    setLockError: vi.fn(),
    openShowcaseForAuction: vi.fn(),
    handleStartAuction: vi.fn(),
  };
  render(
    <MemoryRouter>
      <table>
        <tbody>
          <AuctionRow
            {...callbacks}
            item={item}
            now={Date.parse('2030-05-01T00:00:00Z')}
            startingId={null}
            locking={false}
            banners={{ data: [], loading: false, error: '' }}
          />
        </tbody>
      </table>
    </MemoryRouter>,
  );
  return callbacks;
}

describe('admin auction row after merging translations', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('keeps management actions and lot navigation when switching language in place', async () => {
    const callbacks = renderRow();
    expect(
      screen.getByRole('button', { name: 'Chỉnh sửa phiên đấu giá Summer auction' }),
    ).toBeEnabled();
    await act(async () => {
      await i18n.changeLanguage('en');
    });

    const edit = screen.getByRole('button', { name: 'Edit auction Summer auction' });
    // Preserve the existing icon button layout.
    expect(edit).not.toHaveTextContent('Edit');
    fireEvent.click(edit);
    fireEvent.click(screen.getByRole('button', { name: 'Delete auction Summer auction' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Promote auction Summer auction on a banner' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'View products for auction Summer auction, 2 products' }),
    );
    expect(callbacks.onEdit).toHaveBeenCalledWith(auction);
    expect(callbacks.onDelete).toHaveBeenCalledWith(auction);
    expect(callbacks.onPromote).toHaveBeenCalledWith(auction);
    expect(callbacks.setSelectedAuction).toHaveBeenCalledWith(auction);
    expect(
      screen.getByRole('link', { name: 'Manage lots for auction Summer auction' }),
    ).toHaveAttribute('href', '/admin/auctions/auction-1/lots');
  });

  it('preserves restrictions for a running auction and translates disabled reasons', async () => {
    renderRow({ ...auction, status: AuctionStatus.ACTIVE, isConsignmentLocked: true });
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    expect(screen.getByRole('button', { name: 'Edit auction Summer auction' })).toBeDisabled();
    const remove = screen.getByRole('button', { name: 'Delete auction Summer auction' });
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('title', 'An ongoing auction cannot be deleted.');
    const lock = screen.getByRole('button', {
      name: 'Consignments closed for auction Summer auction',
    });
    expect(lock).toBeDisabled();
    expect(lock.getAttribute('title')).toBe(i18n.t('admin:auctions.lockReasons.alreadyLocked'));
    expect(lock).not.toHaveAttribute('title', 'alreadyLocked');
  });
});
