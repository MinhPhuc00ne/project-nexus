/* ─────────── Buyer Orders Mock Data & Types ─────────── */
export type BuyerOrderStatus =
  'ALL' | 'PENDING' | 'CONFIRMED' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED';

export interface BuyerOrderItem {
  id: string;
  product: string;
  shopName: string;
  price: string;
  qty: number;
  status: Exclude<BuyerOrderStatus, 'ALL'>;
  date: string;
  img: string;
  canReview: boolean;
  canReturn: boolean;
}

export const MOCK_BUYER_ORDERS: BuyerOrderItem[] = [
  {
    id: 'NX-20241020-001',
    product: 'Audemars Piguet Royal Oak Chrono Tourbillon 3D Skeleton',
    shopName: 'NEXUS Official Flagship Mall',
    price: '128.500.000 ₫',
    qty: 1,
    status: 'DELIVERING',
    date: '20/10/2024',
    img: '/images/watches/watch-1.png',
    canReview: false,
    canReturn: false,
  },
  {
    id: 'NX-20241018-004',
    product: 'Patek Philippe Grand Complications Celestial Blue Dial',
    shopName: 'Geneva Luxury Watch Co.',
    price: '85.000.000 ₫',
    qty: 1,
    status: 'COMPLETED',
    date: '18/10/2024',
    img: '/images/watches/watch-2.png',
    canReview: true,
    canReturn: true,
  },
  {
    id: 'NX-20241015-009',
    product: 'Richard Mille RM 055 Bubba Watson NTPT Carbon',
    shopName: 'Swiss Elite Timepieces',
    price: '210.000.000 ₫',
    qty: 1,
    status: 'PENDING',
    date: '15/10/2024',
    img: '/images/watches/watch-3.png',
    canReview: false,
    canReturn: false,
  },
  {
    id: 'NX-20241010-017',
    product: 'Rolex Daytona Rainbow Bezel Pave Diamonds',
    shopName: 'Crown & Calibre VN',
    price: '320.000.000 ₫',
    qty: 1,
    status: 'COMPLETED',
    date: '10/10/2024',
    img: '/images/watches/watch-4.png',
    canReview: false,
    canReturn: false,
  },
  {
    id: 'NX-20241005-022',
    product: 'Hublot Big Bang Unico Ferrari Carbon Fiber',
    shopName: 'NEXUS Official Flagship Mall',
    price: '95.000.000 ₫',
    qty: 2,
    status: 'CANCELLED',
    date: '05/10/2024',
    img: '/images/watches/watch-5.png',
    canReview: false,
    canReturn: false,
  },
  {
    id: 'NX-20240928-031',
    product: 'Vacheron Constantin Overseas Perpetual Calendar',
    shopName: 'Maison du Temps',
    price: '450.000.000 ₫',
    qty: 1,
    status: 'CONFIRMED',
    date: '28/09/2024',
    img: '/images/watches/watch-6.png',
    canReview: false,
    canReturn: false,
  },
];

/* ─────────── Order Detail Mock ─────────── */
export interface BuyerOrderDetail {
  id: string;
  status: 'DELIVERING' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  date: string;
  product: {
    name: string;
    shopName: string;
    price: number;
    qty: number;
    img: string;
    variant: string;
  };
  shipping: {
    fee: number;
    method: string;
    trackingCode: string;
    estimatedDate: string;
  };
  address: {
    name: string;
    phone: string;
    address: string;
  };
  payment: {
    method: string;
    subtotal: number;
    shippingFee: number;
    discount: number;
    total: number;
  };
  timeline: {
    label: string;
    time: string;
    done: boolean;
    active?: boolean;
  }[];
}

export const MOCK_ORDER_DETAIL: BuyerOrderDetail = {
  id: 'NX-20241020-001',
  status: 'DELIVERING',
  date: '20/10/2024 08:32',
  product: {
    name: 'Audemars Piguet Royal Oak Chrono Tourbillon 3D Skeleton',
    shopName: 'NEXUS Official Flagship Mall',
    price: 128500000,
    qty: 1,
    img: '/images/watches/watch-1.png',
    variant: 'Titanium Case • Rubber Strap',
  },
  shipping: {
    fee: 0,
    method: 'GHN Express – Giao hàng siêu tốc',
    trackingCode: 'GHN10293847',
    estimatedDate: '22/10/2024',
  },
  address: {
    name: 'Nguyễn Văn An',
    phone: '0912 345 678',
    address: '123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  },
  payment: {
    method: 'NEXUS Pay (Ký quỹ Escrow)',
    subtotal: 128500000,
    shippingFee: 0,
    discount: 0,
    total: 128500000,
  },
  timeline: [
    { label: 'Đặt hàng thành công', time: '20/10 08:32', done: true },
    { label: 'Người bán xác nhận', time: '20/10 09:15', done: true },
    { label: 'Bàn giao vận chuyển', time: '20/10 14:00', done: true },
    { label: 'Đang giao hàng', time: 'Dự kiến 22/10', done: false, active: true },
    { label: 'Giao hàng thành công', time: '', done: false },
    { label: 'Hoàn tất – Giải ngân', time: '', done: false },
  ],
};

/* ─────────── Buyer Bids Mock Data & Types ─────────── */
export type BuyerBidStatus = 'ALL' | 'ACTIVE' | 'WINNING' | 'OUTBID' | 'WON' | 'LOST' | 'ENDED';

export interface BuyerBid {
  id: string;
  auctionId: string;
  productName: string;
  img: string;
  myBid: number;
  currentBid: number;
  endTime: string;
  timeLeft: string;
  status: Exclude<BuyerBidStatus, 'ALL'>;
  totalBids: number;
  startPrice: number;
}

export const MOCK_BUYER_BIDS: BuyerBid[] = [
  {
    id: 'BID001',
    auctionId: 'AUC2024001',
    productName: 'Patek Philippe Nautilus 5726A Annual Calendar',
    img: '/images/watches/watch-2.png',
    myBid: 420000000,
    currentBid: 420000000,
    endTime: '21/10/2024 22:00',
    timeLeft: '2 giờ 30 phút',
    status: 'WINNING',
    totalBids: 24,
    startPrice: 300000000,
  },
  {
    id: 'BID002',
    auctionId: 'AUC2024002',
    productName: 'Rolex Submariner Date 116610LN Ceramic Bezel',
    img: '/images/watches/watch-1.png',
    myBid: 85000000,
    currentBid: 91000000,
    endTime: '21/10/2024 20:00',
    timeLeft: '30 phút',
    status: 'OUTBID',
    totalBids: 38,
    startPrice: 60000000,
  },
  {
    id: 'BID003',
    auctionId: 'AUC2024003',
    productName: 'A. Lange & Söhne Datograph Up/Down Platinum',
    img: '/images/watches/watch-3.png',
    myBid: 650000000,
    currentBid: 650000000,
    endTime: '22/10/2024 18:00',
    timeLeft: '1 ngày 4 giờ',
    status: 'ACTIVE',
    totalBids: 11,
    startPrice: 500000000,
  },
  {
    id: 'BID004',
    auctionId: 'AUC2024004',
    productName: 'Audemars Piguet Royal Oak Offshore Chronograph',
    img: '/images/watches/watch-4.png',
    myBid: 180000000,
    currentBid: 210000000,
    endTime: '18/10/2024 15:00',
    timeLeft: 'Đã kết thúc',
    status: 'LOST',
    totalBids: 52,
    startPrice: 150000000,
  },
  {
    id: 'BID005',
    auctionId: 'AUC2024005',
    productName: 'Hublot Classic Fusion Aerofusion Moonphase Titanium',
    img: '/images/watches/watch-5.png',
    myBid: 75000000,
    currentBid: 75000000,
    endTime: '15/10/2024 10:00',
    timeLeft: 'Đã kết thúc',
    status: 'WON',
    totalBids: 29,
    startPrice: 50000000,
  },
];

/* ─────────── Buyer Wallet Mock Data & Types ─────────── */
export type BuyerTxType = 'TOP_UP' | 'PAYMENT' | 'REFUND' | 'ESCROW_LOCK' | 'ESCROW_RELEASE';

export type BuyerFilterType = 'ALL' | 'TOP_UP' | 'PAYMENT' | 'REFUND';

export interface BuyerTransaction {
  id: string;
  type: BuyerTxType;
  label: string;
  amount: number;
  date: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  ref?: string;
}

export const MOCK_BUYER_TRANSACTIONS: BuyerTransaction[] = [
  {
    id: 'TX001',
    type: 'TOP_UP',
    label: 'Nạp tiền qua PayOS',
    amount: 5000000,
    date: '20/10/2024 09:12',
    status: 'COMPLETED',
    ref: 'PAYOS-293847',
  },
  {
    id: 'TX002',
    type: 'ESCROW_LOCK',
    label: 'Ký quỹ đơn NX-20241020-001',
    amount: -128500000,
    date: '20/10/2024 08:35',
    status: 'COMPLETED',
    ref: 'NX-20241020-001',
  },
  {
    id: 'TX003',
    type: 'REFUND',
    label: 'Hoàn tiền đơn NX-20241005-022',
    amount: 95000000,
    date: '10/10/2024 14:20',
    status: 'COMPLETED',
    ref: 'NX-20241005-022',
  },
  {
    id: 'TX004',
    type: 'TOP_UP',
    label: 'Nạp tiền qua VNPay',
    amount: 10000000,
    date: '01/10/2024 10:05',
    status: 'COMPLETED',
    ref: 'VNPAY-109283',
  },
  {
    id: 'TX005',
    type: 'PAYMENT',
    label: 'Thanh toán đơn NX-20241018-004',
    amount: -85000000,
    date: '18/10/2024 16:45',
    status: 'COMPLETED',
    ref: 'NX-20241018-004',
  },
  {
    id: 'TX006',
    type: 'ESCROW_RELEASE',
    label: 'Giải ngân đặt cọc đấu giá',
    amount: 5000000,
    date: '15/09/2024 11:00',
    status: 'COMPLETED',
    ref: 'AUC-20240915',
  },
  {
    id: 'TX007',
    type: 'TOP_UP',
    label: 'Nạp tiền qua PayOS VietQR',
    amount: 2000000,
    date: '05/09/2024 08:30',
    status: 'PENDING',
    ref: 'PAYOS-82763',
  },
];

/* ─────────── Buyer Disputes Mock Data & Types ─────────── */
export type BuyerDisputeStatus = 'ALL' | 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';

export type BuyerDisputeReason =
  'NOT_RECEIVED' | 'ITEM_DEFECTIVE' | 'WRONG_ITEM' | 'COUNTERFEIT' | 'OTHER';

export interface BuyerDispute {
  id: string;
  orderId: string;
  product: string;
  img: string;
  reason: BuyerDisputeReason;
  amount: number;
  status: Exclude<BuyerDisputeStatus, 'ALL'>;
  openDate: string;
  updateDate: string;
  messages: number;
  resolution?: string;
}

export const MOCK_BUYER_DISPUTES: BuyerDispute[] = [
  {
    id: 'DSP001',
    orderId: 'NX-20241005-022',
    product: 'Hublot Big Bang Unico Ferrari Carbon Fiber',
    img: '/images/watches/watch-5.png',
    reason: 'ITEM_DEFECTIVE',
    amount: 95000000,
    status: 'RESOLVED',
    openDate: '08/10/2024',
    updateDate: '12/10/2024',
    messages: 5,
    resolution: 'Hoàn tiền 100% thành công vào ví NEXUS Pay',
  },
  {
    id: 'DSP002',
    orderId: 'NX-20241010-017',
    product: 'Rolex Daytona Rainbow Bezel Pave Diamonds',
    img: '/images/watches/watch-4.png',
    reason: 'WRONG_ITEM',
    amount: 320000000,
    status: 'UNDER_REVIEW',
    openDate: '14/10/2024',
    updateDate: '20/10/2024',
    messages: 3,
  },
  {
    id: 'DSP003',
    orderId: 'NX-20240928-031',
    product: 'Vacheron Constantin Overseas Perpetual Calendar',
    img: '/images/watches/watch-6.png',
    reason: 'NOT_RECEIVED',
    amount: 450000000,
    status: 'OPEN',
    openDate: '05/10/2024',
    updateDate: '10/10/2024',
    messages: 2,
  },
  {
    id: 'DSP004',
    orderId: 'NX-20241015-009',
    product: 'Richard Mille RM 055 Bubba Watson NTPT Carbon',
    img: '/images/watches/watch-3.png',
    reason: 'COUNTERFEIT',
    amount: 210000000,
    status: 'REJECTED',
    openDate: '16/10/2024',
    updateDate: '19/10/2024',
    messages: 8,
    resolution: 'Chuyên gia giám định NEXUS xác nhận sản phẩm chính hãng kèm thẻ NFC đầy đủ.',
  },
];

/* ─────────── Buyer Wishlist Mock Data & Types ─────────── */
export interface BuyerWishItem {
  id: string;
  name: string;
  shopName: string;
  price: number;
  originalPrice?: number;
  img: string;
  rating: number;
  sold: number;
  inStock: boolean;
  category: string;
}

export const MOCK_BUYER_WISHLIST: BuyerWishItem[] = [
  {
    id: 'ap-tourbillon',
    name: 'Audemars Piguet Royal Oak Chrono Tourbillon 3D Skeleton',
    shopName: 'NEXUS Official Flagship Mall',
    price: 128500000,
    img: '/images/watches/watch-1.png',
    rating: 4.9,
    sold: 12,
    inStock: true,
    category: 'Đồng hồ',
  },
  {
    id: 'patek-celestial',
    name: 'Patek Philippe Grand Complications Celestial Blue Dial',
    shopName: 'Geneva Luxury Watch Co.',
    price: 85000000,
    originalPrice: 92000000,
    img: '/images/watches/watch-2.png',
    rating: 4.8,
    sold: 7,
    inStock: true,
    category: 'Đồng hồ',
  },
  {
    id: 'rm055',
    name: 'Richard Mille RM 055 Bubba Watson NTPT Carbon Limited',
    shopName: 'Swiss Elite Timepieces',
    price: 210000000,
    img: '/images/watches/watch-3.png',
    rating: 5.0,
    sold: 3,
    inStock: false,
    category: 'Đồng hồ',
  },
  {
    id: 'rolex-daytona',
    name: 'Rolex Daytona Rainbow Bezel Pave Diamond Indices',
    shopName: 'Crown & Calibre VN',
    price: 320000000,
    img: '/images/watches/watch-4.png',
    rating: 4.9,
    sold: 5,
    inStock: true,
    category: 'Đồng hồ',
  },
  {
    id: 'hublot-ferrari',
    name: 'Hublot Big Bang Unico Ferrari Carbon Fiber Racing',
    shopName: 'NEXUS Official Flagship Mall',
    price: 95000000,
    originalPrice: 105000000,
    img: '/images/watches/watch-5.png',
    rating: 4.7,
    sold: 19,
    inStock: true,
    category: 'Đồng hồ',
  },
  {
    id: 'vc-overseas',
    name: 'Vacheron Constantin Overseas Perpetual Calendar Ultra-Thin',
    shopName: 'Maison du Temps',
    price: 450000000,
    img: '/images/watches/watch-6.png',
    rating: 5.0,
    sold: 2,
    inStock: true,
    category: 'Đồng hồ',
  },
];

/* ─────────── Buyer Dashboard Mock Data & Types ─────────── */
export interface BuyerDashboardRecentOrder {
  id: string;
  product: string;
  price: string;
  status: 'DELIVERING' | 'COMPLETED' | 'PENDING' | 'CANCELLED';
  date: string;
  img: string;
}

export const MOCK_BUYER_RECENT_ORDERS: BuyerDashboardRecentOrder[] = [
  {
    id: 'NX-20241020-001',
    product: 'Audemars Piguet Royal Oak Tourbillon',
    price: '128.500.000 ₫',
    status: 'DELIVERING',
    date: '20/10/2024',
    img: '/images/watches/watch-1.png',
  },
  {
    id: 'NX-20241018-004',
    product: 'Patek Philippe Celestial Blue Dial',
    price: '85.000.000 ₫',
    status: 'COMPLETED',
    date: '18/10/2024',
    img: '/images/watches/watch-2.png',
  },
  {
    id: 'NX-20241015-009',
    product: 'Richard Mille RM 055 Bubba Watson',
    price: '210.000.000 ₫',
    status: 'PENDING',
    date: '15/10/2024',
    img: '/images/watches/watch-3.png',
  },
];

export type BuyerDashboardStatKey = 'orders' | 'wishlist' | 'wallet' | 'bids';

export interface BuyerDashboardStatItem {
  key: BuyerDashboardStatKey;
  label: string;
  value: string;
  sub: string;
  color: string;
  link: string;
}

export const MOCK_BUYER_DASHBOARD_STATS: BuyerDashboardStatItem[] = [
  {
    key: 'orders',
    label: 'Đơn hàng',
    value: '12',
    sub: '3 đang giao',
    color: 'from-blue-500 to-indigo-600',
    link: '/buyer/orders',
  },
  {
    key: 'wishlist',
    label: 'Yêu thích',
    value: '28',
    sub: '5 còn hàng',
    color: 'from-rose-500 to-pink-600',
    link: '/buyer/wishlist',
  },
  {
    key: 'wallet',
    label: 'Số dư ví',
    value: '4.500.000 ₫',
    sub: 'NEXUS Pay',
    color: 'from-amber-500 to-orange-500',
    link: '/buyer/wallet',
  },
  {
    key: 'bids',
    label: 'Đấu giá',
    value: '3',
    sub: '1 đang dẫn đầu',
    color: 'from-violet-500 to-purple-600',
    link: '/buyer/bids',
  },
];
