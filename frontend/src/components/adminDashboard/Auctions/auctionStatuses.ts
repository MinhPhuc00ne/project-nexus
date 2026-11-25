export const AUCTION_STATUS_KEYS = [
  'SCHEDULED',
  'ACTIVE',
  'EXTENDED',
  'ENDED',
  'SETTLED',
  'FAILED',
  'CANCELLED',
  'DRAFT',
] as const;

export type AdminAuctionStatusKey = (typeof AUCTION_STATUS_KEYS)[number];

export function isKnownAuctionStatus(value: string): value is AdminAuctionStatusKey {
  return (AUCTION_STATUS_KEYS as readonly string[]).includes(value);
}
