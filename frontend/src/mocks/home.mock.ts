import type { HomeCategory, HomeProduct } from '../components/home/home.types';

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
