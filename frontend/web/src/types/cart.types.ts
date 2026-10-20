export interface CartItem {
  id: string | number;
  name: string;
  price: number; // Numeric amount in VND
  formattedPrice: string; // e.g. "128.500.000 ₫"
  qty: number;
  img: string;
  shopName?: string;
  selected?: boolean;
  category?: string;
  brand?: string;
}

export interface CartDropdownItem {
  id: string | number;
  name: string;
  price: string | number;
  qty?: number;
  img?: string;
}
