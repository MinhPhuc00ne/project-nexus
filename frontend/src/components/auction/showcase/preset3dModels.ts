import type { AuctionConsignmentItem } from '../../../services/auction.service';

export type Preset3DModelKey =
  | 'preset_watch'
  | 'preset_painting'
  | 'preset_car'
  | 'preset_diamond_ring'
  | 'preset_villa'
  | 'preset_laptop'
  | 'preset_royal_ring'
  | 'preset_keyboard'
  | 'preset_phone'
  | 'preset_headphone'
  | 'preset_diamond';

export interface Preset3DModelMeta {
  key: Preset3DModelKey;
  index: number;
  label: string;
  englishLabel: string;
  accentColor: string;
  secondaryColor: string;
  keywords: string[];
  excludedPrefixes?: string[];
}

/**
 * 10 mô hình 3D dựng sẵn cho phòng triển lãm đấu giá:
 * 1. Đồng hồ, 2. Bức Tranh, 3. Xe, 4. Nhẫn (Kim cương), 5. Biệt Thự,
 * 6. Laptop, 7. Nhẫn (Hoàng gia / Đá quý), 8. Bàn phím, 9. Điện thoại, 10. Tai nghe.
 */
export const PRESET_3D_MODELS: Preset3DModelMeta[] = [
  {
    key: 'preset_watch',
    index: 1,
    label: 'Đồng hồ',
    englishLabel: 'LUXURY TIMEPIECE 3D',
    accentColor: '#f59e0b',
    secondaryColor: '#38bdf8',
    keywords: ['đồng hồ', 'dong ho', 'rolex', 'patek', 'omega', 'audemars', 'watch', 'chronograph'],
    excludedPrefixes: [
      'hộp đựng',
      'hop dung',
      'dây đeo',
      'day da',
      'khăn',
      'gối',
      'pin',
      'kính lúp',
    ],
  },
  {
    key: 'preset_painting',
    index: 2,
    label: 'Bức Tranh',
    englishLabel: 'MASTERPIECE CANVAS 3D',
    accentColor: '#eab308',
    secondaryColor: '#f97316',
    keywords: [
      'bức tranh',
      'buc tranh',
      'tranh sơn',
      'tranh vẽ',
      'tranh cổ',
      'hội họa',
      'painting',
    ],
  },
  {
    key: 'preset_car',
    index: 3,
    label: 'Xe',
    englishLabel: 'COLLECTOR VEHICLE 3D',
    accentColor: '#ef4444',
    secondaryColor: '#fbbf24',
    keywords: [
      'siêu xe',
      'sieu xe',
      'ô tô',
      'o to',
      'xe cổ',
      'xe hơi',
      'porsche',
      'ferrari',
      'lamborghini',
      'mô hình xe',
    ],
  },
  {
    key: 'preset_diamond_ring',
    index: 4,
    label: 'Nhẫn Kim Cương',
    englishLabel: 'SOLITAIRE DIAMOND RING 3D',
    accentColor: '#38bdf8',
    secondaryColor: '#e0f2fe',
    keywords: ['nhẫn kim cương', 'nhan kim cuong', 'nhẫn cưới', 'solitaire', 'diamond ring'],
  },
  {
    key: 'preset_villa',
    index: 5,
    label: 'Biệt Thự',
    englishLabel: 'LUXURY VILLA ESTATE 3D',
    accentColor: '#10b981',
    secondaryColor: '#fbbf24',
    keywords: ['biệt thự', 'biet thu', 'villa', 'dinh thự', 'bất động sản', 'penthouse'],
  },
  {
    key: 'preset_laptop',
    index: 6,
    label: 'Laptop',
    englishLabel: 'WORKSTATION LAPTOP 3D',
    accentColor: '#60a5fa',
    secondaryColor: '#a78bfa',
    keywords: ['laptop', 'macbook', 'thinkpad', 'ultrabook', 'máy tính xách tay'],
    excludedPrefixes: ['túi chống sốc', 'quạt tản nhiệt', 'nút cao su'],
  },
  {
    key: 'preset_royal_ring',
    index: 7,
    label: 'Nhẫn Hoàng Gia',
    englishLabel: 'ROYAL GEMSTONE RING 3D',
    accentColor: '#a855f7',
    secondaryColor: '#fbbf24',
    keywords: ['nhẫn', 'nhan ', 'ring', 'nhẫn vàng', 'nhẫn đá quý', 'nhẫn cổ'],
  },
  {
    key: 'preset_keyboard',
    index: 8,
    label: 'Bàn phím',
    englishLabel: 'CUSTOM MECHANICAL KEYBOARD 3D',
    accentColor: '#06b6d4',
    secondaryColor: '#ec4899',
    keywords: ['bàn phím', 'ban phim', 'keyboard', 'keycap'],
    excludedPrefixes: ['bộ chổi', 'vệ sinh', 'đèn led'],
  },
  {
    key: 'preset_phone',
    index: 9,
    label: 'Điện thoại',
    englishLabel: 'FLAGSHIP SMARTPHONE 3D',
    accentColor: '#818cf8',
    secondaryColor: '#22d3ee',
    keywords: ['điện thoại', 'dien thoai', 'iphone', 'smartphone', 'samsung galaxy', 'vertu'],
    excludedPrefixes: ['giá đỡ', 'kính cường lực', 'ốp lưng', 'cáp sạc', 'bút cảm ứng'],
  },
  {
    key: 'preset_headphone',
    index: 10,
    label: 'Tai nghe',
    englishLabel: 'STUDIO HI-FI HEADPHONE 3D',
    accentColor: '#f43f5e',
    secondaryColor: '#fbbf24',
    keywords: ['tai nghe', 'headphone', 'airpods', 'earphone', 'extra bass'],
    excludedPrefixes: ['hộp đựng', 'đệm bọt', 'cáp chuyển'],
  },
  {
    key: 'preset_diamond',
    index: 11,
    label: 'Kim cương',
    englishLabel: 'BRILLIANT-CUT DIAMOND 3D',
    accentColor: '#38bdf8',
    secondaryColor: '#f0f9ff',
    keywords: ['kim cương', 'kim cuong', 'diamond', 'hột xoàn', 'viên xoàn'],
    excludedPrefixes: ['nhẫn', 'nhan ', 'bông tai', 'dây chuyền', 'vòng cổ'],
  },
];

export type ShowcaseVisualResolution =
  | {
      mode: '3d-preset';
      preset: Preset3DModelMeta;
      images: string[];
    }
  | {
      mode: 'gallery-frame';
      images: string[];
    };

/**
 * Xác định sản phẩm của Seller có nằm trong 10 model 3D dựng sẵn hay không.
 * Nếu thuộc 10 model -> dùng model 3D tương ứng.
 * Nếu không thuộc -> tự động dựng Khung Tranh 3D đóng gói các hình ảnh của Seller.
 */
export function resolveShowcaseItemVisual(
  item: Pick<AuctionConsignmentItem, 'title' | 'threeModelKey' | 'images'>,
): ShowcaseVisualResolution {
  const images = (item.images || []).filter((url) => Boolean(url && url.trim()));
  const rawKey = item.threeModelKey?.trim().toLowerCase();

  if (rawKey) {
    const byKey = PRESET_3D_MODELS.find((m) => m.key === rawKey);
    if (byKey) {
      return { mode: '3d-preset', preset: byKey, images };
    }
  }

  const normalizedTitle = (item.title || '').toLowerCase();
  for (const model of PRESET_3D_MODELS) {
    if (model.excludedPrefixes?.some((prefix) => normalizedTitle.includes(prefix))) {
      continue;
    }
    if (model.keywords.some((kw) => normalizedTitle.includes(kw))) {
      return { mode: '3d-preset', preset: model, images };
    }
  }

  return { mode: 'gallery-frame', images };
}
