import {
  mockUserBreakdown,
  mockBidFrequencyValues,
  mockBidFrequencyLabels,
  mockBidFrequencySummary,
  mockSystemStatus,
  mockOverviewMetrics,
  mockSettings,
} from '../../components/adminDashboard/mockData';
import { formatMoney } from '../../components/adminDashboard/adminData';
import { useAdminSellerRequests } from '../../components/adminDashboard/AdminSellerRequests';
import {
  Activity,
  BadgeDollarSign,
  Gavel,
  Plus,
  Radio,
  ShieldCheck,
  Users,
  UserPlus,
  TrendingUp,
} from 'lucide-react';
import { Badge, Button, Panel } from '../../components/adminDashboard/AdminUI';
import { RevenueChart, RevenueComposition } from '../../components/adminDashboard/RevenueChart';
import AuctionsPanel from '../../components/adminDashboard/AuctionsPanel';
import SellerApplicationsPanel from '../../components/adminDashboard/SellerApplicationsPanel';
import RefundRequestsPanel from '../../components/adminDashboard/RefundRequestsPanel';
import { StaffInvite, UserSecurity } from '../../components/adminDashboard/UserManagement';
import { ModerationCard } from '../../components/adminDashboard/ModerationCard';
import { EventLog, LogisticsCard } from '../../components/adminDashboard/SystemCards';
import { useAdminContext } from '../../components/adminDashboard/useAdminContext';

/*
 * Trang Tổng quan: giới thiệu → số liệu → biểu đồ → danh sách chờ duyệt → công cụ quản trị.
 * Danh sách có preview được dùng chung với trang riêng; phần chỉ có ở đây giữ trong page.
 * Số hồ sơ chờ và số phiên live lấy từ data; doanh thu/tổng users vẫn là số liệu mẫu cố định.
 */
export default function AdminDashboardPage() {
  // Đọc dữ liệu và thao tác chung từ layout; trang chỉ ghép nội dung Tổng quan.
  const { data, actions } = useAdminContext();

  // Số liệu từ dữ liệu chung: duyệt một hồ sơ ở trang riêng thì các số đếm này cũng giảm.
  const sellers = useAdminSellerRequests().pendingTotal;
  const refunds = data.refunds.filter((item) => item.status === 'pending').length;
  const auctions = data.auctions.filter((item) => item.status === 'pending').length;
  const live = data.auctions.filter((item) => item.status === 'live').length;

  return (
    <div className="space-y-5">
      {/* 1. Giới thiệu trung tâm quản trị và các nút mở nhanh Studio, Đấu giá, Người dùng. */}
      <section className="flex flex-col justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/30 xl:flex-row xl:items-center">
        <div className="max-w-2xl">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Badge>LỆNH CAO CẤP HỆ THỐNG</Badge>
            <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="size-1.5 rounded-full bg-blue-500" />
              {mockSystemStatus.serviceStatus}
            </span>
          </div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
            Trung tâm điều hành toàn hệ thống{' '}
            <span className="text-primary">(NEXUS Master Operations)</span>
          </h1>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Activity size={13} className="text-primary" />
              WebSocket Engine:{' '}
              <b className="text-slate-800">{mockSystemStatus.websocketLatency}</b>
            </span>
            <span className="flex items-center gap-1.5">
              <BadgeDollarSign size={13} className="text-primary" />
              PayOS & Stripe: <b className="text-slate-800">{mockSystemStatus.paymentStatus}</b>
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-primary" />
              WebGL Cluster: <b className="text-slate-800">{mockSystemStatus.webglCluster}</b>
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 xl:w-56 xl:flex-col">
          <Button onClick={() => actions.navigate('studio')}>
            <Radio size={16} />
            Bắt đầu phát trực tiếp 3D
          </Button>
          <Button onClick={() => actions.navigate('auctions')}>
            <Plus size={16} />
            Quản lý phiên đấu giá 3D
          </Button>
          <Button variant="secondary" onClick={() => actions.navigate('users')}>
            <UserPlus size={16} />
            Thêm Staff
          </Button>
        </div>
      </section>
      {/* 2. Bốn thẻ số liệu: doanh thu, phiên live, yêu cầu chờ duyệt và người dùng. */}
      <section
        aria-label="Chỉ số tổng quan"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 [&>section]:p-4 [&>section_h2]:text-sm"
      >
        <Panel
          title="Doanh thu phí sàn"
          subtitle="PLATFORM FEE • THÁNG NÀY"
          icon={<BadgeDollarSign size={19} />}
        >
          <p className="text-2xl font-bold tracking-tight">
            {mockOverviewMetrics.monthlyPlatformFee.toLocaleString('vi-VN')}{' '}
            <span className="text-base">₫</span>
          </p>
          <p className="mt-2 text-[10px] text-primary">
            +{mockOverviewMetrics.revenueGrowth} so với tháng trước
          </p>
          <div className="mt-5 space-y-2 rounded-lg bg-blue-50/80 p-3 text-[11px]">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Phí đơn thường ({mockSettings.normalFee}%)</span>
              <b>{formatMoney(mockOverviewMetrics.normalFeeRevenue)}</b>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Phí đấu giá 3D ({mockSettings.auctionFee}%)</span>
              <b className="text-primary">{formatMoney(mockOverviewMetrics.auctionFeeRevenue)}</b>
            </div>
            <div className="flex h-1.5 overflow-hidden rounded-full">
              <div className="w-1/2 bg-primary" />
              <div className="w-1/2 bg-blue-300" />
            </div>
          </div>
        </Panel>
        <Panel title="Phiên đấu giá 3D" subtitle="ĐANG DIỄN RA" icon={<Gavel size={19} />}>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-2xl font-bold">{live} phiên live</p>
            <Badge tone="green">BROADCAST</Badge>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {mockOverviewMetrics.biddersPerSecond} người trả giá theo giây
          </p>
          <div className="mt-5 rounded-lg bg-blue-50/80 p-3 text-[11px]">
            <p className="flex justify-between gap-2">
              <span className="text-slate-500">Atomic Queue</span>
              <b className="text-primary">{mockOverviewMetrics.atomicQueueStatus}</b>
            </p>
            <p className="mt-2 flex justify-between gap-2">
              <span className="text-slate-500">Anti-sniping Engine</span>
              <b className="text-primary">+{mockSettings.antiSniping}s khi đấu giây cuối</b>
            </p>
          </div>
        </Panel>
        <Panel
          title="Yêu cầu chờ quyết định"
          subtitle="QUYỀN QUYẾT ĐỊNH ADMIN"
          icon={<ShieldCheck size={19} />}
        >
          <p className="text-2xl font-bold text-primary">{sellers + refunds + auctions} yêu cầu</p>
          <p className="mt-2 text-[11px] text-slate-500">Hồ sơ cần quản trị viên xử lý</p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              { count: sellers, label: 'Seller', tab: 'sellers' as const },
              { count: refunds, label: 'Hoàn tiền', tab: 'refunds' as const },
              { count: auctions, label: 'Vật phẩm 3D', tab: 'auctions' as const },
            ].map((item) => (
              <button
                key={item.tab}
                onClick={() => actions.navigate(item.tab)}
                className="rounded-lg bg-blue-50 p-3 text-center hover:bg-blue-100"
              >
                <b className="text-sm text-primary">{item.count}</b>
                <p className="mt-1 text-[10px] text-slate-500">{item.label}</p>
              </button>
            ))}
          </div>
        </Panel>
        <Panel
          title="Người dùng & phân quyền"
          subtitle="THÀNH VIÊN NỀN TẢNG"
          icon={<Users size={19} />}
        >
          <p className="text-2xl font-bold">
            {mockOverviewMetrics.usersTotal.toLocaleString('vi-VN')}{' '}
            <span className="text-base font-medium">users</span>
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            +{mockOverviewMetrics.newUsers24h} tài khoản đăng ký mới trong 24h qua
          </p>
          <div className="mt-5 grid grid-cols-4 gap-1 rounded-lg bg-blue-50/80 p-3 text-center text-[10px]">
            {mockUserBreakdown.map(([value, label]) => (
              <div key={label}>
                <b className="text-primary">{value}</b>
                <p className="mt-1 text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
      {/* 3. Biểu đồ: xu hướng doanh thu bên trái; cơ cấu nguồn thu và tần suất trả giá bên phải. */}
      <div className="grid items-start gap-5 xl:grid-cols-[2fr_1fr]">
        <RevenueChart />
        <div className="space-y-5">
          <RevenueComposition />
          <BidFrequency />
        </div>
      </div>
      {/* 4. Danh sách chờ duyệt: tối đa 2 hồ sơ Seller và 2 yêu cầu hoàn tiền. */}
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <SellerApplicationsPanel actions={actions} preview />
        <RefundRequestsPanel data={data} actions={actions} preview />
      </div>
      {/* 5. Bảng phiên đấu giá rút gọn; dùng chung thao tác duyệt lịch với trang Đấu giá. */}
      <AuctionsPanel data={data} actions={actions} preview />

      {/* 6. Quản lý thành viên: form thêm Staff bên trái, danh sách tài khoản bên phải. */}
      <div className="grid items-start gap-5 xl:grid-cols-[1fr_1.4fr]">
        <StaffInvite data={data} actions={actions} />
        <UserSecurity data={data} actions={actions} preview />
      </div>

      {/* 7. Công cụ hỗ trợ: từ khóa cấm, kết nối vận chuyển và nhật ký gần nhất. */}
      <div className="grid items-start gap-5 xl:grid-cols-3">
        <ModerationCard actions={actions} />
        <LogisticsCard actions={actions} />
        <EventLog compact />
      </div>
    </div>
  );
}

// Chỉ trang Tổng quan dùng biểu đồ này, nên giữ trong page thay vì xuất thành component chung.
// Biểu đồ cột nhỏ: mỗi cột có chiều cao theo giá trị mẫu, giờ cao điểm dùng màu primary.
// Badge LIVE là nhãn minh họa, component chưa đăng ký WebSocket hoặc cập nhật theo thời gian.
function BidFrequency() {
  return (
    <Panel
      title="Tần suất khớp lệnh theo giờ"
      subtitle={mockBidFrequencySummary.subtitle}
      icon={<TrendingUp size={19} />}
      action={<Badge>● LIVE</Badge>}
    >
      <div className="flex h-28 items-end gap-1.5 rounded-xl bg-blue-50/70 px-3 pt-3">
        {mockBidFrequencyValues.map((value, index) => (
          <div key={index} className="flex h-full flex-1 flex-col justify-end gap-2">
            <div
              className={`min-h-1 rounded-t ${index === 6 || index === 7 ? 'bg-primary' : 'bg-blue-300'}`}
              style={{ height: `${value * 0.8}%` }}
              title={`${mockBidFrequencyLabels[index]}: ${value * mockBidFrequencySummary.bidsPerUnit} lượt trả giá (demo)`}
            />
            <span className="pb-2 text-center text-[8px] text-slate-500">
              {mockBidFrequencyLabels[index]}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-start justify-between gap-2 text-[11px]">
        <p className="text-slate-500">
          Khung {mockBidFrequencySummary.peakWindow} đạt:
          <br />
          <strong className="text-primary">
            {mockBidFrequencySummary.peakBidsPerMinute.toLocaleString('vi-VN')} bids/phút
          </strong>
        </p>
        <Badge>{mockBidFrequencySummary.health}</Badge>
      </div>
    </Panel>
  );
}
