export const chatbotKnowledge = [
  {
    id: 'SECURITY',
    title: 'Bảo mật tài khoản',
    keywords: ['mat khau', 'otp', 'token', 'khoa api'],
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
    keywords: ['thanh toan', 'payos', 'quet qr', 'chuyen khoan', 'payment'],
    answer:
      'NEXUS hỗ trợ luồng thanh toán PayOS và ví theo lựa chọn tại checkout. Nếu đã trả tiền nhưng đơn chưa cập nhật, kiểm tra lại đơn và liên hệ nhân viên với mã giao dịch. Không gửi mật khẩu, OTP hoặc thông tin thẻ trong hội thoại; không thanh toán lại khi giao dịch cũ chưa được đối soát.',
  },
  {
    id: 'ORDER',
    title: 'Tra cứu đơn hàng',
    keywords: ['don hang', 'ma don', 'trang thai', 'don cua toi', 'hang den dau', 'order'],
    answer:
      'Vui lòng chọn mã đơn hàng cần tra cứu. Chatbot chỉ xem được đơn mà tài khoản đăng nhập là người mua hoặc người bán.',
  },
  {
    id: 'SUPPORT',
    title: 'Nhân viên hỗ trợ',
    keywords: ['nhan vien', 'khieu nai', 'bao cao', 'lua dao', 'ho tro', 'support'],
    answer:
      'Bạn có thể gửi yêu cầu hỗ trợ tới nhân viên CSKH, kèm mã đơn và bằng chứng nếu liên quan giao dịch. Chatbot không phân xử khiếu nại; yêu cầu được đưa vào hàng đợi hỗ trợ.',
  },
] as const;

export type ChatbotTopic = (typeof chatbotKnowledge)[number]['id'];

export function normalizeChatText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function containsChatPhrase(text: string, phrase: string): boolean {
  const needle = normalizeChatText(phrase);
  return needle.length > 0 && ` ${normalizeChatText(text)} `.includes(` ${needle} `);
}

export function matchChatbotTopic(text: string): ChatbotTopic | null {
  return (
    chatbotKnowledge.find((item) => item.keywords.some((word) => containsChatPhrase(text, word)))
      ?.id ?? null
  );
}
