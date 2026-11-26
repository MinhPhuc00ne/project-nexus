import { Prisma } from '@prisma/client';
export interface PricedProduct {
  basePrice: Prisma.Decimal | number;
  salePrice?: Prisma.Decimal | number | null;
  saleStartsAt?: Date | null;
  saleEndsAt?: Date | null;
}
export function effectivePrice(product: PricedProduct, now = new Date()): number {
  const base = Number(product.basePrice);
  const sale =
    product.salePrice === null || product.salePrice === undefined
      ? null
      : Number(product.salePrice);
  return sale !== null &&
    sale >= 1000 &&
    sale < base &&
    (!product.saleStartsAt || product.saleStartsAt <= now) &&
    (!product.saleEndsAt || product.saleEndsAt > now)
    ? sale
    : base;
}
export function priceView(product: PricedProduct): {
  currentPrice: number;
  salePrice: number | null;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
  isOnSale: boolean;
} {
  const currentPrice = effectivePrice(product);
  return {
    currentPrice,
    salePrice:
      product.salePrice === null || product.salePrice === undefined
        ? null
        : Number(product.salePrice),
    saleStartsAt: product.saleStartsAt ?? null,
    saleEndsAt: product.saleEndsAt ?? null,
    isOnSale: currentPrice < Number(product.basePrice),
  };
}
