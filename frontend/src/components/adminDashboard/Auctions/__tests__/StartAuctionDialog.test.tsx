import { fireEvent, render, screen } from '@testing-library/react';
import { AuctionStatus } from '@nexus/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import type { AdminAuctionEntity } from '@/features/auction/services/auction.service';
import StartAuctionDialog from '../StartAuctionDialog';

const auction: AdminAuctionEntity = {
  id: 'auction-1',
  title: 'Watch Room',
  status: AuctionStatus.SCHEDULED,
  startTime: '2030-06-01T09:00:00Z',
  endTime: '2030-06-01T11:00:00Z',
  isConsignmentLocked: true,
  minBuyerReputation: 100,
  minSellerReputation: 80,
  totalBidsCount: 0,
  startingPrice: 0,
};

describe('StartAuctionDialog', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('prefills the existing closing time in local time and submits the edited value', () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <StartAuctionDialog
        auction={auction}
        pending={false}
        error=""
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    const confirm = screen.getByRole('button', { name: 'Save time and start' });
    const input = screen.getByLabelText('New closing time');
    const date = new Date(auction.endTime);
    const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);
    expect(input).toHaveValue(localTime);
    fireEvent.change(input, { target: { value: '2030-06-02T14:00' } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith('2030-06-02T14:00');
  });

  it('requires an end time if the prefilled value is cleared', () => {
    render(
      <StartAuctionDialog
        auction={auction}
        pending={false}
        error=""
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('New closing time'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Save time and start' })).toBeDisabled();
  });

  it('locks the form while starting and shows API failures inline', () => {
    render(
      <StartAuctionDialog
        auction={auction}
        pending
        error="Start rejected"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('New closing time')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Start rejected');
  });
});
