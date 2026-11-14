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
    STATUS_QUERY_PATTERN.test(text)
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
