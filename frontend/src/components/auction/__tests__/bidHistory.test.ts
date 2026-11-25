import { BidStatus } from '@nexus/types';
import { describe, expect, it } from 'vitest';
import type { AuctionBidItem, AuctionEntity } from '../../../types/auction-api.types';
import type { AuctionConsignmentItem } from '../../../types/auction-consignment.types';
import { getLotBidHistory, mergeBidHistory } from '../bidHistory';

const makeBid = (
  id: string,
  lotId: string | null,
  amount = 10000,
  time = '2026-11-16T06:00:00Z',
): AuctionBidItem => ({
  id,
  auctionItemId: lotId,
  bidAmount: amount,
  status: BidStatus.ACCEPTED,
  placedAt: time,
  bidder: { id: 'buyer-1', fullName: 'Buyer' },
});

describe('bidHistory', () => {
  it('selects only the active lot bids, including older REST bids', () => {
    const older = makeBid('old-a', 'a');
    const recent = makeBid('recent-a', 'a', 12000, '2026-11-16T06:01:00Z');
    const other = makeBid('other-b', 'b');
    const auction = { bids: [other, recent] } as AuctionEntity;

    expect(
      getLotBidHistory(auction, { id: 'a', bids: [older, recent] } as AuctionConsignmentItem),
    ).toEqual([recent, older]);
    expect(getLotBidHistory(auction, { id: 'b', bids: [other] } as AuctionConsignmentItem)).toEqual(
      [other],
    );
  });

  it('never inherits another lot history or unassigned legacy bids for an empty lot', () => {
    const auction = { bids: [makeBid('other', 'b'), makeBid('legacy', null)] } as AuctionEntity;
    expect(
      getLotBidHistory(auction, { id: 'a', bids: [] } as unknown as AuctionConsignmentItem),
    ).toEqual([]);
  });

  it('deduplicates REST and socket copies by bid id while preserving updated bidder details', () => {
    const original = makeBid('same', 'a');
    const incoming: AuctionBidItem = {
      ...original,
      bidder: { ...original.bidder, fullName: 'Updated' },
    };
    expect(mergeBidHistory([original], [incoming])).toEqual([incoming]);
  });

  it('keeps equal bid amounts from the same buyer on different lots separate', () => {
    expect(mergeBidHistory([makeBid('a1', 'a')], [makeBid('b1', 'b')])).toHaveLength(2);
  });

  it('routes new socket bids to matching lots only and preserves legacy sessions', () => {
    const incoming = makeBid('new', 'a');
    expect(
      getLotBidHistory(
        { bids: [incoming] } as AuctionEntity,
        { id: 'a' } as AuctionConsignmentItem,
      ),
    ).toEqual([incoming]);
    expect(
      getLotBidHistory(
        { bids: [incoming] } as AuctionEntity,
        { id: 'b' } as AuctionConsignmentItem,
      ),
    ).toEqual([]);

    const legacy = makeBid('legacy', null);
    expect(getLotBidHistory({ bids: [legacy] } as AuctionEntity)).toEqual([legacy]);
  });
});
