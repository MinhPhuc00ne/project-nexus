import { useEffect, useState } from 'react';
import { ArrowLeft, Gavel, RefreshCw } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import AuctionLotCard from '../../components/adminDashboard/Auctions/AuctionLotCard';
import { useAdminAuctionLots } from '../../components/adminDashboard/Auctions/useAdminAuctionLots';
import { statuses } from '../../components/adminDashboard/Auctions/auctionStatuses';
import AuctionAwardsPanel from '../../components/adminDashboard/Auctions/AuctionAwardsPanel';
import AuctionComplaintsPanel from '../../components/adminDashboard/Auctions/AuctionComplaintsPanel';
import { useAuth } from '../../contexts/AuthContext';
import {
  Badge,
  Button,
  EmptyState,
  Panel,
  SearchInput,
} from '../../components/adminDashboard/shared/AdminUI';

export default function AdminAuctionLotsPage() {
  const { auctionId = '' } = useParams();
  const { token } = useAuth();
  return <AuctionLotsWorkspace key={`${auctionId}:${token}`} auctionId={auctionId} />;
}

function AuctionLotsWorkspace({ auctionId }: { auctionId: string }) {
  const {
    data,
    loading,
    error,
    actionError,
    notice,
    connected,
    realtimeError,
    refreshKey,
    pendingId,
    clockOffset,
    endLot,
    refresh,
  } = useAdminAuctionLots(auctionId);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'lots' | 'awards' | 'complaints'>('lots');
  const [status, setStatus] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const lots = data?.lots ?? [];
  const visible = lots.filter(
    (lot) =>
      (!status || lot.lotStatus === status) &&
      `${lot.title} ${lot.lotNumber ?? ''} ${lot.seller?.fullName ?? ''}`
        .toLocaleLowerCase('vi-VN')
        .includes(search.trim().toLocaleLowerCase('vi-VN')),
  );
  const liveCount = lots.filter((lot) => ['ACTIVE', 'EXTENDED'].includes(lot.lotStatus)).length;
  const introRemaining = data?.isIntroActive
    ? Math.max(
        0,
        Math.ceil(
          (new Date(data.startTime).getTime() + (data.introDurationMs ?? 0) - now - clockOffset) /
            1000,
        ),
      )
    : 0;

  return (
    <div className="space-y-5">
      <Link
        to="/admin/auctions"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft size={16} /> Danh sách phiên đấu giá
      </Link>
      <Panel
        title={data?.title ?? 'Điều hành đấu giá từng lô'}
        subtitle="Theo dõi giá, thời gian và chốt kết quả riêng cho từng lô đã được duyệt."
        icon={<Gavel size={20} />}
        action={
          <Button variant="secondary" disabled={loading || !!pendingId} onClick={refresh}>
            <RefreshCw size={15} /> Làm mới
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {data && (
            <Badge>{statuses.find(([value]) => value === data.status)?.[1] ?? data.status}</Badge>
          )}
          <Badge tone={connected ? 'green' : 'amber'}>
            {connected
              ? 'Đang cập nhật trực tiếp'
              : 'Mất kết nối trực tiếp · tự tải lại mỗi 15 giây'}
          </Badge>
        </div>
        {data && (
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ['Tổng số lô', lots.length],
              ['Đang đấu giá', liveCount],
              [
                'Đã kết thúc',
                lots.filter((lot) => ['ENDED', 'SETTLED'].includes(lot.lotStatus)).length,
              ],
              ['Không thành công', lots.filter((lot) => lot.lotStatus === 'FAILED').length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-bold text-primary">{value}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
      <div role="group" aria-label="Nội dung quản trị phiên" className="flex flex-wrap gap-2">
        {(
          [
            ['lots', 'Điều hành lô'],
            ['awards', 'Quyền mua & thanh toán'],
            ['complaints', 'Khiếu nại'],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            variant={tab === value ? 'primary' : 'secondary'}
            aria-pressed={tab === value}
            disabled={!!pendingId}
            onClick={() => setTab(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      {introRemaining > 0 && (
        <p role="status" className="rounded-xl bg-blue-50 p-4 text-sm text-primary">
          Đang trình chiếu giới thiệu 3D · Còn {introRemaining} giây trước khi mở đặt giá.
        </p>
      )}
      {realtimeError && (
        <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          {realtimeError}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {actionError && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {actionError}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          {notice}
        </p>
      )}
      {loading && !data && (
        <p role="status" className="py-12 text-center text-sm text-slate-500">
          Đang tải các lô đấu giá…
        </p>
      )}
      {data && tab === 'awards' && (
        <AuctionAwardsPanel auctionId={auctionId} now={now + clockOffset} refreshKey={refreshKey} />
      )}
      {data && tab === 'complaints' && (
        <AuctionComplaintsPanel auctionId={auctionId} refreshKey={refreshKey} />
      )}
      {data && tab === 'lots' && (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-56 flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Tìm tên vật phẩm, số lô hoặc seller…"
              />
            </div>
            <select
              aria-label="Lọc trạng thái lô"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white p-3 text-xs"
            >
              <option value="">Tất cả trạng thái lô</option>
              {statuses.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {!lots.length ? (
            <EmptyState text="Phiên chưa có lô được duyệt. Hãy duyệt sản phẩm ký gửi tại danh sách phiên." />
          ) : !visible.length ? (
            <EmptyState text="Không có lô phù hợp với bộ lọc." />
          ) : (
            <div className="grid items-start gap-5 xl:grid-cols-2">
              {visible.map((lot) => (
                <AuctionLotCard
                  key={lot.id}
                  lot={lot}
                  now={now + clockOffset}
                  confirming={confirmingId === lot.id}
                  busy={!!pendingId}
                  refreshing={loading || !!error}
                  onConfirm={() => setConfirmingId(lot.id)}
                  onCancel={() => setConfirmingId(null)}
                  onEnd={() => {
                    void endLot(lot.id).then((success) => {
                      if (success) setConfirmingId(null);
                    });
                  }}
                  onRefresh={refresh}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
