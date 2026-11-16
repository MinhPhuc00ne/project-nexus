export const chatbotKnowledge = [
  {
    id: 'SECURITY',
    title: 'Bảo mật tài khoản',
    keywords: [
      'bao mat tai khoan',
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
      'Không gửi mật khẩu, OTP hoặc khóa API vào chat. Nếu đã chia sẻ, hãy đổi mật khẩu hoặc thu hồi khóa liên quan. Dùng chức năng khôi phục mật khẩu của NEXUS hoặc liên hệ nhân viên hỗ trợ khi không truy cập được tài khoản.',
  },
  {
    id: 'CANCELLATION',
    title: 'Hủy đơn hàng',
    keywords: ['huy don', 'huy hang', 'cancel'],
    answer:
      'Bạn có thể hủy đơn trước khi GHN nhận hàng. Nếu người bán đã xác nhận và đơn đang chuẩn bị, yêu cầu hủy của người mua cần Admin duyệt. Khi GHN đã nhận hàng, hãy gửi yêu cầu trả hàng hoặc liên hệ hỗ trợ. Chatbot không tự hủy đơn.',
  },
  {
    id: 'REFUND',
    title: 'Hoàn tiền',
    keywords: ['hoan tien', 'refund', 'tra tien'],
    answer:
      'Hoàn tiền phụ thuộc kết quả hủy/trả hàng và khoản thanh toán đã thu. Tiền thanh toán ngoài hệ thống mặc định hoàn về nguồn; chỉ hoàn vào ví NEXUS nếu người mua đồng ý. Việc hủy liên kết thanh toán không đồng nghĩa đã hoàn tiền. Chưa thể cam kết thời điểm nhận tiền khi chưa có xác nhận đối soát.',
  },
  {
    id: 'RETURN',
    title: 'Trả hàng',
    keywords: ['tra hang', 'doi hang', 'hang loi', 'sai hang', 'return'],
    answer:
      'Với đơn đã giao, thời hạn kiểm tra/yêu cầu trả hàng là 3 ngày tính từ thời điểm giao được hệ thống xác nhận. Chuẩn bị lý do và bằng chứng; yêu cầu cần được duyệt, xác minh vận đơn trả và xác nhận nhận hàng trước khi hoàn tiền. Đơn có khiếu nại đang mở được tiếp tục xử lý trên hồ sơ khiếu nại.',
  },
  {
    id: 'SHIPPING',
    title: 'Giao hàng GHN',
    keywords: ['giao hang', 'van chuyen', 'ghn', 'phi ship', 'ship'],
    answer:
      'Phí và thời gian giao hàng được tính theo địa chỉ và kiện hàng. Trạng thái đơn được đồng bộ từ GHN; chatbot không tự đổi trạng thái vận đơn. Chọn mã đơn để tra cứu trạng thái đã được hệ thống xác nhận.',
  },
  {
    id: 'PAYMENT',
    title: 'Thanh toán',
    keywords: ['thanh toan', 'payos', 'quet qr', 'chuyen khoan', 'cod', 'payment'],
    answer:
      'NEXUS hỗ trợ thanh toán qua PayOS, ví NEXUS Pay và tiền mặt khi nhận hàng (COD) theo lựa chọn tại checkout. Nếu đã trả tiền nhưng đơn chưa cập nhật, kiểm tra lại đơn và liên hệ nhân viên với mã giao dịch. Không gửi mật khẩu, OTP hoặc thông tin thẻ trong hội thoại; không thanh toán lại khi giao dịch cũ chưa được đối soát.',
  },
  {
    id: 'CART',
    title: 'Giỏ hàng',
    keywords: ['gio hang', 'gio cua toi', 'cart'],
    answer:
      'Đăng nhập để xem giỏ hàng, số lượng, tiền hàng và cảnh báo giá/tồn kho. Chatbot chỉ tra cứu; thêm, xóa, đổi số lượng và đặt hàng được thực hiện trong luồng giỏ hàng của NEXUS.',
  },
  {
    id: 'AUCTION',
    title: 'Đấu giá 3D',
    keywords: ['dau gia', 'dau gia 3d', 'tra gia', 'dat gia', 'anti sniping', 'auction', 'bid'],
    answer:
      'Quy trình tham gia & mua đơn hàng đấu giá 3D trên NEXUS:\n1. Điều kiện: Tài khoản ở chế độ Người mua, có ví NEXUS Pay đủ số dư khả dụng cho mức giá đặt và đạt tối thiểu 40 điểm uy tín (một số phiên riêng có thể yêu cầu cao hơn); người bán cần từ 50 điểm uy tín để đăng sản phẩm và không được tự đấu giá phiên của mình.\n2. Đặt giá: Chọn phiên đang mở, hệ thống tạm khóa số tiền đặt giá trong ví; nếu có người trả giá cao hơn, tiền khóa của người trước được hoàn ngay về ví. Có lượt đặt giá hợp lệ trong 2 phút cuối sẽ tự động gia hạn thêm 2 phút (Anti-Sniping).\n3. Thanh toán đơn thắng: Sau khi thắng phiên, vào mục Đấu giá của tôi để xác nhận địa chỉ nhận hàng và hoàn tất thanh toán trong 24 giờ (nếu quá hạn sẽ bị hủy quyền thắng và trừ 10 điểm uy tín).',
  },
  {
    id: 'WALLET',
    title: 'Ví NEXUS Pay và Ký quỹ',
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
      'Tiền thanh toán đơn hàng được giữ ký quỹ (Escrow HELD) trên hệ thống; sau khi đơn giao thành công (DELIVERED), người mua có 3 ngày kiểm tra hàng. Khi người mua xác nhận nhận hàng hoặc hết 3 ngày không có khiếu nại, hệ thống khấu trừ 7% phí sàn và giải ngân 93% tiền hàng cho người bán. Người dùng có thể gửi tối đa 3 yêu cầu rút tiền đang chờ từ số dư khả dụng về tài khoản ngân hàng đã lưu trong hồ sơ; số tiền rút sẽ tạm khóa và được Admin duyệt giải ngân trong 3 đến 7 ngày làm việc (nếu từ chối sẽ hoàn lại 100% vào số dư khả dụng).',
  },
  {
    id: 'REPUTATION',
    title: 'Điểm uy tín',
    keywords: ['diem uy tin', 'uy tin', 'cap do tin cay', 'trust level', 'reputation'],
    answer:
      'Mọi tài khoản mới khởi tạo với 100 điểm uy tín. Các mức độ tin cậy gồm: EXCELLENT (từ 120 điểm), GOOD (100–119 điểm), STANDARD (80–99 điểm), PROBATION (40–79 điểm, không được tạo phiên đấu giá) và SUSPENDED (dưới 40 điểm, khóa quyền đấu giá và bán hàng). Hoàn tất đơn hàng không tranh chấp được cộng 2 điểm, đánh giá 5 sao cộng 1 điểm; hủy đơn do lỗi người bán hoặc quá hạn thanh toán đấu giá 24 giờ bị trừ 10 điểm; hành vi gian lận hoặc hàng giả bị trừ 50 điểm và đình chỉ tài khoản ngay lập tức.',
  },
  {
    id: 'SELLER',
    title: 'Đăng ký và Chế độ Người bán',
    keywords: [
      'dang ky ban hang',
      'nang cap seller',
      'che do nguoi ban',
      'mo shop',
      'ban hang',
      'toggle seller',
    ],
    answer:
      'Tài khoản mặc định ở vai trò Người mua (Buyer). Sau khi gửi hồ sơ nâng cấp Người bán và được Admin phê duyệt, bạn có thể chuyển đổi tức thời giữa Chế độ Người mua và Chế độ Người bán ngay trên hệ thống mà không cần đăng xuất, dùng chung một ví NEXUS Pay. Người bán cần tối thiểu 50 điểm uy tín để đăng sản phẩm hoặc đấu giá, và nghiêm cấm tự mua sản phẩm hoặc tự đặt giá trong phiên đấu giá của chính mình.',
  },
  {
    id: 'ORDER',
    title: 'Tra cứu đơn hàng',
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
      'Bạn có thể mở trang Đơn hàng của tôi để xem toàn bộ lịch sử mua hàng và chi tiết từng đơn, hoặc hỏi trực tiếp chatbot (ví dụ: "đơn mua của tôi", "tôi đã mua gì"). Chatbot chỉ hiển thị các đơn thuộc tài khoản đang đăng nhập.',
  },
  {
    id: 'SUPPORT',
    title: 'Nhân viên hỗ trợ',
    keywords: ['nhan vien', 'khieu nai', 'bao cao', 'lua dao', 'ho tro', 'support'],
    answer:
      'Bạn có thể gửi yêu cầu hỗ trợ tới nhân viên CSKH, kèm mã đơn và bằng chứng nếu liên quan giao dịch. Chatbot không phân xử khiếu nại; yêu cầu được đưa vào hàng đợi hỗ trợ.',
  },
] as const;

const SENSITIVE_DATA_KEYWORDS = chatbotKnowledge[0].keywords.filter(
  (word) => word !== 'bao mat tai khoan',
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
    .replace(/[đĐ]/g, 'd')
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
