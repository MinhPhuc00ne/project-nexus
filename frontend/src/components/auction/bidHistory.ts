import type { AuctionBidItem, AuctionEntity } from '@/features/auction/types/auction-api.types';
import type { AuctionConsignmentItem } from '@/features/auction/types/auction-consignment.types';

/** Merge REST and socket copies by bid ID without merging equal bids on different lots. */
export function mergeBidHistory(...lists: (AuctionBidItem[] | undefined)[]): AuctionBidItem[] {
  const bids = new Map<string, AuctionBidItem>();
  for (const list of lists) {
    for (const bid of list ?? []) {
      const existing = bids.get(bid.id);
      bids.set(bid.id, { ...existing, ...bid, bidder: { ...existing?.bidder, ...bid.bidder } });
    }
  }
  return [...bids.values()].sort(
    (a, b) =>
      new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime() ||
      Number(b.bidAmount) - Number(a.bidAmount),
  );
}

/** Lot payloads include older bids that may fall outside the session's recent bid list. */
export function getLotBidHistory(
  auction?: AuctionEntity | null,
  lot?: AuctionConsignmentItem | null,
): AuctionBidItem[] {
  if (!lot) return mergeBidHistory(auction?.bids);
  return mergeBidHistory(
    lot.bids,
    auction?.bids?.filter((bid) => bid.auctionItemId === lot.id),
  );
}
