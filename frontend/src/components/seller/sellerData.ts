// These records are opt-in previews, never backend transactions.
export interface SellerOrder {
  id: string;
  buyer: string;
  city: string;
  product: string;
  image: string;
  price: number;
  payment: string;
  status: 'pending' | 'packing' | 'shipping' | 'delivered' | 'cancelled';
  type: 'auction' | 'retail';
  time: string;
}
export const orderStatuses = {
  pending: 'Chờ xác nhận',
  packing: 'Chờ giao GHN',
  shipping: 'Đang giao hàng',
  delivered: 'Đã giao thành công',
  cancelled: 'Đã hủy / Hoàn trả',
} as const;
export const previewOrders: SellerOrder[] = [
  {
    id: 'NX-991204',
    buyer: 'Trần Đình Khang',
    city: 'Quận 1, TP. Hồ Chí Minh',
    product: 'AP Royal Oak 41mm Blue Dial',
    image: '/images/watches/watch-1.png',
    price: 82500000,
    payment: 'PayOS · Ký quỹ',
    status: 'packing',
    type: 'auction',
    time: '14:15',
  },
  {
    id: 'NX-887410',
    buyer: 'Victoria Nguyen',
    city: 'Thủ Đức, TP. Hồ Chí Minh',
    product: 'Patek Philippe Celestial',
    image: '/images/watches/watch-2.png',
    price: 12800000,
    payment: 'PayOS · Escrow',
    status: 'pending',
    type: 'retail',
    time: '11:20',
  },
  {
    id: 'NX-774109',
    buyer: 'Nguyễn Hoàng Nam',
    city: 'Ba Đình, Hà Nội',
    product: 'Chronograph Titanium Limited',
    image: '/images/watches/watch-3.png',
    price: 9600000,
    payment: 'PayOS · Ký quỹ',
    status: 'packing',
    type: 'auction',
    time: '09:40',
  },
  {
    id: 'NX-774085',
    buyer: 'Lê Minh Anh',
    city: 'Hải Châu, Đà Nẵng',
    product: 'Royal Oak Offshore Edition',
    image: '/images/watches/watch-4.png',
    price: 24500000,
    payment: 'PayOS · Đã thanh toán',
    status: 'shipping',
    type: 'retail',
    time: '08:30',
  },
  {
    id: 'NX-773982',
    buyer: 'Phạm Quang Huy',
    city: 'Cầu Giấy, Hà Nội',
    product: 'Skeleton Tourbillon 3D',
    image: '/images/watches/watch-5.png',
    price: 68000000,
    payment: 'PayOS · Đã thanh toán',
    status: 'delivered',
    type: 'auction',
    time: 'Hôm qua',
  },
];
export interface SellerAuction {
  id: string;
  title: string;
  description: string;
  image: string;
  price: number;
  bids: number;
  status: 'live' | 'pending' | 'scheduled' | 'ended';
  model: string;
}
export const auctionStatuses = {
  live: 'Đang diễn ra',
  pending: 'Chờ thẩm định',
  scheduled: 'Sắp diễn ra',
  ended: 'Đã kết thúc',
} as const;
export const previewAuctions: SellerAuction[] = [
  {
    id: 'NX-9921',
    title: 'Đồng hồ AP Royal Oak Chronograph 3D',
    description: 'Thiết kế skeleton, bộ máy cơ khí và mặt số xanh đặc trưng.',
    image: '/images/watches/watch-1.png',
    price: 148000000,
    bids: 18,
    status: 'live',
    model: 'watch',
  },
  {
    id: 'NX-9922',
    title: 'Patek Philippe Celestial Blue',
    description: 'Vẻ đẹp bầu trời đêm trong một thiết kế giới hạn.',
    image: '/images/watches/watch-2.png',
    price: 85000000,
    bids: 9,
    status: 'live',
    model: 'watch',
  },
  {
    id: 'NX-3019',
    title: 'Chronograph Titanium Edition',
    description: 'Vỏ titanium, dây da thủ công và chứng nhận xuất xứ.',
    image: '/images/watches/watch-3.png',
    price: 24500000,
    bids: 41,
    status: 'ended',
    model: 'watch',
  },
  {
    id: 'NX-8820',
    title: 'Skeleton Tourbillon Limited',
    description: 'Kính sapphire và bộ máy tourbillon hoàn thiện thủ công.',
    image: '/images/watches/watch-5.png',
    price: 32000000,
    bids: 0,
    status: 'pending',
    model: 'watch',
  },
  {
    id: 'NX-8821',
    title: 'Royal Oak Offshore Collection',
    description: 'Phiên sưu tầm dành cho những thiết kế độc bản.',
    image: '/images/watches/watch-4.png',
    price: 60000000,
    bids: 0,
    status: 'scheduled',
    model: 'watch',
  },
];
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
export const money = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;
export const trustLabels: Record<string, string> = {
  EXCELLENT: 'Xuất sắc',
  GOOD: 'Tốt',
  STANDARD: 'Tiêu chuẩn',
  PROBATION: 'Cần cải thiện',
  SUSPENDED: 'Tạm ngưng',
};
