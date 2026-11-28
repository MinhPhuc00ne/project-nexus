export const chatbotKnowledge = [
  {
    id: 'SECURITY',
    title: 'Account Security',
    keywords: [
      'bao mat tai khoan',
      'account security',
      'mat khau',
      'password',
      'otp',
      'ma pin',
      'passcode',
      'token',
      'access token',
      'refresh token',
      'khoa api',
      'api key',
      'secret key',
      'private key',
      'thong tin the',
      'so the',
      'credit card',
      'cvv',
      'cvc',
    ],
    answer:
      'Never share passwords, OTPs, or API keys in chat. If you have shared them, change your password or revoke the affected keys immediately. Use the NEXUS password recovery flow or contact support staff if you cannot access your account.',
  },
  {
    id: 'CANCELLATION',
    title: 'Order Cancellation',
    keywords: ['huy don', 'huy hang', 'cancel', 'cancellation'],
    answer:
      'You can cancel an order before GHN picks up the parcel. If the seller has already confirmed and the order is preparing, buyer cancellation requests require Admin approval. Once GHN has picked up the parcel, submit a return request or contact support. The chatbot cannot cancel orders on your behalf.',
  },
  {
    id: 'REFUND',
    title: 'Refunds',
    keywords: ['hoan tien', 'refund', 'refunds', 'tra tien'],
    answer:
      'Refunds depend on cancellation/return outcomes and captured payments. Off-platform payments are refunded to the original payment source by default; they are credited to your NEXUS wallet only if you consent. Cancelling a payment link does not mean a refund has been issued. Exact payout timing cannot be guaranteed until reconciliation is confirmed.',
  },
  {
    id: 'RETURN',
    title: 'Returns',
    keywords: ['tra hang', 'doi hang', 'hang loi', 'sai hang', 'return', 'returns'],
    answer:
      'For delivered orders, the inspection/return request window is 3 days from system-confirmed delivery. Prepare your reason and evidence; the request must be approved, the return waybill verified, and returned goods confirmed before a refund is issued. Orders with an open dispute continue through the dispute case.',
  },
  {
    id: 'SHIPPING',
    title: 'GHN Shipping',
    keywords: ['giao hang', 'van chuyen', 'ghn', 'phi ship', 'ship'],
    answer:
      'Shipping fees and delivery times are calculated based on address and parcel dimensions. Order tracking statuses are synced from GHN; the chatbot cannot modify shipment statuses. Select an order ID to check the system-confirmed status.',
  },
  {
    id: 'PAYMENT',
    title: 'Payments',
    keywords: ['thanh toan', 'payos', 'quet qr', 'chuyen khoan', 'cod', 'payment', 'payments'],
    answer:
      'NEXUS supports PayOS, NEXUS Pay wallet, and Cash on Delivery (COD) depending on checkout eligibility. If you paid but the order has not updated, recheck the order and contact support with your transaction code. Never send passwords, OTPs, or card details in chat, and do not pay twice while a previous transaction is still reconciling.',
  },
  {
    id: 'CART',
    title: 'Shopping Cart',
    keywords: ['gio hang', 'gio cua toi', 'cart'],
    answer:
      'Sign in to view your cart, quantities, item subtotal, and price/stock alerts. The chatbot is read-only; adding, removing, updating quantities, and placing orders must be done through the NEXUS cart flow.',
  },
  {
    id: 'AUCTION',
    title: 'Online Auctions',
    keywords: [
      'dau gia',
      'dau gia 3d',
      'tra gia',
      'dat gia',
      'anti sniping',
      'auction',
      'auctions',
      'bid',
    ],
    answer:
      'How to join and complete auction orders on NEXUS:\n1. Eligibility: Account in Buyer mode, NEXUS Pay wallet with enough available balance to cover your bid, and at least 40 reputation points (some rooms may require higher); sellers need at least 50 reputation points to list items and cannot bid on their own lots.\n2. Bidding: Select an active room; the system locks 100% of your bid amount in your wallet, and outbid funds are immediately unlocked back to the previous bidder. Valid bids in the final 2 minutes automatically extend the timer by 2 minutes (Anti-Sniping).\n3. Winner checkout: After winning, go to My Auctions to confirm your shipping address and complete payment within 24 hours (missing the deadline forfeits the award and deducts 10 reputation points).',
  },
  {
    id: 'WALLET',
    title: 'NEXUS Pay Wallet & Escrow',
    keywords: [
      'vi nexus',
      'vi nexus pay',
      'ky quy',
      'escrow',
      'rut tien',
      'so du',
      'wallet',
      'withdraw',
    ],
    answer:
      'Order payments are held in system Escrow (HELD); after delivery (DELIVERED), the buyer has 3 days to inspect the items. When the buyer confirms receipt or after 3 days without a dispute, the system deducts a 7% platform fee and releases 93% to the seller. Users may submit up to 3 pending withdrawal requests from available balance to a saved bank account; withdrawn funds are temporarily locked and disbursed by Admin within 3 to 7 business days (100% returned to available balance if rejected).',
  },
  {
    id: 'REPUTATION',
    title: 'Reputation Score',
    keywords: ['diem uy tin', 'uy tin', 'cap do tin cay', 'trust level', 'reputation'],
    answer:
      'Every new account starts with 100 reputation points. Trust levels are: EXCELLENT (120+), GOOD (100–119), STANDARD (80–99), PROBATION (40–79, cannot create auctions), and SUSPENDED (below 40, auction and selling privileges locked). Completing an undisputed order adds 2 points and a 5-star review adds 1 point; seller-fault cancellation or missing the 24-hour auction payment deadline deducts 10 points; fraud or counterfeit violations deduct 50 points and immediately suspend the account.',
  },
  {
    id: 'SELLER',
    title: 'Seller Registration & Mode',
    keywords: [
      'dang ky ban hang',
      'nang cap seller',
      'che do nguoi ban',
      'mo shop',
      'ban hang',
      'toggle seller',
      'seller',
    ],
    answer:
      'Accounts start in the Buyer role by default. After submitting a Seller upgrade application and receiving Admin approval, you can switch instantly between Buyer Mode and Seller Mode without logging out while sharing one NEXUS Pay wallet. Sellers need at least 50 reputation points to list products or auctions and are strictly prohibited from buying or bidding on their own items.',
  },
  {
    id: 'ORDER',
    title: 'Order Lookup',
    keywords: [
      'don hang',
      'don mua',
      'don ban',
      'ma don',
      'trang thai',
      'don cua toi',
      'hang den dau',
      'lich su mua hang',
      'lich su dat hang',
      'lich su don hang',
      'xem don',
      'don da mua',
      'order',
    ],
    answer:
      'You can open My Orders to view your full purchase history and order details, or ask the chatbot directly (for example: "my orders", "what did I buy"). The chatbot only displays orders belonging to the signed-in account.',
  },
  {
    id: 'SUPPORT',
    title: 'Support Staff',
    keywords: ['nhan vien', 'khieu nai', 'bao cao', 'lua dao', 'ho tro', 'support'],
    answer:
      'You can submit a support request to Customer Support Staff with your order ID and evidence if related to a transaction. The chatbot does not adjudicate disputes; your request is placed in the support queue.',
  },
] as const;

const SENSITIVE_DATA_KEYWORDS = chatbotKnowledge[0].keywords.filter(
  (word) => word !== 'bao mat tai khoan' && word !== 'account security',
);

/** Supported static knowledge topic identifiers. */
export type ChatbotTopic = (typeof chatbotKnowledge)[number]['id'];

/**
 * Normalizes Vietnamese and ASCII text for accent-insensitive keyword matching.
 * @param text Raw input text.
 * @returns Lowercased, accent-free alphanumeric string separated by single spaces.
 */
export function normalizeChatText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0111\u0110]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Checks whether a normalized phrase appears as whole words inside text.
 * @param text Source text to search.
 * @param phrase Target phrase to match.
 * @returns True when the phrase matches whole-word boundaries.
 */
export function containsChatPhrase(text: string, phrase: string): boolean {
  const needle = normalizeChatText(phrase);
  return needle.length > 0 && ` ${normalizeChatText(text)} `.includes(` ${needle} `);
}

/**
 * Matches the highest-priority knowledge topic for a message.
 * @param text Untrusted user message.
 * @returns Matched topic identifier, or null when no rule matches.
 */
export function matchChatbotTopic(text: string): ChatbotTopic | null {
  if (containsSensitiveChatData(text)) return 'SECURITY';
  return (
    chatbotKnowledge.find((item) => item.keywords.some((word) => containsChatPhrase(text, word)))
      ?.id ?? null
  );
}

/**
 * Detects credential labels and common secret formats before external processing.
 * @param text Untrusted current message or historical turn.
 * @returns Whether the entire turn must be withheld from the model.
 */
export function containsSensitiveChatData(text: string): boolean {
  return (
    SENSITIVE_DATA_KEYWORDS.some((word) => containsChatPhrase(text, word)) ||
    /\bBearer\s+\S+|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|\bAIza[A-Za-z0-9_-]{20,}|\bsk-[A-Za-z0-9_-]{16,}|\bgh[pousr]_[A-Za-z0-9_]{20,}|\bxox[baprs]-[A-Za-z0-9-]{10,}|\bya29\.[A-Za-z0-9_-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/i.test(
      text,
    ) ||
    /(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/.test(text)
  );
}
