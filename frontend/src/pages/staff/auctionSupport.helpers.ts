export function canEndStaffAuctionLot(status: string): boolean {
  return status === 'ACTIVE' || status === 'EXTENDED';
}
