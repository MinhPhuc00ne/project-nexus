import type { CategoryNode } from '../services/products.service';

export interface DisplayCategory {
  id: string;
  name: string;
  slug: string;
  image: string;
  itemCountText?: string;
  subcategories?: string[];
}

export const CATEGORY_IMAGE_MAP: Record<string, string> = {
  'dong-ho-trang-suc':
    'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=320&q=80',
  'dong-ho-cao-cap':
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=320&q=80',
  'thiet-bi-dien-tu':
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=320&q=80',
  'cong-nghe-dien-tu':
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=320&q=80',
  'dien-thoai-phu-kien':
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=320&q=80',
  'thoi-trang':
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=320&q=80',
  'ban-phim-gear':
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=320&q=80',
  'co-vat-tac-pham':
    'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=320&q=80',
  'xe-co-phu-kien':
    'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=320&q=80',
};

const DEFAULT_CATEGORY_IMAGE =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=320&q=80';

export function getCategoryImageUrl(cat: { name: string; slug?: string }): string {
  const slug = (cat.slug || '').toLowerCase().trim();
  if (slug && CATEGORY_IMAGE_MAP[slug]) {
    return CATEGORY_IMAGE_MAP[slug];
  }

  const name = (cat.name || '').toLowerCase();
  if (name.includes('điện tử') || name.includes('công nghệ') || name.includes('điện thoại')) {
    return CATEGORY_IMAGE_MAP['thiet-bi-dien-tu'];
  }
  if (name.includes('thời trang') || name.includes('áo') || name.includes('quần')) {
    return CATEGORY_IMAGE_MAP['thoi-trang'];
  }
  if (name.includes('bàn phím') || name.includes('gear') || name.includes('chuột')) {
    return CATEGORY_IMAGE_MAP['ban-phim-gear'];
  }
  if (name.includes('cổ vật') || name.includes('tác phẩm') || name.includes('nghệ thuật')) {
    return CATEGORY_IMAGE_MAP['co-vat-tac-pham'];
  }
  if (name.includes('đồng hồ') || name.includes('trang sức')) {
    return CATEGORY_IMAGE_MAP['dong-ho-trang-suc'];
  }
  if (name.includes('xe') || name.includes('ô tô') || name.includes('mô tô')) {
    return CATEGORY_IMAGE_MAP['xe-co-phu-kien'];
  }

  return DEFAULT_CATEGORY_IMAGE;
}

export const FALLBACK_CATEGORY_TREE: CategoryNode[] = [
  {
    id: 'cat-elec',
    name: 'Thiết Bị Điện Tử',
    slug: 'thiet-bi-dien-tu',
    level: 1,
    children: [
      { id: 'cat-elec-phone', name: 'Điện Thoại & Tablet', slug: 'dien-thoai-tablet', level: 2 },
      { id: 'cat-elec-laptop', name: 'Laptop & Máy Tính', slug: 'laptop-may-tinh', level: 2 },
      { id: 'cat-elec-audio', name: 'Tai Nghe & Âm Thanh', slug: 'tai-nghe-am-thanh', level: 2 },
    ],
  },
  {
    id: 'cat-fashion',
    name: 'Thời Trang',
    slug: 'thoi-trang',
    level: 1,
    children: [
      { id: 'cat-fashion-men', name: 'Thời Trang Nam', slug: 'thoi-trang-nam', level: 2 },
      { id: 'cat-fashion-women', name: 'Thời Trang Nữ', slug: 'thoi-trang-nu', level: 2 },
      { id: 'cat-fashion-shoes', name: 'Giày Dép Sneaker', slug: 'giay-dep-sneaker', level: 2 },
    ],
  },
  {
    id: 'cat-gear',
    name: 'Bàn Phím & Gear',
    slug: 'ban-phim-gear',
    level: 1,
    children: [
      { id: 'cat-gear-custom', name: 'Bàn Phím Cơ Custom', slug: 'ban-phim-co-custom', level: 2 },
      { id: 'cat-gear-keycaps', name: 'Keycaps & Switches', slug: 'keycaps-switches', level: 2 },
      { id: 'cat-gear-mouse', name: 'Chuột Gaming Cao Cấp', slug: 'chuot-gaming', level: 2 },
    ],
  },
  {
    id: 'cat-antique',
    name: 'Cổ Vật & Tác Phẩm',
    slug: 'co-vat-tac-pham',
    level: 1,
    children: [
      { id: 'cat-antique-art', name: 'Tranh Hội Họa & Điêu Khắc', slug: 'tranh-hoi-hoa', level: 2 },
      { id: 'cat-antique-ceramic', name: 'Đồ Gốm Cổ', slug: 'do-gom-co', level: 2 },
      {
        id: 'cat-antique-coins',
        name: 'Tiền Xu & Huân Chương',
        slug: 'tien-xu-huan-chuong',
        level: 2,
      },
    ],
  },
  {
    id: 'cat-watch',
    name: 'Đồng Hồ & Trang Sức',
    slug: 'dong-ho-trang-suc',
    level: 1,
    children: [
      { id: 'cat-watch-luxury', name: 'Đồng Hồ Thụy Sỹ Luxury', slug: 'dong-ho-thuy-sy', level: 2 },
      { id: 'cat-watch-gold', name: 'Trang Sức Vàng Bạc', slug: 'trang-suc-vang-bac', level: 2 },
      { id: 'cat-watch-diamond', name: 'Kim Cương Đá Quý', slug: 'kim-cuong-da-quy', level: 2 },
    ],
  },
  {
    id: 'cat-auto',
    name: 'Xe Cộ & Phụ Kiện',
    slug: 'xe-co-phu-kien',
    level: 1,
    children: [
      { id: 'cat-auto-moto', name: 'Mô Tô Phân Khối Lớn', slug: 'mo-to-pkl', level: 2 },
      { id: 'cat-auto-car', name: 'Xe Hơi Cao Cấp', slug: 'xe-hoi-cao-cap', level: 2 },
      { id: 'cat-auto-accessories', name: 'Phụ Kiện & Đồ Chơi Xe', slug: 'phu-kien-xe', level: 2 },
    ],
  },
];
