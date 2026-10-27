import { BadRequestException } from '@nestjs/common';

export interface GhnParcelItem {
  name: string;
  quantity: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  price: number;
}

export interface GhnParcel {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  insuranceValue: number;
  serviceTypeId: number;
  items: GhnParcelItem[];
}

/** Packaging estimate: stack units vertically; GHN determines billable weight and price. */
export function buildGhnParcel(items: GhnParcelItem[]): GhnParcel {
  if (!items.length) throw new BadRequestException('Không có sản phẩm để tính cước GHN.');
  for (const item of items) {
    if (
      [item.quantity, item.weight, item.length, item.width, item.height].some(
        (value) => !Number.isSafeInteger(value) || value <= 0,
      ) ||
      !Number.isFinite(item.price) ||
      item.price < 0
    ) {
      throw new BadRequestException('Khối lượng, kích thước hoặc số lượng sản phẩm không hợp lệ.');
    }
  }
  const weightGrams = items.reduce((sum, item) => sum + item.weight * item.quantity, 0);
  const heightCm = items.reduce((sum, item) => sum + item.height * item.quantity, 0);
  const insuranceValue = Math.round(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
  if (![weightGrams, heightCm, insuranceValue].every(Number.isSafeInteger)) {
    throw new BadRequestException('Kiện hàng vượt giới hạn dữ liệu cho phép.');
  }
  return {
    weightGrams,
    lengthCm: Math.max(...items.map((item) => item.length)),
    widthCm: Math.max(...items.map((item) => item.width)),
    heightCm,
    insuranceValue,
    serviceTypeId: weightGrams >= 20000 ? 5 : 2,
    items: items.map((item) => ({ ...item, price: Math.round(item.price) })),
  };
}
