import type { AdminCommerceData, CommerceChange } from './commerceTypes';

/** Supported administrator dashboard navigation tabs. */
export type AdminTab =
  | 'overview'
  | 'auctions'
  | 'categories'
  | 'banners'
  | 'users'
  | 'sellers'
  | 'products'
  | 'orders'
  | 'stores'
  | 'reports'
  | 'refunds'
  | 'finance'
  | 'system'
  | 'settings';

/** Auction listing item representing pending, scheduled, or live bidding events. */
export interface AuctionItem {
  id: string;
  name: string;
  seller: string;
  /** Starting bid price in VND */
  price: number;
  /** 3D model preset key */
  preset: string;
  time: string;
  /** Session duration in minutes */
  duration: number;
  image: string;
  status: 'pending' | 'scheduled' | 'live';
}

/** Shared dashboard state owned by AdminLayout and distributed down to tab panels. */
export interface AdminData extends AdminCommerceData {
  auctions: AuctionItem[];
}

/** Action callbacks dispatched from administrator tab views to the root layout. */
export interface AdminActions {
  updateCommerce: (change: CommerceChange) => void;
  navigate: (tab: AdminTab) => void;
  showDetail: (title: string, content: string) => void;
  notify: (message: string) => void;
}

// Props chung: data dùng để đọc/hiển thị, actions dùng để báo thao tác về trang cha.
export interface AdminTabProps {
  pendingRefundCount?: number;
  data: AdminData;
  actions: AdminActions;
}
