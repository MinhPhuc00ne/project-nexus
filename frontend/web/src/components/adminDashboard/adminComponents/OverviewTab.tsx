import {
  Activity,
  BadgeDollarSign,
  Gavel,
  Plus,
  Radio,
  ShieldCheck,
  Users,
  UserPlus,
} from 'lucide-react';
import { Badge, Button, Panel } from './AdminUI';
import { BidFrequency, RevenueChart, RevenueComposition } from './RevenueChart';
import AuctionsTab from './AuctionsTab';
import SellersTab from './SellersTab';
import RefundsTab from './RefundsTab';
import { StaffInvite, UserSecurity } from './UsersTab';
import { ModerationCard } from './SettingsTab';
import { EventLog, LogisticsCard } from './SystemTab';
import type { AdminTabProps } from './adminTypes';

/*
 * Tab Tổng quan ghép các component nghiệp vụ thành dashboard theo bố cục ảnh.
 * Những tab có preview dùng bản rút gọn ngay tại đây, tránh viết lại cùng một card.
 * Số hồ sơ chờ và số phiên live lấy từ data; doanh thu/tổng users vẫn là số liệu mẫu cố định.
 */
export default function OverviewTab({ data, actions }: AdminTabProps) {
  // Giá trị dẫn xuất từ props: không cần useState, dữ liệu cha đổi thì số đếm tính lại.
  const sellers = data.sellers.filter((item) => item.status === 'pending').length;
  const refunds = data.refunds.filter((item) => item.status === 'pending').length;
  const auctions = data.auctions.filter((item) => item.status === 'pending').length;
  const live = data.auctions.filter((item) => item.status === 'live').length;
  return (
    <div className="space-y-5">
      {/* Khối giới thiệu và lối tắt: actions.navigate đổi URL sang tab tương ứng. */}
      <section className="flex flex-col justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/30 xl:flex-row xl:items-center">
        <div className="max-w-2xl">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Badge>LỆNH CAO CẤP HỆ THỐNG</Badge>
            <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="size-1.5 rounded-full bg-blue-500" />
              Tất cả dịch vụ hoạt động bình thường
            </span>
          </div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
            Trung tâm điều hành toàn hệ thống{' '}
            <span className="text-primary">(NEXUS Master Operations)</span>
          </h1>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Activity size={13} className="text-primary" />
              WebSocket Engine: <b className="text-slate-800">12ms</b>
            </span>
            <span className="flex items-center gap-1.5">
              <BadgeDollarSign size={13} className="text-primary" />
              PayOS & Stripe: <b className="text-slate-800">Sẵn sàng</b>
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-primary" />
              WebGL Cluster: <b className="text-slate-800">6 nodes online</b>
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
      {/* KPI: mobile 1 cột, sm 2 cột, xl 4 cột. [&>section] chỉnh card con tại khối này. */}
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
            1.842.500.000 <span className="text-base">₫</span>
          </p>
          <p className="mt-2 text-[10px] text-primary">+18.4% so với tháng trước</p>
          <div className="mt-5 space-y-2 rounded-lg bg-blue-50/80 p-3 text-[11px]">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Phí đơn thường (7%)</span>
              <b>924.300.000 ₫</b>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Phí đấu giá 3D (16%)</span>
              <b className="text-primary">918.200.000 ₫</b>
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
          <p className="mt-2 text-[11px] text-slate-500">142 người trả giá theo giây</p>
          <div className="mt-5 rounded-lg bg-blue-50/80 p-3 text-[11px]">
            <p className="flex justify-between gap-2">
              <span className="text-slate-500">Atomic Queue</span>
              <b className="text-primary">Không tắc nghẽn</b>
            </p>
            <p className="mt-2 flex justify-between gap-2">
              <span className="text-slate-500">Anti-sniping Engine</span>
              <b className="text-primary">+120s khi đấu giây cuối</b>
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
            38.420 <span className="text-base font-medium">users</span>
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            +280 tài khoản đăng ký mới trong 24h qua
          </p>
          <div className="mt-5 grid grid-cols-4 gap-1 rounded-lg bg-blue-50/80 p-3 text-center text-[10px]">
            {[
              ['34.1K', 'Buyer'],
              ['3.85K', 'Seller'],
              ['42', 'Staff'],
              ['8', 'Banned'],
            ].map(([value, label]) => (
              <div key={label}>
                <b className="text-primary">{value}</b>
                <p className="mt-1 text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
      {/* Desktop chia tỷ lệ 2:1 giữa biểu đồ và các card bên phải; mobile xếp dọc. */}
      <div className="grid items-start gap-5 xl:grid-cols-[2fr_1fr]">
        <RevenueChart />
        <div className="space-y-5">
          <RevenueComposition />
          <BidFrequency />
        </div>
      </div>
      {/* preview chỉ lấy tối đa 2 hồ sơ mỗi loại; nút "Xem tất cả" mở tab đầy đủ. */}
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <SellersTab data={data} actions={actions} preview />
        <RefundsTab data={data} actions={actions} preview />
      </div>
      {/* Bảng đấu giá và form Staff tái sử dụng cùng actions với các tab riêng. */}
      <AuctionsTab data={data} actions={actions} preview />
      <div className="grid items-start gap-5 xl:grid-cols-[1fr_1.4fr]">
        <StaffInvite data={data} actions={actions} />
        <UserSecurity data={data} actions={actions} preview />
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-3">
        <ModerationCard actions={actions} />
        <LogisticsCard actions={actions} />
        <EventLog compact />
      </div>
    </div>
  );
}
