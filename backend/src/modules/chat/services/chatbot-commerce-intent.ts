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

/**
 * @param message Current untrusted message; history never supplies a query scope.
 * @returns A supported read intent, or null for guidance and mutation requests.
 */
export function commerceIntent(message: string): 'PURCHASES' | 'SALES' | 'CART' | null {
  if (matchChatbotTopic(message) === 'SECURITY') return null;
  const text = normalizeChatText(message);
  if (containsChatPhrase(text, 'dat hang') && !containsChatPhrase(text, 'lich su dat hang'))
    return null;
  if (
    [
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
    ].some((phrase) => containsChatPhrase(text, phrase))
  )
    return null;
  if (
    ['gio hang', 'gio cua toi', 'gio toi', 'cart'].some((phrase) =>
      containsChatPhrase(text, phrase),
    )
  )
    return 'CART';
  if (
    ['don ban', 'don cua shop', 'don cua khach', 'sales orders', 'sold orders'].some((phrase) =>
      containsChatPhrase(text, phrase),
    )
  )
    return 'SALES';
  if (containsChatPhrase(text, 'hoan tien') && !containsChatPhrase(text, 'da hoan tien'))
    return null;
  if (
    [
      'don mua',
      'don da mua',
      'don cua toi',
      'don hang cua toi',
      'don gan nhat',
      'toi co don nao',
      'danh sach don',
      'lich su dat hang',
      'lich su mua hang',
      'lich su don hang',
      'don hang da dat',
      'don da dat',
      'order history',
      'purchase history',
      'my orders',
      'my purchases',
      'purchase orders',
    ].some((phrase) => containsChatPhrase(text, phrase))
  )
    return 'PURCHASES';
  return null;
}

/** @returns A persisted status explicitly named in the current message, when present. */
export function commerceStatus(message: string): OrderStatus | undefined {
  const statuses: [OrderStatus, string[]][] = [
    ['PENDING_PAYMENT', ['cho thanh toan', 'chua thanh toan', 'pending payment']],
    ['PAID', ['da thanh toan', 'paid']],
    ['PREPARING', ['dang chuan bi', 'chuan bi hang', 'preparing']],
    ['SHIPPING', ['dang giao', 'shipping']],
    ['DELIVERED', ['da giao', 'delivered']],
    ['CONFIRMED', ['da nhan', 'da xac nhan nhan hang', 'confirmed']],
    ['CANCELLED', ['da huy', 'cancelled']],
    ['REFUNDED', ['da hoan tien', 'refunded']],
  ];
  return statuses.find(([, phrases]) =>
    phrases.some((phrase) => containsChatPhrase(message, phrase)),
  )?.[0];
}

/** @returns A complete NEXUS UUID from an order lookup, never from history or policy requests. */
export function messageOrderId(message: string): string | undefined {
  if (['SECURITY', 'CANCELLATION', 'RETURN', 'REFUND'].includes(matchChatbotTopic(message) ?? ''))
    return undefined;
  if (!['don', 'order'].some((phrase) => containsChatPhrase(message, phrase))) return undefined;
  return message.match(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  )?.[0];
}
