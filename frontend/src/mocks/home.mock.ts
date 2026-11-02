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
    id: 'ap-tourbillon',
    name: 'Audemars Piguet Royal Oak Chrono Tourbillon',
    price: 128500000,
    oldPrice: 145000000,
    rating: 4.9,
    sold: 160,
    image: '/images/watches/watch-1.png',
    badge: 'MALL',
  },
  {
    id: 'patek-celestial',
    name: 'Patek Philippe Grand Complications Celestial',
    price: 85000000,
    oldPrice: 95000000,
    rating: 4.9,
    sold: 240,
    image: '/images/watches/watch-2.png',
    badge: 'HOT',
  },
  {
    id: 'hublot-unico',
    name: 'Hublot Big Bang Unico Sapphire Skeleton Edition',
    price: 45000000,
    oldPrice: 52000000,
    rating: 4.8,
    sold: 90,
    image: '/images/watches/watch-3.png',
    badge: 'MALL',
  },
  {
    id: 'rolex-daytona',
    name: 'Rolex Submariner Date Oystersteel 41mm',
    price: 320000000,
    oldPrice: 340000000,
    rating: 5.0,
    sold: 147,
    image: '/images/watches/watch-4.png',
    badge: 'HOT',
  },
  {
    id: 'rm-055',
    name: 'Richard Mille RM 055 Bubba Watson Skeleton',
    price: 210000000,
    oldPrice: 230000000,
    rating: 4.9,
    sold: 88,
    image: '/images/watches/watch-5.png',
    badge: '3D LIVE',
  },
  {
    id: 'omega-speedmaster',
    name: 'Omega Speedmaster Moonwatch Professional Chronometer',
    price: 145000000,
    oldPrice: 175000000,
    rating: 4.9,
    sold: 154,
    image: '/images/watches/watch-6.png',
    badge: 'MALL',
  },
  {
    id: 'tissot-tourelles',
    name: 'Tissot Chemin des Tourelles Skeleton Dial Edition',
    price: 32000000,
    oldPrice: 38000000,
    rating: 4.8,
    sold: 340,
    image: '/images/watches/watch-7.png',
    badge: 'HOT',
  },
  {
    id: 'cartier-santos',
    name: 'Cartier Santos de Cartier Skeleton Automatic XL',
    price: 185000000,
    oldPrice: 200000000,
    rating: 4.9,
    sold: 200,
    image: '/images/watches/watch-8.png',
    badge: 'HOT',
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
