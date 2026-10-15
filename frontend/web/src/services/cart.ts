export interface CartItem {
  id: string | number;
  name: string;
  price: number; // in VND numeric
  formattedPrice: string; // e.g. "128.500.000 ₫"
  qty: number;
  img: string;
  shopName?: string;
  selected?: boolean;
  category?: string;
  brand?: string;
}

const CART_STORAGE_KEY = 'nexus:cart-items';

function emitCartChange(): void {
  window.dispatchEvent(new CustomEvent('nexus:cart-change'));
}

export function getCartItems(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      // Default sample items if cart is empty so demo always looks vibrant
      const initial: CartItem[] = [
        {
          id: 'ap-tourbillon',
          name: 'Audemars Piguet Royal Oak Chrono Tourbillon 3D Skeleton',
          price: 128500000,
          formattedPrice: '128.500.000 ₫',
          qty: 1,
          img: '/images/watches/watch-1.png',
          shopName: 'NEXUS Official Flagship Mall',
          selected: true,
          category: 'Đồng Hồ & Trang Sức',
          brand: 'AUDEMARS PIGUET',
        },
        {
          id: 'patek-celestial',
          name: 'Patek Philippe Grand Complications Celestial Blue Dial',
          price: 85000000,
          formattedPrice: '85.000.000 ₫',
          qty: 1,
          img: '/images/watches/watch-2.png',
          shopName: 'Geneva Luxury Watch Co.',
          selected: true,
          category: 'Đồng Hồ & Trang Sức',
          brand: 'PATEK PHILIPPE',
        },
      ];
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCartItems(items: CartItem[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    emitCartChange();
  } catch {
    // Storage quota or disabled
  }
}

export function addToCart(
  item: Omit<CartItem, 'qty'> & { qty?: number },
  quantity: number = 1,
): void {
  const current = getCartItems();
  const existingIndex = current.findIndex((i) => String(i.id) === String(item.id));

  if (existingIndex > -1) {
    current[existingIndex].qty += quantity;
    current[existingIndex].selected = true;
  } else {
    current.unshift({
      ...item,
      qty: Math.max(1, quantity),
      selected: true,
    });
  }

  saveCartItems(current);
}

export function updateCartQty(id: string | number, qty: number): void {
  const current = getCartItems();
  const updated = current
    .map((item) => {
      if (String(item.id) === String(id)) {
        return { ...item, qty: Math.max(1, qty) };
      }
      return item;
    })
    .filter((item) => item.qty > 0);

  saveCartItems(updated);
}

export function removeFromCart(id: string | number): void {
  const current = getCartItems();
  const filtered = current.filter((item) => String(item.id) !== String(id));
  saveCartItems(filtered);
}

export function toggleSelectItem(id: string | number): void {
  const current = getCartItems();
  const updated = current.map((item) => {
    if (String(item.id) === String(id)) {
      return { ...item, selected: !item.selected };
    }
    return item;
  });
  saveCartItems(updated);
}

export function toggleSelectAll(selectAll: boolean): void {
  const current = getCartItems();
  const updated = current.map((item) => ({ ...item, selected: selectAll }));
  saveCartItems(updated);
}

export function clearCart(): void {
  saveCartItems([]);
}

export function getCartTotal(): { totalCount: number; selectedCount: number; totalPrice: number } {
  const items = getCartItems();
  const totalCount = items.reduce((acc, curr) => acc + curr.qty, 0);
  const selectedItems = items.filter((i) => i.selected);
  const selectedCount = selectedItems.reduce((acc, curr) => acc + curr.qty, 0);
  const totalPrice = selectedItems.reduce((acc, curr) => acc + curr.price * curr.qty, 0);

  return { totalCount, selectedCount, totalPrice };
}
