import {
  Activity,
  BadgeCheck,
  BookOpen,
  Gavel,
  History,
  Image,
  Inbox,
  ShieldCheck,
} from 'lucide-react';

export const navigation = [
  { label: 'Quản Lý Nhân Viên', icon: BadgeCheck },
  { label: 'Hộp Thư Trực Tuyến', icon: Inbox },
  { label: 'Khiếu Nại & Tranh Chấp', icon: ShieldCheck },
  { label: 'Hỗ Trợ Đấu Giá 3D', icon: Gavel },
  { label: 'Hướng Dẫn & FAQ Sàn', icon: BookOpen },
  { label: 'Quản Lý Banner', icon: Image },
  { label: 'Lịch Sử & CSAT', icon: History },
  { label: 'Hiệu Suất Cá Nhân', icon: Activity },
] as const;

export type StaffSection = (typeof navigation)[number]['label'];

export const sectionContent: Record<
  StaffSection,
  { title: string; description: string; topics: string[] }
> = {
  'Quản Lý Nhân Viên': {
    title: 'Quản lý nhân viên hỗ trợ',
    description: 'Quản lý nhân viên và gửi lời mời kích hoạt tài khoản hỗ trợ.',
    topics: [],
  },
  'Hộp Thư Trực Tuyến': {
    title: 'Hộp thư hỗ trợ khách hàng',
    description: 'Tiếp nhận hội thoại, phản hồi khách hàng và theo dõi hàng đợi hỗ trợ.',
    topics: [],
  },
  'Khiếu Nại & Tranh Chấp': {
    title: 'Xử lý khiếu nại và tranh chấp',
    description:
      'Tiếp nhận phản ánh về đơn hàng, kiểm tra bằng chứng và theo dõi tiến độ giải quyết.',
    topics: ['Tiếp nhận khiếu nại', 'Kiểm tra bằng chứng', 'Theo dõi kết quả xử lý'],
  },
  'Hỗ Trợ Đấu Giá 3D': {
    title: 'Hỗ trợ phiên đấu giá',
    description: 'Theo dõi yêu cầu về phòng đấu giá, thao tác trả giá và hiển thị sản phẩm 3D.',
    topics: ['Sự cố phòng đấu giá', 'Yêu cầu về lượt trả giá', 'Hiển thị sản phẩm 3D'],
  },
  'Hướng Dẫn & FAQ Sàn': {
    title: 'Hướng dẫn nghiệp vụ và câu hỏi thường gặp',
    description: 'Tra cứu quy trình tiếp nhận và xử lý yêu cầu hỗ trợ trên NEXUS.',
    topics: [
      'Tiếp nhận: xác định khách hàng, mã đơn hàng hoặc phiên đấu giá và nội dung cần hỗ trợ.',
      'Xử lý: kiểm tra thông tin, thu thập bằng chứng và chuyển bộ phận có thẩm quyền.',
      'Hoàn tất: thông báo kết quả, ghi nhận nội dung xử lý và xác nhận với khách hàng.',
    ],
  },
  'Quản Lý Banner': {
    title: 'Quản lý banner sự kiện',
    description: 'Tạo, cập nhật và điều chỉnh lịch hiển thị banner trên sàn.',
    topics: [],
  },
  'Lịch Sử & CSAT': {
    title: 'Lịch sử hỗ trợ và đánh giá khách hàng',
    description: 'Tra cứu yêu cầu đã xử lý và phản hồi về chất lượng hỗ trợ.',
    topics: ['Yêu cầu đã xử lý', 'Đánh giá hài lòng (CSAT)', 'Phản hồi của khách hàng'],
  },
  'Hiệu Suất Cá Nhân': {
    title: 'Hiệu suất hỗ trợ cá nhân',
    description:
      'Theo dõi khối lượng công việc, thời gian phản hồi và chất lượng xử lý yêu cầu của bạn.',
    topics: ['Khối lượng yêu cầu', 'Thời gian phản hồi', 'Chất lượng xử lý'],
  },
};

export const staffSectionPaths: Record<StaffSection, string> = {
  'Quản Lý Nhân Viên': '/staff/team',
  'Hộp Thư Trực Tuyến': '/staff/inbox',
  'Khiếu Nại & Tranh Chấp': '/staff/disputes',
  'Hỗ Trợ Đấu Giá 3D': '/staff/auction-support',
  'Hướng Dẫn & FAQ Sàn': '/staff/faq',
  'Quản Lý Banner': '/staff/banners',
  'Lịch Sử & CSAT': '/staff/history',
  'Hiệu Suất Cá Nhân': '/staff/performance',
};
