import { BadgeCheck, Gavel, Image, Inbox, PackageSearch, ShieldCheck, Star } from 'lucide-react';

/**
 * The sections of the staff workspace.
 *
 * "Lịch Sử & CSAT" and "Hiệu Suất Cá Nhân" used to be here. Both rendered a
 * list of topics and then a notice reading "Backend does not yet provide a
 * Staff resolution history and CSAT API" — there are no such endpoints, and no
 * data behind either tab. A menu entry that always says it has nothing costs
 * attention every time somebody working a queue clicks it, so they are gone
 * until there is something to show.
 */
export const navigation = [
  { label: 'Đơn hàng & Hậu mãi', i18nKey: 'nav.orders', icon: PackageSearch },
  { label: 'Quản Lý Nhân Viên', i18nKey: 'nav.team', icon: BadgeCheck },
  { label: 'Hộp Thư Trực Tuyến', i18nKey: 'nav.inbox', icon: Inbox },
  { label: 'Khiếu Nại & Tranh Chấp', i18nKey: 'nav.disputes', icon: ShieldCheck },
  { label: 'Hỗ Trợ Đấu Giá 3D', i18nKey: 'nav.auctionSupport', icon: Gavel },
  { label: 'Quản Lý Banner', i18nKey: 'nav.banners', icon: Image },
  { label: 'Kiểm Duyệt Đánh Giá', i18nKey: 'nav.reviews', icon: Star },
] as const;

export type StaffSection = (typeof navigation)[number]['label'];

export const sectionKeyMap = {
  'Quản Lý Nhân Viên': 'team',
  'Hộp Thư Trực Tuyến': 'inbox',
  'Khiếu Nại & Tranh Chấp': 'disputes',
  'Đơn hàng & Hậu mãi': 'orders',
  'Hỗ Trợ Đấu Giá 3D': 'auctionSupport',
  'Quản Lý Banner': 'banners',
  'Kiểm Duyệt Đánh Giá': 'reviews',
} as const satisfies Record<StaffSection, string>;

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
  'Đơn hàng & Hậu mãi': {
    title: 'Hỗ trợ đơn hàng và hậu mãi',
    description: 'Tra cứu đơn, kiểm tra vận chuyển, ký quỹ và xử lý yêu cầu trả hàng.',
    topics: [],
  },
  'Hỗ Trợ Đấu Giá 3D': {
    title: 'Hỗ trợ phiên đấu giá',
    description: 'Theo dõi yêu cầu về phòng đấu giá, thao tác trả giá và hiển thị sản phẩm 3D.',
    topics: ['Sự cố phòng đấu giá', 'Yêu cầu về lượt trả giá', 'Hiển thị sản phẩm 3D'],
  },
  'Quản Lý Banner': {
    title: 'Quản lý banner sự kiện',
    description: 'Tạo, cập nhật và điều chỉnh lịch hiển thị banner trên sàn.',
    topics: [],
  },
  'Kiểm Duyệt Đánh Giá': {
    title: 'Kiểm duyệt đánh giá',
    description: 'Xem và xử lý đánh giá vi phạm theo quyền Staff được cấp.',
    topics: [],
  },
};

export const staffSectionPaths: Record<StaffSection, string> = {
  'Quản Lý Nhân Viên': '/staff/team',
  'Hộp Thư Trực Tuyến': '/staff/inbox',
  'Khiếu Nại & Tranh Chấp': '/staff/disputes',
  'Đơn hàng & Hậu mãi': '/staff/orders',
  'Hỗ Trợ Đấu Giá 3D': '/staff/auction-support',
  'Quản Lý Banner': '/staff/banners',
  'Kiểm Duyệt Đánh Giá': '/staff/reviews',
};
