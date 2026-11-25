import { describe, expect, it } from 'vitest';
import type { StaffAfterSalesRequest } from '../../../services/staff';
import {
  canReceiveStaffReturn,
  filterStaffAfterSalesPage,
  getAfterSalesPageCount,
} from '../afterSales.helpers';
import { canEndStaffAuctionLot } from '../auctionSupport.helpers';
import { validateStaffReviewDeletion } from '../reviewModeration.helpers';

describe('staff UI helpers', () => {
  it('filters only the API page and computes server pagination for after-sales requests', () => {
    const requests = [
      { orderId: 'order-1', kind: 'CANCEL', returnWaybillCode: null, reason: 'changed mind' },
      { orderId: 'order-2', kind: 'RETURN', returnWaybillCode: 'waybill-2', reason: 'damaged' },
    ] as StaffAfterSalesRequest[];

    expect(filterStaffAfterSalesPage(requests, 'RETURN', '', 'en')).toEqual([requests[1]]);
    expect(filterStaffAfterSalesPage(requests, 'ALL', 'WAYBILL-2', 'en')).toEqual([requests[1]]);
    expect(getAfterSalesPageCount(41, 20)).toBe(3);
    expect(getAfterSalesPageCount(0, 20)).toBe(1);
  });

  it('allows confirming receipt only for an approved or already received return', () => {
    expect(canReceiveStaffReturn('RETURN', 'APPROVED')).toBe(true);
    expect(canReceiveStaffReturn('RETURN', 'RECEIVED')).toBe(true);
    expect(canReceiveStaffReturn('RETURN', 'REQUESTED')).toBe(false);
    expect(canReceiveStaffReturn('CANCEL', 'APPROVED')).toBe(false);
  });

  it('requires a reason and valid reputation deduction for staff review deletion', () => {
    expect(validateStaffReviewDeletion('bad', 1, 10)).toBe('reasonRequired');
    expect(validateStaffReviewDeletion('clear reason', 0, 10)).toBe('pointsInvalid');
    expect(validateStaffReviewDeletion('clear reason', 11, 10)).toBe('pointsInvalid');
    expect(validateStaffReviewDeletion('clear reason', 1, 10)).toBeNull();
  });

  it('allows ending a staff auction lot only while live', () => {
    expect(canEndStaffAuctionLot('ACTIVE')).toBe(true);
    expect(canEndStaffAuctionLot('EXTENDED')).toBe(true);
    expect(canEndStaffAuctionLot('SCHEDULED')).toBe(false);
    expect(canEndStaffAuctionLot('ENDED')).toBe(false);
  });
});
