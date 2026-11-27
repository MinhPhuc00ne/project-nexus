import { BadgeCheck, Gavel, Image, Inbox, PackageSearch, ShieldCheck, Star } from 'lucide-react';

/**
 * The sections of the staff workspace.
 */
export const navigation = [
  { key: 'orders', i18nKey: 'nav.orders', icon: PackageSearch },
  { key: 'team', i18nKey: 'nav.team', icon: BadgeCheck },
  { key: 'inbox', i18nKey: 'nav.inbox', icon: Inbox },
  { key: 'disputes', i18nKey: 'nav.disputes', icon: ShieldCheck },
  { key: 'auctionSupport', i18nKey: 'nav.auctionSupport', icon: Gavel },
  { key: 'banners', i18nKey: 'nav.banners', icon: Image },
  { key: 'reviews', i18nKey: 'nav.reviews', icon: Star },
] as const;

export type StaffSection = (typeof navigation)[number]['key'];

export const sectionContent: Record<
  StaffSection,
  { title: string; description: string; topics: string[] }
> = {
  team: {
    title: 'Quản lý nhân viên hỗ trợ',
    description: 'Quản lý nhân viên và gửi lời mời kích hoạt tài khoản hỗ trợ.',
    topics: [],
  },
  inbox: {
    title: 'Hộp thư hỗ trợ khách hàng',
    description: 'Tiếp nhận hội thoại, phản hồi khách hàng và theo dõi hàng đợi hỗ trợ.',
    topics: [],
  },
  disputes: {
    title: 'Xử lý khiếu nại và tranh chấp',
    description:
      'Tiếp nhận phản ánh về đơn hàng, kiểm tra bằng chứng và theo dõi tiến độ giải quyết.',
    topics: ['Tiếp nhận khiếu nại', 'Kiểm tra bằng chứng', 'Theo dõi kết quả xử lý'],
  },
  orders: {
    title: 'Hỗ trợ đơn hàng và hậu mãi',
    description: 'Tra cứu đơn, kiểm tra vận chuyển, ký quỹ và xử lý yêu cầu trả hàng.',
    topics: [],
  },
  auctionSupport: {
    title: 'Hỗ trợ phiên đấu giá',
    description: 'Theo dõi yêu cầu về phòng đấu giá, thao tác trả giá và hiển thị sản phẩm 3D.',
    topics: ['Sự cố phòng đấu giá', 'Yêu cầu về lượt trả giá', 'Hiển thị sản phẩm 3D'],
  },
  banners: {
    title: 'Quản lý banner sự kiện',
    description: 'Tạo, cập nhật và điều chỉnh lịch hiển thị banner trên sàn.',
    topics: [],
  },
  reviews: {
    title: 'Kiểm duyệt đánh giá',
    description: 'Xem và xử lý đánh giá vi phạm theo quyền Staff được cấp.',
    topics: [],
  },
};

export const staffSectionPaths: Record<StaffSection, string> = {
  team: '/staff/team',
  inbox: '/staff/inbox',
  disputes: '/staff/disputes',
  orders: '/staff/orders',
  auctionSupport: '/staff/auction-support',
  banners: '/staff/banners',
  reviews: '/staff/reviews',
};
