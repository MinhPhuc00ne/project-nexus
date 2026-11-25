import { formatCurrency } from '../../i18n/formatters';

/** How the seller's auctions page describes a lot it is showing. */
export interface SellerAuction {
  id: string;
  title: string;
  description: string;
  image: string;
  price: number;
  bids: number;
  itemCount?: number;
  status: 'live' | 'pending' | 'scheduled' | 'ended';
  model: string;
  consignmentDeadline?: string | null;
  isConsignmentLocked?: boolean;
}
export const auctionStatuses = {
  live: 'Đang diễn ra',
  pending: 'Chờ thẩm định',
  scheduled: 'Sắp diễn ra',
  ended: 'Đã kết thúc',
} as const;
export interface SellerDraft {
  id: string;
  kind: 'product' | 'auction';
  title: string;
  description: string;
  price: number;
  quantity: number;
  category: string;
  model: string;
  startTime: string;
  endTime: string;
  increment: number;
  createdAt: string;
}
export const money = (value: number) => formatCurrency(value);
export const trustLabels: Record<string, string> = {
  EXCELLENT: 'Xuất sắc',
  GOOD: 'Tốt',
  STANDARD: 'Tiêu chuẩn',
  PROBATION: 'Cần cải thiện',
  SUSPENDED: 'Tạm ngưng',
};
