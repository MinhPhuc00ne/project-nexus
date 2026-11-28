import { matchChatbotTopic, normalizeChatText } from './chatbot-knowledge';

const SHOPPING_LEADING_FILLERS =
  /^(?:mot|1|cai|chiec|con|bo|doi|cap|nhung|cac|loai|mau|san pham|mat hang|hang|do|mon|thu|gi|nao)\b\s*/;

const SHOPPING_TRAILING_FILLERS =
  /\s*\b(?:khong|ko|k|vay|nhi|nhe|a|voi|giup|toi|minh|o day|tren san|tren nexus|nua|di|nao|gi|day|the|ha)$/;

export function cleanShoppingKeyword(raw: string): string {
  let value = raw.trim();
  let previous = '';
  while (value && value !== previous) {
    previous = value;
    value = value
      .replace(SHOPPING_LEADING_FILLERS, '')
      .replace(SHOPPING_TRAILING_FILLERS, '')
      .trim();
  }
  return value;
}

/** Resolved internal navigation target for explicit page-switch prompts. */
export interface ChatbotNavigationTarget {
  path: string;
  label: string;
  requiresAuth: boolean;
  searchQuery?: string;
  searchKind?: 'PRODUCT' | 'AUCTION';
}

const NAVIGATION_ROUTES: {
  path: string;
  label: string;
  requiresAuth: boolean;
  keywords: string[];
}[] = [
  {
    path: '/buyer/orders',
    label: 'My Orders',
    requiresAuth: true,
    keywords: [
      'don hang',
      'don mua',
      'lich su mua hang',
      'lich su dat hang',
      'orders',
      'my orders',
    ],
  },
  {
    path: '/buyer/wallet',
    label: 'NEXUS Pay Wallet',
    requiresAuth: true,
    keywords: ['vi', 'vi nexus', 'vi nexus pay', 'wallet'],
  },
  {
    path: '/buyer/bids',
    label: 'My Auction History',
    requiresAuth: true,
    keywords: ['lich su dau gia', 'dau gia cua toi', 'luot tra gia', 'my bids', 'bids'],
  },
  {
    path: '/buyer/profile',
    label: 'My Profile',
    requiresAuth: true,
    keywords: ['ho so', 'ho so ca nhan', 'tai khoan', 'thong tin ca nhan', 'profile'],
  },
  {
    path: '/buyer/addresses',
    label: 'Address Book',
    requiresAuth: true,
    keywords: ['dia chi', 'so dia chi', 'addresses', 'address'],
  },
  {
    path: '/buyer/wishlist',
    label: 'Wishlist',
    requiresAuth: true,
    keywords: ['yeu thich', 'san pham yeu thich', 'wishlist'],
  },
  {
    path: '/buyer/disputes',
    label: 'Disputes & Returns',
    requiresAuth: true,
    keywords: ['khieu nai', 'tra hang', 'tranh chap', 'disputes'],
  },
  {
    path: '/buyer/reputation',
    label: 'Reputation Score',
    requiresAuth: true,
    keywords: ['diem uy tin', 'uy tin', 'reputation'],
  },
  {
    path: '/buyer/notifications',
    label: 'Notifications',
    requiresAuth: true,
    keywords: ['thong bao', 'notifications'],
  },
  {
    path: '/buyer',
    label: 'Buyer Portal',
    requiresAuth: true,
    keywords: ['nguoi mua', 'buyer', 'bang dieu khien', 'dashboard'],
  },
  {
    path: '/seller/products',
    label: 'Shop Products',
    requiresAuth: true,
    keywords: ['san pham cua shop', 'quan ly san pham', 'seller products'],
  },
  {
    path: '/seller/orders',
    label: 'Shop Sales Orders',
    requiresAuth: true,
    keywords: ['don ban', 'don cua shop', 'seller orders'],
  },
  {
    path: '/seller/auctions',
    label: 'Shop Auctions',
    requiresAuth: true,
    keywords: ['dau gia cua shop', 'seller auctions'],
  },
  {
    path: '/seller',
    label: 'Seller Center',
    requiresAuth: true,
    keywords: ['kenh nguoi ban', 'nguoi ban', 'seller'],
  },
  {
    path: '/checkout',
    label: 'Checkout',
    requiresAuth: true,
    keywords: ['thanh toan', 'checkout'],
  },
  {
    path: '/cart',
    label: 'Shopping Cart',
    requiresAuth: false,
    keywords: ['gio hang', 'gio', 'cart'],
  },
  {
    path: '/auction',
    label: 'Auctions',
    requiresAuth: false,
    keywords: ['dau gia', 'dau gia 3d', 'san dau gia', 'phong dau gia', 'auction', 'auctions'],
  },
  {
    path: '/categories',
    label: 'Product Categories',
    requiresAuth: false,
    keywords: ['danh muc', 'danh muc san pham', 'nganh hang', 'categories', 'category'],
  },
  {
    path: '/search',
    label: 'Product Search',
    requiresAuth: false,
    keywords: ['tim kiem', 'san pham', 'search', 'products'],
  },
  {
    path: '/about',
    label: 'About Us',
    requiresAuth: false,
    keywords: ['gioi thieu', 've nexus', 'about'],
  },
  {
    path: '/contact',
    label: 'Contact',
    requiresAuth: false,
    keywords: ['lien he', 'contact'],
  },
  {
    path: '/login',
    label: 'Sign In',
    requiresAuth: false,
    keywords: ['dang nhap', 'login'],
  },
  {
    path: '/register',
    label: 'Sign Up',
    requiresAuth: false,
    keywords: ['dang ky', 'register'],
  },
  {
    path: '/',
    label: 'Home',
    requiresAuth: false,
    keywords: ['trang chu', 'chu', 'home', 'homepage'],
  },
];

function stripNavigationTargetFillers(raw: string): string {
  return raw
    .replace(/^(?:trang|muc|phan|page)\s+/i, '')
    .replace(/\s+(?:cua toi|cua minh|giup|giup toi|giup minh|nhe|di|a|voi|nexus)$/i, '')
    .replace(/^(?:trang|muc|phan|page)\s+/i, '')
    .trim();
}

/**
 * Resolves explicit user requests to navigate to a storefront or account page.
 * @param message Untrusted user message.
 * @param hasOrderId Whether the message contains a specific order UUID.
 * @returns Route target or catalog search navigation, or null for non-navigation messages.
 */
export function extractNavigationRequest(
  message: string,
  hasOrderId = false,
): ChatbotNavigationTarget | null {
  if (matchChatbotTopic(message) === 'SECURITY' || hasOrderId) return null;
  const text = normalizeChatText(message);
  if (!text) return null;

  const match = text.match(
    /^(?:(?:hay |giup |cho |dua |dan )?(?:toi |minh |em |anh |chi )?)?(?:chuyen(?: sang| qua| toi| den| ve)?|di(?: toi| den)?|mo|vao|qua|ve|toi|den|navigate to|go to|open)\s+(.+)$/,
  );
  if (!match) return null;

  const target = stripNavigationTargetFillers(match[1] ?? '');
  if (!target) return null;

  const searchPrefix = target.match(/^(?:tim kiem|search)\s+(.+)$/);
  if (searchPrefix) {
    const keyword = cleanShoppingKeyword(searchPrefix[1] ?? '');
    if (keyword) {
      return {
        path: `/search?q=${encodeURIComponent(keyword)}`,
        label: `Search "${keyword}"`,
        requiresAuth: false,
        searchQuery: keyword,
      };
    }
  }

  for (const route of NAVIGATION_ROUTES) {
    if (route.keywords.includes(target)) {
      return {
        path: route.path,
        label: route.label,
        requiresAuth: route.requiresAuth,
      };
    }
  }

  const itemPrefix = target.match(
    /^(?:(san pham)|((?:phien |buoi |phong )?dau gia|phien))\s+(.+)$/,
  );
  if (itemPrefix) {
    const keyword = cleanShoppingKeyword(itemPrefix[3] ?? '');
    if (keyword) {
      return {
        path: `/search?q=${encodeURIComponent(keyword)}`,
        label: target,
        requiresAuth: false,
        searchQuery: keyword,
        searchKind: itemPrefix[1] ? 'PRODUCT' : 'AUCTION',
      };
    }
  }

  return null;
}
