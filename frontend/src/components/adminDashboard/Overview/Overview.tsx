import {
  BadgeDollarSign,
  ChartNoAxesCombined,
  CircleDollarSign,
  Gavel,
  Radio,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Badge, Button, Panel } from '../shared/AdminUI';
import { formatMoney } from '../shared/adminData';
import { useAdminContext } from '../shared/useAdminContext';
import useOverviewData from './useOverviewData';

const roleLabels = {
  BUYER: 'Buyer',
  SELLER: 'Seller',
  SUPPORT_STAFF: 'Staff',
  ADMIN: 'Admin',
} as const;

export default function AdminDashboardPage() {
  const { actions } = useAdminContext();
  const { data, loading, errors, refresh } = useOverviewData();
  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:flex-row xl:items-center">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Badge>TỔNG QUAN HỆ THỐNG</Badge>
            {data.ghn && (
              <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span
                  className={`size-1.5 rounded-full ${data.ghn.ping.status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                />
                GHN {data.ghn.ping.status === 'CONNECTED' ? 'đã kết nối' : 'chưa kết nối'}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Trung tâm điều hành NEXUS
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={loading} onClick={refresh}>
            <RefreshCw size={14} />
            {loading ? 'Đang tải…' : 'Làm mới'}
          </Button>
          <Button variant="secondary" onClick={() => actions.navigate('studio')}>
            <Radio size={14} />
            Đi đến Studio
          </Button>
        </div>
      </section>
      {!!errors.length && (
        <p role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Một số số liệu chưa tải được. Vui lòng thử làm mới.
        </p>
      )}
      <section
        aria-label="Chỉ số tổng quan"
        aria-busy={loading}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 [&>section]:p-4 [&>section_h2]:text-sm"
      >
        <Panel
          title="Doanh thu phí sàn"
          subtitle="TỔNG PHÍ ĐÃ THU"
          icon={<BadgeDollarSign size={19} />}
        >
          <p className="break-words text-2xl font-bold tracking-tight">
            {formatMoney(data.wallet?.totalPlatformFeeCollected ?? 0)}
          </p>
          <p className="mt-2 text-[10px] text-slate-500">Lũy kế toàn thời gian</p>
          <div className="mt-5 flex justify-between gap-2 rounded-lg bg-blue-50/80 p-3 text-[11px]">
            <span className="text-slate-500">Tỷ lệ phí sàn</span>
            <b className="text-primary">
              {data.settings ? `${data.settings.platformFeePercentage}%` : '—'}
            </b>
          </div>
        </Panel>
        <Panel title="Phiên đấu giá 3D" subtitle="ĐANG DIỄN RA" icon={<Gavel size={19} />}>
          <p className="text-2xl font-bold">{data.live ?? 0} phiên live</p>
          <p className="mt-2 text-[10px] text-slate-500">Bao gồm phiên đang gia hạn</p>
          <div className="mt-5 flex justify-between gap-2 rounded-lg bg-blue-50/80 p-3 text-[11px]">
            <span className="text-slate-500">Gia hạn chống trả giá sát giờ</span>
            <b className="text-primary">
              {data.settings ? `${data.settings.antiSnipingExtendMinutes} phút` : '—'}
            </b>
          </div>
        </Panel>
        <Panel
          title="Yêu cầu chờ quyết định"
          subtitle="CHỜ ADMIN XỬ LÝ"
          icon={<ShieldCheck size={19} />}
        >
          <p className="text-2xl font-bold text-primary">
            {data.queues?.totalPendingActions ?? 0} yêu cầu
          </p>
          <p className="mt-2 text-[10px] text-slate-500">Tổng các yêu cầu đang chờ</p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              {
                label: 'Seller',
                count: data.queues?.pendingQueues.sellerUpgradeRequests ?? 0,
                tab: 'sellers' as const,
              },
              {
                label: 'Khiếu nại',
                count: data.queues?.pendingQueues.openDisputes ?? 0,
                tab: 'refunds' as const,
              },
              {
                label: 'Vật phẩm 3D',
                count: data.queues?.pendingQueues.auctionConsignments ?? 0,
                tab: 'auctions' as const,
              },
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
            {(data.users?.total ?? 0).toLocaleString('vi-VN')}{' '}
            <span className="text-base font-medium">users</span>
          </p>
          <p className="mt-2 text-[10px] text-slate-500">Tổng tài khoản trong hệ thống</p>
          <div className="mt-5 grid grid-cols-4 gap-1 rounded-lg bg-blue-50/80 p-3 text-center text-[10px]">
            {Object.entries(roleLabels).map(([role, label]) => (
              <div key={role}>
                <b className="text-primary">
                  {data.users?.roles[role as keyof typeof roleLabels] ?? 0}
                </b>
                <p className="mt-1 text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
      <div className="grid items-start gap-5 xl:grid-cols-[2fr_1fr]">
        <Panel
          title="Xu hướng doanh thu phí sàn"
          subtitle="THEO THỜI GIAN"
          icon={<ChartNoAxesCombined size={19} />}
        >
          <p className="text-2xl font-bold">0 ₫</p>
          <div className="mt-5 flex min-h-60 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
            Chưa có dữ liệu
          </div>
        </Panel>
        <div className="space-y-5">
          <Panel title="Cơ cấu nguồn thu phí sàn" icon={<CircleDollarSign size={19} />}>
            <p className="text-2xl font-bold">0 ₫</p>
            <p className="mt-3 text-xs text-slate-400">Chưa có dữ liệu</p>
          </Panel>
          <Panel title="Tần suất trả giá theo giờ" icon={<TrendingUp size={19} />}>
            <p className="text-2xl font-bold">0 lượt</p>
            <p className="mt-3 text-xs text-slate-400">Chưa có dữ liệu</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
