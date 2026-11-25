import { OrderStatus } from '@prisma/client';
import { containsChatPhrase, matchChatbotTopic, normalizeChatText } from './chatbot-knowledge';

/** Vietnamese presentation labels for persisted order states. */
export const orderLabels: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  PREPARING: 'Đang chuẩn bị hàng',
  SHIPPING: 'Đang giao hàng',
  DELIVERED: 'Đã giao hàng',
  CONFIRMED: 'Đã xác nhận nhận hàng',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Đã hoàn tiền',
};

const GUIDANCE_OR_MUTATION_PHRASES = [
  'huy don',
  'tra hang',
  'them',
  'xoa',
  'mua luon',
  'thanh toan giup',
  'doi so luong',
  'cancel',
  'refund',
  'remove',
  'add',
  'checkout',
  'pay now',
  'chinh sach',
  'huong dan',
  'lam sao',
  'the nao',
  'tai sao',
  'bao lau',
  'how to',
];

const CART_PHRASES = [
  'gio hang',
  'gio cua toi',
  'gio toi',
  'trong gio',
  'xem gio',
  'kiem tra gio',
  'cart',
  'shopping cart',
];

const SALES_PHRASES = [
  'don ban',
  'don cua shop',
  'don cua khach',
  'don ban gan nhat',
  'don ban moi nhat',
  'lich su ban hang',
  'san pham da ban',
  'sales orders',
  'sold orders',
];

const PURCHASE_PHRASES = [
  'don mua',
  'don da mua',
  'don cua toi',
  'don hang cua toi',
  'don gan nhat',
  'don moi nhat',
  'don vua mua',
  'don vua dat',
  'don mua gan nhat',
  'don mua moi nhat',
  'toi co don nao',
  'danh sach don',
  'lich su dat hang',
  'lich su mua hang',
  'lich su don hang',
  'don hang da dat',
  'don da dat',
  'da mua gi',
  'da mua nhung gi',
  'mua gi roi',
  'da dat gi',
  'da dat nhung gi',
  'san pham da mua',
  'mon da mua',
  'order history',
  'purchase history',
  'my orders',
  'my purchases',
  'purchase orders',
  'latest order',
  'recent orders',
  'what did i buy',
  'what have i bought',
  'items i bought',
];

const STATUS_PHRASES: [OrderStatus, string[]][] = [
  ['PENDING_PAYMENT', ['cho thanh toan', 'chua thanh toan', 'pending payment']],
  ['PAID', ['da thanh toan', 'paid']],
  ['PREPARING', ['dang chuan bi', 'chuan bi hang', 'preparing']],
  ['SHIPPING', ['dang giao', 'shipping']],
  ['DELIVERED', ['da giao', 'delivered']],
  ['CONFIRMED', ['da nhan', 'da xac nhan nhan hang', 'confirmed']],
  ['CANCELLED', ['da huy', 'cancelled']],
  ['REFUNDED', ['da hoan tien', 'refunded']],
];

const STATUS_QUERY_PATTERN =
  /^(?:cho toi xem |xem |lay |liet ke |tim )?(?:nhung |cac )?don(?: hang)? (?:dang giao|da giao|da nhan|da xac nhan nhan hang|da huy|da hoan tien|cho thanh toan|chua thanh toan|da thanh toan|dang chuan bi|chuan bi hang) cua toi$/;

const PURCHASE_QUERY_PATTERN =
  /\b(?:da|vua|moi) mua (?:nhung )?(?:hang|do|mon|san pham|thu)(?: nao| gi)?\b/;

const NEGATED_STATUS_PATTERN =
  /\b(chua giao|chua nhan|chua huy|chua hoan tien|chua xac nhan|chua chuan bi|khong giao|khong huy|khong thanh toan|khong hoan tien|not delivered|not received|not paid|not cancelled|not refunded|not confirmed|not shipped)\b/;

const AMBIGUOUS_QUESTION_PATTERN =
  /\b(da giao|da nhan|da xac nhan nhan hang|da thanh toan|da huy|da hoan tien)\b(?:\s+hay)?\s+\b(chua|khong)\b/;

const CLEAR_STATUS_FOLLOW_UP_PATTERN =
  /^(?:xem )?(?:tat ca(?: cac)? don(?: hang)?|bo loc|all orders)$/;

const LATEST_ORDER_PATTERN =
  /\b(don (?:mua |ban |hang )?(?:gan nhat|moi nhat|vua mua|vua dat)|latest order)\b/;

const FOLLOW_UP_PATTERN =
  /^(?:(?:chi |chi nhung |xem |xem tiep |cho toi xem )?(?:nhung )?don(?: hang)? (?:dang giao|da giao|da nhan|da xac nhan nhan hang|da huy|da hoan tien|cho thanh toan|chua thanh toan|da thanh toan|dang chuan bi|chuan bi hang)(?: cua toi)?|(?:pending payment|paid|preparing|shipping|delivered|confirmed|cancelled|refunded) orders|(?:xem |view |show )?(?:trang|page) \d+|(?:xem |lay )?\d+ (?:don|orders|mon)|(?:xem )?(?:tat ca(?: cac)? don(?: hang)?|bo loc|all orders))$/;

/**
 * Extracts a read-only commerce intent from an untrusted user message.
 * @param message Current untrusted message; history never supplies a query scope.
 * @returns A supported read intent, or null for guidance and mutation requests.
 */
export function commerceIntent(message: string): 'PURCHASES' | 'SALES' | 'CART' | null {
  if (matchChatbotTopic(message) === 'SECURITY') return null;
  const text = normalizeChatText(message);
  if (containsChatPhrase(text, 'hoan tien') && !containsChatPhrase(text, 'da hoan tien'))
    return null;
  if (containsChatPhrase(text, 'dat hang') && !containsChatPhrase(text, 'lich su dat hang'))
    return null;
  if (GUIDANCE_OR_MUTATION_PHRASES.some((phrase) => containsChatPhrase(text, phrase))) return null;
  if (CART_PHRASES.some((phrase) => containsChatPhrase(text, phrase))) return 'CART';
  if (SALES_PHRASES.some((phrase) => containsChatPhrase(text, phrase))) return 'SALES';
  if (
    PURCHASE_PHRASES.some((phrase) => containsChatPhrase(text, phrase)) ||
    STATUS_QUERY_PATTERN.test(text) ||
    PURCHASE_QUERY_PATTERN.test(text)
  )
    return 'PURCHASES';
  return null;
}

/**
 * Collects all persisted order statuses explicitly mentioned in a message.
 * @param message Untrusted query text.
 * @returns All explicitly mentioned persisted states, without choosing between alternatives.
 */
function mentionedStatuses(message: string): OrderStatus[] {
  return STATUS_PHRASES.filter(([, phrases]) =>
    phrases.some((phrase) => containsChatPhrase(message, phrase)),
  ).map(([status]) => status);
}

/**
 * Resolves a single unambiguous order status from a natural-language query.
 * @param message Current natural-language query.
 * @returns A status only when exactly one state is explicitly mentioned.
 */
export function commerceStatus(message: string): OrderStatus | undefined {
  const statuses = mentionedStatuses(message);
  return statuses.length === 1 ? statuses[0] : undefined;
}

/**
 * Detects negated, yes/no, or multi-status order filters that cannot be safely flattened.
 * @param message Current natural-language order query.
 * @returns Whether a single status filter would misrepresent the request.
 */
export function needsCommerceClarification(message: string): boolean {
  const text = normalizeChatText(message);
  if (NEGATED_STATUS_PATTERN.test(text)) return true;
  if (AMBIGUOUS_QUESTION_PATTERN.test(text)) return true;
  return mentionedStatuses(message).length > 1;
}

/**
 * Identifies short filter or pagination follow-up turns that may inherit prior user scope.
 * @param message Current message without an explicit commerce scope.
 * @returns Whether a short filter/page follow-up may reuse the last user query.
 */
export function isCommerceFollowUp(message: string): boolean {
  return FOLLOW_UP_PATTERN.test(normalizeChatText(message));
}

/**
 * Checks whether a follow-up requests clearing a previously applied status filter.
 * @param message Untrusted user message.
 * @returns True when the user asks to view all orders without a status filter.
 */
export function isClearStatusFollowUp(message: string): boolean {
  return CLEAR_STATUS_FOLLOW_UP_PATTERN.test(normalizeChatText(message));
}

/**
 * Checks whether the query asks specifically for the single most recent order.
 * @param message Untrusted user message.
 * @returns True when singular latest/most-recent phrasing is present.
 */
export function isLatestOrderQuery(message: string): boolean {
  return LATEST_ORDER_PATTERN.test(normalizeChatText(message));
}

/**
 * Extracts a complete NEXUS order UUID when the message references an order.
 * @param message Current user message.
 * @returns A complete NEXUS UUID from an order lookup, never from security messages.
 */
export function messageOrderId(message: string): string | undefined {
  if (matchChatbotTopic(message) === 'SECURITY') return undefined;
  if (!['don', 'order'].some((phrase) => containsChatPhrase(message, phrase))) return undefined;
  return message.match(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  )?.[0];
}

const SHOPPING_EXCLUDED_PHRASES = [
  'chinh sach',
  'huong dan',
  'lam sao',
  'the nao',
  'tai sao',
  'bao lau',
  'la gi',
  'quy dinh',
  'dieu kien',
  'anti sniping',
  'ky quy',
  'diem uy tin',
  'dang ky',
  'mo shop',
  'nang cap',
  'che do nguoi ban',
  'nhan vien',
  'khieu nai',
  'ho tro',
  'bao cao',
  'gio hang',
  'don hang',
  'don mua',
  'don ban',
  'huy don',
  'tra hang',
  'hoan tien',
  'thanh toan',
  'van chuyen',
  'giao hang',
  'how to',
  'policy',
];

const SHOPPING_LEADING_FILLERS =
  /^(?:mot|1|cai|chiec|con|bo|doi|cap|nhung|cac|loai|mau|san pham|mat hang|hang|do|mon|thu|gi|nao)\b\s*/;

const SHOPPING_TRAILING_FILLERS =
  /\s*\b(?:khong|ko|k|vay|nhi|nhe|a|voi|giup|toi|minh|o day|tren san|tren nexus|nua|di|nao|gi|day|the|ha)$/;

function cleanShoppingKeyword(raw: string): string {
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

/**
 * Extracts a storefront product/auction search keyword from a buying intent message.
 * @param message Untrusted user message.
 * @returns Cleaned keyword (empty string for generic browse), or null for non-shopping prompts.
 */
export function extractShoppingQuery(message: string): string | null {
  if (matchChatbotTopic(message) === 'SECURITY') return null;
  if (commerceIntent(message) || messageOrderId(message) || isCommerceFollowUp(message))
    return null;
  const text = normalizeChatText(message);
  if (!text || SHOPPING_EXCLUDED_PHRASES.some((phrase) => containsChatPhrase(text, phrase)))
    return null;

  const auctionMatch =
    text.match(
      /^(?:o day |ben minh |ben ban |shop |san |he thong |nexus )?(?:co |tim |kiem |xem )(?:phien |buoi )?dau gia\b(.*)$/,
    ) ??
    text.match(/^(?:toi |minh |em |anh |chi )?(?:muon |can |thich )(?:tham gia )?dau gia\b(.*)$/);
  if (auctionMatch) {
    const keyword = cleanShoppingKeyword(auctionMatch[1] ?? '');
    if (!keyword || /^(?:3d|truc tuyen|online)$/.test(keyword)) return null;
    return keyword;
  }

  const buyMatch =
    text.match(
      /^(?:toi |minh |em |anh |chi |khach )?(?:muon |can |thich |dinh |dang )?(?:tim |kiem |hoi |xem )?(?:dat )?mua\b(.*)$/,
    ) ??
    text.match(
      /^(?:o day |ben minh |ben ban |shop |san |he thong |nexus )?(?:co |hien co |co dang )?(?:ban|kinh doanh)\b(.*)$/,
    ) ??
    text.match(
      /^(?:o day |ben minh |ben ban |shop |san |he thong |nexus )co (?:san pham |mat hang |mon |chiec |cai )(.*)$/,
    ) ??
    text.match(/^(?:tim |tim kiem )(?:san pham |mat hang |hang )(.*)$/) ??
    text.match(/^(?:i )?(?:want to |wanna |need to |looking to )?buy\b(.*)$/) ??
    text.match(/^(?:do you sell|looking for)\b(.*)$/);

  if (!buyMatch) return null;
  return cleanShoppingKeyword(buyMatch[1] ?? '');
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
    label: 'Đơn hàng của tôi',
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
    label: 'Ví NEXUS Pay',
    requiresAuth: true,
    keywords: ['vi', 'vi nexus', 'vi nexus pay', 'wallet'],
  },
  {
    path: '/buyer/bids',
    label: 'Lịch sử đấu giá',
    requiresAuth: true,
    keywords: ['lich su dau gia', 'dau gia cua toi', 'luot tra gia', 'my bids', 'bids'],
  },
  {
    path: '/buyer/profile',
    label: 'Hồ sơ cá nhân',
    requiresAuth: true,
    keywords: ['ho so', 'ho so ca nhan', 'tai khoan', 'thong tin ca nhan', 'profile'],
  },
  {
    path: '/buyer/addresses',
    label: 'Sổ địa chỉ',
    requiresAuth: true,
    keywords: ['dia chi', 'so dia chi', 'addresses', 'address'],
  },
  {
    path: '/buyer/wishlist',
    label: 'Sản phẩm yêu thích',
    requiresAuth: true,
    keywords: ['yeu thich', 'san pham yeu thich', 'wishlist'],
  },
  {
    path: '/buyer/disputes',
    label: 'Khiếu nại & Trả hàng',
    requiresAuth: true,
    keywords: ['khieu nai', 'tra hang', 'tranh chap', 'disputes'],
  },
  {
    path: '/buyer/reputation',
    label: 'Điểm uy tín',
    requiresAuth: true,
    keywords: ['diem uy tin', 'uy tin', 'reputation'],
  },
  {
    path: '/buyer/notifications',
    label: 'Thông báo',
    requiresAuth: true,
    keywords: ['thong bao', 'notifications'],
  },
  {
    path: '/buyer',
    label: 'Trang người mua',
    requiresAuth: true,
    keywords: ['nguoi mua', 'buyer', 'bang dieu khien', 'dashboard'],
  },
  {
    path: '/seller/products',
    label: 'Sản phẩm của shop',
    requiresAuth: true,
    keywords: ['san pham cua shop', 'quan ly san pham', 'seller products'],
  },
  {
    path: '/seller/orders',
    label: 'Đơn bán của shop',
    requiresAuth: true,
    keywords: ['don ban', 'don cua shop', 'seller orders'],
  },
  {
    path: '/seller/auctions',
    label: 'Đấu giá của shop',
    requiresAuth: true,
    keywords: ['dau gia cua shop', 'seller auctions'],
  },
  {
    path: '/seller',
    label: 'Kênh người bán',
    requiresAuth: true,
    keywords: ['kenh nguoi ban', 'nguoi ban', 'seller'],
  },
  {
    path: '/checkout',
    label: 'Thanh toán',
    requiresAuth: true,
    keywords: ['thanh toan', 'checkout'],
  },
  {
    path: '/cart',
    label: 'Giỏ hàng',
    requiresAuth: false,
    keywords: ['gio hang', 'gio', 'cart'],
  },
  {
    path: '/auction',
    label: 'Đấu giá',
    requiresAuth: false,
    keywords: ['dau gia', 'dau gia 3d', 'san dau gia', 'phong dau gia', 'auction', 'auctions'],
  },
  {
    path: '/categories',
    label: 'Danh mục sản phẩm',
    requiresAuth: false,
    keywords: ['danh muc', 'danh muc san pham', 'nganh hang', 'categories', 'category'],
  },
  {
    path: '/search',
    label: 'Tìm kiếm sản phẩm',
    requiresAuth: false,
    keywords: ['tim kiem', 'san pham', 'search', 'products'],
  },
  {
    path: '/about',
    label: 'Giới thiệu',
    requiresAuth: false,
    keywords: ['gioi thieu', 've nexus', 'about'],
  },
  {
    path: '/contact',
    label: 'Liên hệ',
    requiresAuth: false,
    keywords: ['lien he', 'contact'],
  },
  {
    path: '/login',
    label: 'Đăng nhập',
    requiresAuth: false,
    keywords: ['dang nhap', 'login'],
  },
  {
    path: '/register',
    label: 'Đăng ký',
    requiresAuth: false,
    keywords: ['dang ky', 'register'],
  },
  {
    path: '/',
    label: 'Trang chủ',
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
 * @returns Route target or catalog search navigation, or null for non-navigation messages.
 */
export function extractNavigationRequest(message: string): ChatbotNavigationTarget | null {
  if (matchChatbotTopic(message) === 'SECURITY') return null;
  if (messageOrderId(message)) return null;
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
        label: `Tìm kiếm "${keyword}"`,
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

const ACCOUNT_POLICY_EXCLUSIONS = [
  'la gi',
  'the nao',
  'tinh the nao',
  'chinh sach',
  'quy dinh',
  'ky quy',
  'rut tien',
  'can nhung gi',
  'can gi',
  'bao nhieu diem de',
  'bao nhieu diem',
  'bao nhieu uy tin',
  'toi thieu bao nhieu',
  'quy trinh',
  'cac buoc',
  'yeu cau nhung gi',
];

/**
 * Detects personal account readiness, wallet balance, or reputation lookup questions.
 * @param message Current user message.
 * @param history Optional prior turns used to detect auction follow-up context.
 * @returns Personal account query type, or null for general policy questions.
 */
export function accountStatusIntent(
  message: string,
  history: { role: string; content: string }[] = [],
): 'ELIGIBILITY' | 'WALLET' | 'REPUTATION' | null {
  if (matchChatbotTopic(message) === 'SECURITY') return null;
  const text = normalizeChatText(message);
  if (!text || ACCOUNT_POLICY_EXCLUSIONS.some((phrase) => containsChatPhrase(text, phrase)))
    return null;
  if (CART_PHRASES.some((phrase) => containsChatPhrase(text, phrase))) return null;

  if (
    /\b(?:du dieu kien|du dk)\b/.test(text) ||
    /\b(?:tai khoan|nick|acc|toi|minh)\b.*\b(?:tham gia(?: duoc)? phien|tham gia dau gia|dau gia duoc|du chuan|du dieu kien)\b/.test(
      text,
    ) ||
    /\b(?:toi|minh)\b.*\bco the (?:tham gia )?dau gia\b/.test(text) ||
    /\bkiem tra dieu kien\b/.test(text)
  ) {
    return 'ELIGIBILITY';
  }

  if (
    /\b(?:so du|tien|kiem tra|xem)\s+(?:trong\s+)?vi\b/.test(text) ||
    /\bvi(?:\s+nexus(?:\s+pay)?)?\s+(?:cua toi|cua minh)\b/.test(text) ||
    /\b(?:toi|minh)\s+(?:hien\s+)?co bao nhieu tien\b/.test(text) ||
    /\bso du kha dung\b/.test(text)
  ) {
    return 'WALLET';
  }

  if (
    /\b(?:diem uy tin|uy tin|cap do tin cay)\s+(?:cua toi|cua minh)\b/.test(text) ||
    /\b(?:toi|minh)\s+(?:hien\s+)?(?:co|duoc)\s+bao nhieu diem uy tin\b/.test(text) ||
    /\bkiem tra (?:diem )?uy tin\b/.test(text)
  ) {
    return 'REPUTATION';
  }

  const recentAuctionContext = history
    .slice(-4)
    .some((turn) => /\bdau gia\b/.test(normalizeChatText(turn.content)));
  if (recentAuctionContext && /\b(?:du dieu kien|duoc khong|du chua)\b/.test(text)) {
    return 'ELIGIBILITY';
  }

  return null;
}

function parseVietnameseMoneyNumber(rawNumber: string, unit?: string): number | null {
  const cleaned = rawNumber.replace(/\s+/g, '');
  const u = (unit ?? '').toLowerCase();
  let numeric: number;
  if (u === 'k' || u === 'ngan' || u === 'nghin' || u === 'trieu' || u === 'tr' || u === 'm') {
    const normalized = cleaned.replace(',', '.');
    numeric = Number(normalized);
  } else {
    const normalized = cleaned.replace(/[.,](?=\d{3}(?:\D|$))/g, '').replace(',', '.');
    numeric = Number(normalized);
  }
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  if (u === 'k' || u === 'ngan' || u === 'nghin') return Math.round(numeric * 1000);
  if (u === 'trieu' || u === 'tr' || u === 'm') return Math.round(numeric * 1000000);
  return Math.round(numeric);
}

/**
 * Extracts a buyer budget amount (in VND) from a cart affordability query.
 * @param message Raw user message.
 * @returns Positive integer budget in VND, or null when no budget is stated.
 */
export function extractCartBudget(message: string): number | null {
  const normalized = message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();

  const unitMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(ngan|nghin|k|trieu|tr|m|vnd|dong|d)\b/);
  if (unitMatch) {
    return parseVietnameseMoneyNumber(unitMatch[1], unitMatch[2]);
  }

  const cueMatch = normalized.match(
    /\b(?:tai chinh|ngan sach|con|co|duoi|toi da|khong qua|tam|khoang|budget|under)\s+(?:la\s+|con\s+)?(\d+(?:[.,]\d{3})+|\d{4,})\b/,
  );
  if (cueMatch) {
    return parseVietnameseMoneyNumber(cueMatch[1]);
  }

  return null;
}

/**
 * Detects whether a cart query specifically asks which items are eligible or affordable to buy.
 * @param message Untrusted user message.
 * @returns True when asking about eligible/purchasable items in the cart.
 */
export function isCartEligibilityQuery(message: string): boolean {
  const text = normalizeChatText(message);
  return /\b(?:du dieu kien|du dk|mua duoc|co the mua|du tien|vua tui|trong tam|duoi)\b/.test(text);
}

const AUCTION_FILTER_TRAILING =
  /\s*\b(?:khong|ko|k|chua|hay chua|duoc khong|duoc chua|nao|gi|nay|do|voi|nhe|nhi|a|ma|xem|toi du dieu kien.*|minh du dieu kien.*|co du dieu kien.*|du dieu kien.*|tham gia duoc.*|duoc khong.*)$/;

const AUCTION_FILTER_GENERIC =
  /^(?:nao|gi|nao do|hien tai|dang mo|sap dien ra|sap mo|cua san|nexus|cac phien|het)?$/;

/**
 * Extracts an optional auction or item name filter from an auction eligibility query.
 * @param message Current user question.
 * @returns Normalized filter keyword when specific, or undefined for all auctions.
 */
export function extractAuctionEligibilityFilter(message: string): string | undefined {
  const text = normalizeChatText(message);
  if (!text) return undefined;
  const match =
    text.match(/\b(?:phien|buoi|phong)(?:\s+dau\s+gia)?\s+(.+)$/) ??
    text.match(/\bdau\s+gia\s+(.+)$/);
  if (!match) return undefined;

  let value = (match[1] ?? '').trim();
  let previous = '';
  while (value && value !== previous) {
    previous = value;
    value = value
      .replace(/^(?:ten|ten la|ve|co ten|co)\s+/, '')
      .replace(AUCTION_FILTER_TRAILING, '')
      .trim();
  }
  const cleaned = cleanShoppingKeyword(value);
  if (!cleaned || AUCTION_FILTER_GENERIC.test(cleaned)) return undefined;
  return cleaned;
}
