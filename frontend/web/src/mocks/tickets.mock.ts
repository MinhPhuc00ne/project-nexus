import type { SupportTicket } from '../pages/staff/StaffTicketConversationView';

export const MOCK_SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: 'TCK-8921',
    customer: 'Trần Hoàng Long',
    initials: 'TL',
    role: 'VIP GOLD',
    category: 'Escrow',
    status: 'chatting',
    time: '2 phút trước',
    preview: 'Tôi vừa nạp cọc 12.850.000đ qua PayOS nhưng hệ thống báo chờ xác thực...',
    messages: [
      {
        id: 1,
        author: 'Trần Hoàng Long',
        time: '14:22',
        body: 'Chào bạn, tôi vừa chuyển khoản đặt cọc 10% phiên đấu giá AP Tourbillon qua PayOS nhưng sao trạng thái vẫn chưa cập nhật?',
      },
      {
        id: 2,
        author: 'CSKH NEXUS',
        time: '14:24',
        body: 'Dạ chào anh Long, em đã kiểm tra mã giao dịch PayOS của anh. Do ngân hàng đang đồng bộ lệnh trong 1-2 phút, cọc của anh đã được bảo chứng Escrow an toàn rồi ạ.',
        isAgent: true,
      },
      {
        id: 3,
        author: 'Trần Hoàng Long',
        time: '14:25',
        body: 'Cảm ơn em nhé, anh đã thấy phòng đấu giá mở quyền trả giá rồi!',
      },
    ],
  },
  {
    id: 'TCK-8919',
    customer: 'Lê Minh Tuấn',
    initials: 'MT',
    role: 'SELLER VERIFIED',
    category: 'Shipping',
    status: 'waiting',
    time: '15 phút trước',
    preview: 'Đơn hàng Rolex Submariner gửi qua GHN Express cần hỗ trợ đồng kiểm bảo hiểm...',
    messages: [
      {
        id: 1,
        author: 'Lê Minh Tuấn',
        time: '14:05',
        body: 'Gian hàng tôi đã đóng gói sản phẩm có niêm phong RFID, nhờ sàn hỗ trợ tài xế GHN ký biên bản đồng kiểm giá trị cao.',
      },
    ],
  },
  {
    id: 'TCK-8904',
    customer: 'Phạm Quỳnh Nga',
    initials: 'QN',
    role: 'MEMBER',
    category: 'Auction 3D',
    status: 'chatting',
    time: '28 phút trước',
    preview: 'Mô hình 3D xoay 360 độ trên điện thoại iPhone có hỗ trợ xem thực tế AR không?',
    messages: [
      {
        id: 1,
        author: 'Phạm Quỳnh Nga',
        time: '13:52',
        body: 'Cho mình hỏi tính năng 3D viewer có xem được chi tiết bộ máy sau lưng đồng hồ Patek Philippe không?',
      },
      {
        id: 2,
        author: 'CSKH NEXUS',
        time: '13:55',
        body: 'Dạ chào chị Nga, chị có thể bấm nút "Mô hình 3D 360°" và dùng hai ngón tay xoay lật mặt đáy để quan sát bộ máy Calibre sắc nét từng chi tiết cơ học ạ.',
        isAgent: true,
      },
    ],
  },
  {
    id: 'TCK-8890',
    customer: 'Vũ Đức Thịnh',
    initials: 'DT',
    role: 'VIP GOLD',
    category: 'Escrow',
    status: 'resolved',
    time: '2 giờ trước',
    preview: 'Xác nhận giải ngân tiền cọc Escrow sau khi khách nhận hàng thành công.',
    messages: [
      {
        id: 1,
        author: 'Vũ Đức Thịnh',
        time: '12:10',
        body: 'Đơn hàng đã giao thành công và người mua đã xác nhận không có khiếu nại, vui lòng giải ngân tiền hàng về ví PayOS.',
      },
      {
        id: 2,
        author: 'CSKH NEXUS',
        time: '12:20',
        body: 'Hệ thống đã tự động giải ngân toàn bộ số tiền thanh toán từ quỹ ký quỹ Escrow vào tài khoản của anh rồi ạ. Chúc anh một ngày tốt lành!',
        isAgent: true,
      },
    ],
  },
];
