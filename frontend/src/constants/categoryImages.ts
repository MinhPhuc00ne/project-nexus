/**
 * The photograph shown for a category.
 *
 * These illustrate categories the backend actually has; they do not invent any.
 * They lived in `mocks/` beside a hardcoded `FALLBACK_CATEGORY_TREE` that the
 * home page and the category page showed whenever the API failed or answered
 * with nothing — a shopper then browsed categories that may not exist, and
 * clicking one led nowhere. The tree is gone; the pictures are not mock data
 * and belong here.
 */

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
