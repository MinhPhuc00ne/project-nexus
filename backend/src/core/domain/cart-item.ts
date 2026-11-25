import { Prisma } from '@prisma/client';
import { effectivePrice, PricedProduct } from './product-price';
import { ProductChoice, validateSelections } from './product-options';

export const CART_EXPIRATION_DAYS = 7;

export function getCartExpiresAt(): Date {
  return new Date(Date.now() + CART_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
}

export interface CartItemProductWithRelations extends PricedProduct {
  id: string;
  title: string;
  basePrice: Prisma.Decimal | number;
  images: Array<{ imageUrl: string }>;
  seller: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    shopAvatarUrl?: string | null;
    isShopSuspended?: boolean;
  };
  inventories: Array<{ availableQty: number }>;
  options?: ProductChoice[];
  status?: string;
}

export interface RawCartItem {
  id: string;
  quantity: number;
  priceAtAdded: Prisma.Decimal | number;
  createdAt: Date;
  product: CartItemProductWithRelations;
  selections?: unknown;
}

export interface FormattedCartItem {
  selections: Record<string, string>;
  hasInvalidSelections: boolean;
  isUnavailable: boolean;
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
  const currentPrice = effectivePrice(product);
  let selections: Record<string, string> = {};
  let hasInvalidSelections = false;
  try {
    selections = validateSelections(product.options ?? [], item.selections).selections;
  } catch {
    hasInvalidSelections = true;
  }
  const priceAtAdded = Number(item.priceAtAdded);
  const hasPriceChanged = currentPrice !== priceAtAdded;

  const availableQty = product.inventories.reduce((acc, curr) => acc + curr.availableQty, 0);
  const isOutOfStock = availableQty <= 0;
  const isStockInsufficient = item.quantity > availableQty;

  return {
    selections,
    hasInvalidSelections,
    isUnavailable:
      hasInvalidSelections ||
      product.seller.isShopSuspended === true ||
      product.status === 'INACTIVE' ||
      product.status === 'DRAFT',
    id: item.id,
    productId: product.id,
    name: product.title,
    thumbnail: product.images[0]?.imageUrl || null,
    shop: {
      id: product.seller.id,
      name: product.seller.fullName,
      avatarUrl: product.seller.shopAvatarUrl ?? null,
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
