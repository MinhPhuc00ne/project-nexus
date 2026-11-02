export interface ProductOptionGroup {
  id?: string;
  name: string;
  values: string[];
}

export interface ProductSaleConfig {
  enabled: boolean;
  discountPercent: number;
  salePrice: number;
  label?: string;
  startAt?: string;
  endAt?: string;
}

export const PRESET_OPTION_GROUPS: Array<{ name: string; sampleValues: string[] }> = [
  { name: 'Màu sắc', sampleValues: ['Đen', 'Trắng', 'Xanh Navy', 'Bạc', 'Vàng Hồng'] },
  { name: 'Kích thước (Size)', sampleValues: ['S', 'M', 'L', 'XL'] },
  { name: 'Cỡ mặt / Đường kính', sampleValues: ['38mm', '40mm', '42mm', '44mm'] },
  { name: 'Phiên bản', sampleValues: ['Tiêu chuẩn', 'Cao cấp (Fullbox)', 'Bản giới hạn'] },
];

export function computeEffectiveSale(
  basePrice: number,
  sale?: ProductSaleConfig | null,
): {
  isOnSale: boolean;
  effectivePrice: number;
  originalPrice: number;
  discountPercent: number;
  label: string;
} {
  const safeBase = Number.isFinite(basePrice) && basePrice > 0 ? basePrice : 0;
  if (!sale?.enabled || safeBase <= 0 || sale.salePrice <= 0 || sale.salePrice >= safeBase) {
    return {
      isOnSale: false,
      effectivePrice: safeBase,
      originalPrice: safeBase,
      discountPercent: 0,
      label: '',
    };
  }
  const now = Date.now();
  if (
    (sale.startAt && new Date(sale.startAt).getTime() > now) ||
    (sale.endAt && new Date(sale.endAt).getTime() <= now)
  ) {
    return {
      isOnSale: false,
      effectivePrice: safeBase,
      originalPrice: safeBase,
      discountPercent: 0,
      label: '',
    };
  }
  return {
    isOnSale: true,
    effectivePrice: sale.salePrice,
    originalPrice: safeBase,
    discountPercent: Math.max(1, Math.round(((safeBase - sale.salePrice) / safeBase) * 100)),
    label: sale.label || 'SALE',
  };
}

export function saleConfigFromApi(
  basePrice: number,
  salePrice?: number | null,
  saleStartsAt?: string | null,
  saleEndsAt?: string | null,
): ProductSaleConfig | undefined {
  if (!salePrice || salePrice >= basePrice) return undefined;
  return {
    enabled: true,
    salePrice: Number(salePrice),
    discountPercent: Math.max(1, Math.round(((basePrice - Number(salePrice)) / basePrice) * 100)),
    label: 'SALE',
    startAt: saleStartsAt ?? undefined,
    endAt: saleEndsAt ?? undefined,
  };
}
