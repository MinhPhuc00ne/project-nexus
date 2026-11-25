import { AuctionStatus } from '@nexus/types';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '../../../../i18n';
import type { AdminAuctionEntity } from '../../../../services/auction.service';
import { auctionDeleteReason, auctionEditReason } from '../auctionManagementAvailability';

const baseRow = (overrides: Partial<AdminAuctionEntity>): AdminAuctionEntity => ({
  id: 'room-1',
  title: 'Auction Room',
  status: AuctionStatus.SCHEDULED,
  startTime: '2030-06-01T00:00:00Z',
  endTime: '2030-06-02T00:00:00Z',
  minBuyerReputation: 100,
  minSellerReputation: 80,
  isConsignmentLocked: false,
  totalBidsCount: 0,
  startingPrice: 0,
  ...overrides,
});

describe('auctionManagementAvailability', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('matches backend edit and delete eligibility rules across all auction statuses', () => {
    for (const status of [
      AuctionStatus.DRAFT,
      AuctionStatus.SCHEDULED,
      AuctionStatus.ACTIVE,
      AuctionStatus.EXTENDED,
      AuctionStatus.ENDED,
      AuctionStatus.SETTLED,
      AuctionStatus.CANCELLED,
      AuctionStatus.FAILED,
    ]) {
      const row = baseRow({ status, totalBidsCount: 0 });
      expect(!auctionEditReason(row)).toBe(
        [AuctionStatus.DRAFT, AuctionStatus.SCHEDULED].includes(status),
      );
      expect(!auctionDeleteReason(row)).toBe(
        ![AuctionStatus.ACTIVE, AuctionStatus.EXTENDED].includes(status),
      );
    }

    const bidRestrictions: Array<Partial<AdminAuctionEntity>> = [
      { totalBidsCount: 1 },
      { totalBidsCount: 0, _count: { items: 0, bids: 1 } },
      { totalBidsCount: 0, _count: { items: 0, bids: 0, awards: 1 } },
    ];
    for (const overrides of bidRestrictions) {
      expect(
        auctionDeleteReason(baseRow({ status: AuctionStatus.SCHEDULED, ...overrides })),
      ).toBeTruthy();
    }
  });
});
