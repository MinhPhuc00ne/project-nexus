import { Prisma } from '@prisma/client';

export const CART_EXPIRATION_DAYS = 7;

export function getCartExpiresAt(): Date {
  return new Date(Date.now() + CART_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
}

export interface CartItemProductWithRelations {
  id: string;
  title: string;
  basePrice: Prisma.Decimal | number;
  images: Array<{ imageUrl: string }>;
  seller: { id: string; fullName: string; avatarUrl: string | null };
  inventories: Array<{ availableQty: number }>;
}

export interface RawCartItem {
  id: string;
  quantity: number;
  priceAtAdded: Prisma.Decimal | number;
  createdAt: Date;
  product: CartItemProductWithRelations;
}

export interface FormattedCartItem {
  id: string;
  productId: string;
  name: string;
  thumbnail: string | null;
  shop: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  quantity: number;
  currentPrice: number;
  priceAtAdded: number;
  hasPriceChanged: boolean;
  priceDifference: number;
  availableQty: number;
  isOutOfStock: boolean;
  isStockInsufficient: boolean;
  itemSubtotal: number;
  createdAt: Date;
}

export function formatCartItem(item: RawCartItem): FormattedCartItem {
  const product = item.product;
  const currentPrice = Number(product.basePrice);
  const priceAtAdded = Number(item.priceAtAdded);
  const hasPriceChanged = currentPrice !== priceAtAdded;

  const availableQty = product.inventories.reduce((acc, curr) => acc + curr.availableQty, 0);
  const isOutOfStock = availableQty <= 0;
  const isStockInsufficient = item.quantity > availableQty;

  return {
    id: item.id,
    productId: product.id,
    name: product.title,
    thumbnail: product.images[0]?.imageUrl || null,
    shop: {
      id: product.seller.id,
      name: product.seller.fullName,
      avatarUrl: product.seller.avatarUrl,
    },
    quantity: item.quantity,
    currentPrice,
    priceAtAdded,
    hasPriceChanged,
    priceDifference: currentPrice - priceAtAdded,
    availableQty,
    isOutOfStock,
    isStockInsufficient,
    itemSubtotal: currentPrice * item.quantity,
    createdAt: item.createdAt,
  };
}

export function summarizeCart(items: FormattedCartItem[]) {
  let totalCount = 0;
  let totalPrice = 0;
  let hasPriceChanged = false;

  for (const item of items) {
    totalCount += item.quantity;
    totalPrice += item.itemSubtotal;
    if (item.hasPriceChanged) {
      hasPriceChanged = true;
    }
  }

  return { totalCount, totalPrice, hasPriceChanged };
}
