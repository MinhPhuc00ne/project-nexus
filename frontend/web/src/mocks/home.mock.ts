import type { HomeCategory, HomeProduct, HomeHeroSlide } from '../components/home/home.types';

export const categories: HomeCategory[] = [
  {
    id: 1,
    name: 'Thiết Bị Điện Tử',
    image:
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=320&q=80',
  },
  {
    id: 2,
    name: 'Thời Trang',
    image:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=320&q=80',
  },
  {
    id: 3,
    name: 'Bàn Phím & Gear',
    image:
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=320&q=80',
  },
  {
    id: 4,
    name: 'Cổ Vật & Tác Phẩm',
    image:
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=320&q=80',
  },
  {
    id: 5,
    name: 'Đồng Hồ & Trang Sức',
    image:
      'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=320&q=80',
  },
  {
    id: 6,
    name: 'Xe Cộ & Phụ Kiện',
    image:
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=320&q=80',
  },
];

export const flashSaleProducts: HomeProduct[] = [
  {
    id: 1,
    name: 'Bàn Phím Cơ Billet Brass Deck',
    price: 16200000,
    oldPrice: 24998000,
    discount: 35,
    rating: 4.9,
    saleSold: 45,
    image:
      'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 2,
    name: 'Áo Khoác Techwear CORE-PRO',
    price: 8900000,
    oldPrice: 12360000,
    discount: 28,
    rating: 4.8,
    saleSold: 32,
    image:
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 3,
    name: 'Ví Lạnh Titanium VaultKey EAL7',
    price: 6500000,
    oldPrice: 10800000,
    discount: 40,
    rating: 4.7,
    saleSold: 27,
    image:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 4,
    name: 'Tai Nghe Planar Magnetic Alpha',
    price: 34500000,
    oldPrice: 43125000,
    discount: 20,
    rating: 4.9,
    saleSold: 18,
    image:
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80',
  },
];

export const auctionProducts: HomeProduct[] = [
  {
    id: 1,
    name: 'Siêu Xe Concept G7 Carbon',
    price: 245000000,
    oldPrice: 320000000,
    discount: 23,
    rating: 4.8,
    sold: 96,
    image:
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 2,
    name: 'Đồng Hồ Chronograph Titan',
    price: 18500000,
    oldPrice: 24000000,
    discount: 23,
    rating: 4.9,
    sold: 72,
    image:
      'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 3,
    name: 'Bình Ngọc Cổ Điển 3D',
    price: 9800000,
    oldPrice: 13000000,
    discount: 25,
    rating: 4.8,
    sold: 58,
    image:
      'https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 4,
    name: 'Xe Máy Điện Concept Nexus-V',
    price: 180000000,
    oldPrice: 220000000,
    discount: 18,
    rating: 4.9,
    sold: 19,
    image:
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80',
  },
];

export const recommendationProducts: HomeProduct[] = [
  {
    id: 1,
    name: 'Bộ Khuếch Đại Âm Thanh Mini',
    price: 1200000,
    oldPrice: 1800000,
    rating: 4.9,
    sold: 160,
    image:
      'https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 2,
    name: 'Loa Bluetooth Studio X8',
    price: 2450000,
    oldPrice: 3200000,
    rating: 4.8,
    sold: 240,
    image:
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 3,
    name: 'Laptop Gaming 14 inch',
    price: 26400000,
    oldPrice: 34000000,
    rating: 4.9,
    sold: 90,
    image:
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 4,
    name: 'TV Smart OLED 4K 55 inch',
    price: 18900000,
    oldPrice: 24900000,
    rating: 4.7,
    sold: 147,
    image:
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 5,
    name: 'Máy Chụp Ảnh Mini Pocket',
    price: 5400000,
    oldPrice: 7200000,
    rating: 4.8,
    sold: 88,
    image:
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 6,
    name: 'Ghế Gamming Ergonomic',
    price: 8900000,
    oldPrice: 12500000,
    rating: 4.7,
    sold: 120,
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 7,
    name: 'Tai Nghe Không Dây Elite',
    price: 3200000,
    oldPrice: 4500000,
    rating: 4.8,
    sold: 340,
    image:
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 8,
    name: 'Đèn Chiếu Sáng RGB Pro',
    price: 1800000,
    oldPrice: 2500000,
    rating: 4.6,
    sold: 200,
    image:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80',
  },
];

export const heroSlides: HomeHeroSlide[] = [
  {
    badge: 'SIÊU ĐẠI TIỆC THƯƠNG MẠI & ĐẤU GIÁ',
    title: 'Mua Sắm Hàng Hiệu Chuẩn',
    accent: 'Mall, Trải Nghiệm Đấu Giá 3D 360°',
    description:
      'Giao hàng linh hoạt cho khách vãng lai. Tích hợp vận chuyển và thanh toán ký quỹ an toàn.',
    image: auctionProducts[0].image || '',
  },
  {
    badge: 'FLASH SALE HÔM NAY',
    title: 'Săn Deal Hot Cho Mỗi Gia Đình,',
    accent: 'Giảm Tới 50% Trong 24h',
    description:
      'Khám các sản phẩm hot, ưu đãi theo danh mục, đồng thời nhận voucher và miễn phí vận chuyển.',
    image: flashSaleProducts[0].image || '',
  },
  {
    badge: 'ĐẤU GIÁ 3D TRỰC TIẾP',
    title: 'Mở Bán Chỉ Với Một Click,',
    accent: 'Đặt Giá Dễ Dàng, An Toàn',
    description:
      'Tham gia đấu giá 3D trực tiếp, theo dõi lô hàng real-time và săn ưu đãi khởi điểm hấp dẫn.',
    image: auctionProducts[1].image || '',
  },
];
