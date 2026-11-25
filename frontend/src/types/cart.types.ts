export interface CartItem {
  id: string | number;
  productId?: string;
  name: string;
  /** Numeric amount in VND */
  price: number;
  /** Formatted currency string representation (e.g., "128.500.000 ₫") */
  formattedPrice: string;
  qty: number;
  img: string;
  shopName?: string;
  shopId?: string;
  selections?: Record<string, string>;
  selected?: boolean;
  category?: string;
  brand?: string;
  hasPriceChanged?: boolean;
  priceAtAdded?: number;
  priceDifference?: number;
  availableQty?: number;
  isOutOfStock?: boolean;
  isStockInsufficient?: boolean;
}

export interface CartDropdownItem {
  id: string | number;
  name: string;
  price: string | number;
  qty?: number;
  img?: string;
  selections?: Record<string, string>;
}
