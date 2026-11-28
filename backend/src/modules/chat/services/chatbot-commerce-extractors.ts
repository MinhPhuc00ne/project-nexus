import { containsChatPhrase, matchChatbotTopic, normalizeChatText } from './chatbot-knowledge';
import { cleanShoppingKeyword } from './chatbot-commerce-navigation';

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

const CART_QUERY_EXCLUSIONS = ['gio hang', 'trong gio', 'my cart', 'cart'];

export function extractShoppingQueryFromMessage(
  message: string,
  hasCommerceContext: boolean,
): string | null {
  if (matchChatbotTopic(message) === 'SECURITY' || hasCommerceContext) return null;
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

/**
 * Detects personal account readiness, wallet balance, or reputation lookup questions.
 */
export function accountStatusIntent(
  message: string,
  history: { role: string; content: string }[] = [],
): 'ELIGIBILITY' | 'WALLET' | 'REPUTATION' | null {
  if (matchChatbotTopic(message) === 'SECURITY') return null;
  const text = normalizeChatText(message);
  if (!text || ACCOUNT_POLICY_EXCLUSIONS.some((phrase) => containsChatPhrase(text, phrase)))
    return null;
  if (CART_QUERY_EXCLUSIONS.some((phrase) => containsChatPhrase(text, phrase))) return null;

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
 */
export function extractCartBudget(message: string): number | null {
  const normalized = message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0111\u0110]/g, 'd')
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
