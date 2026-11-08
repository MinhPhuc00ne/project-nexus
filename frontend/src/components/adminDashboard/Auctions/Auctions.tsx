import { useEffect, useState } from 'react';
import { Gavel, Plus, RefreshCw } from 'lucide-react';
import type { AuctionStatus } from '@nexus/types';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getAdminAuctionsApi,
  type AdminAuctionListResponse,
} from '../../../services/auction.service';
import { Badge, Button, EmptyState, Panel, SearchInput } from '../shared/AdminUI';
import CreateAuctionDialog from './CreateAuctionDialog';

const statuses = [
  ['SCHEDULED', 'Đã lên lịch'],
  ['ACTIVE', 'Đang diễn ra'],
  ['EXTENDED', 'Đang gia hạn'],
  ['ENDED', 'Đã kết thúc'],
  ['FAILED', 'Không thành công'],
  ['CANCELLED', 'Đã hủy'],
  ['DRAFT', 'Bản nháp'],
] as const;

export default function AdminAuctionsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<AdminAuctionListResponse | null>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setKeyword(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setData(null);
    void getAdminAuctionsApi({
      page,
      limit: 10,
      search: keyword,
      status: (status || undefined) as AuctionStatus | undefined,
    })
      .then((result) => {
        if (active) setData(result);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(cause instanceof Error ? cause.message : 'Không thể tải phiên đấu giá.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, page, keyword, status, revision]);

  return (
    <Panel
      title="Quản lí đấu giá"
      subtitle="Tạo phiên, thiết lập thời gian và điều kiện uy tín cho người tham gia."
      icon={<Gavel size={19} />}
      action={
        <Button onClick={() => setCreating(true)}>
          <Plus size={15} />
          Tạo phiên đấu giá
        </Button>
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="w-full sm:max-w-sm">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo tên phiên đấu giá..."
          />
        </div>
        <select
          aria-label="Trạng thái phiên đấu giá"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 bg-white p-3 text-xs"
        >
          <option value="">Tất cả trạng thái</option>
          {statuses.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => setRevision((value) => value + 1)}
        >
          <RefreshCw size={14} />
          Làm mới
        </Button>
      </div>
      {loading && (
        <p role="status" className="py-10 text-center text-sm text-slate-500">
          Đang tải phiên đấu giá…
        </p>
      )}
      {error && (
        <div role="alert" className="space-y-3 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
            Thử lại
          </Button>
        </div>
      )}
      {!loading &&
        data &&
        (data.items.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="bg-blue-50 text-slate-500">
                  <tr>
                    {[
                      'Phiên đấu giá',
                      'Bắt đầu',
                      'Kết thúc',
                      'Điểm uy tín tối thiểu',
                      'Lượt trả giá',
                      'Trạng thái',
                    ].map((label) => (
                      <th key={label} className="p-4 font-semibold">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((item) => (
                    <tr key={item.id}>
                      <td className="max-w-72 p-4">
                        <p className="break-words font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-slate-500">
                          Người tạo: {item.createdByAdmin?.fullName || item.seller?.fullName || '—'}
                        </p>
                      </td>
                      <td className="whitespace-nowrap p-4">
                        {new Date(item.startTime).toLocaleString('vi-VN')}
                      </td>
                      <td className="whitespace-nowrap p-4">
                        {new Date(item.endTime).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-4">
                        <p>Buyer: {item.minBuyerReputation}</p>
                        <p className="mt-1">Seller: {item.minSellerReputation}</p>
                      </td>
                      <td className="p-4">{item.totalBidsCount}</td>
                      <td className="p-4">
                        <Badge
                          tone={
                            item.status === 'ACTIVE' || item.status === 'EXTENDED'
                              ? 'green'
                              : 'blue'
                          }
                        >
                          {statuses.find(([value]) => value === item.status)?.[1] || item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                {data.pagination.total} phiên · Trang {data.pagination.page}/
                {Math.max(1, data.pagination.totalPages)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Trước
                </Button>
                <Button
                  variant="secondary"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState text="Chưa có phiên đấu giá phù hợp." />
        ))}
      {creating && (
        <CreateAuctionDialog
          key={token}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            setStatus('');
            setSearch('');
            setKeyword('');
            setPage(1);
            setRevision((value) => value + 1);
          }}
        />
      )}
    </Panel>
  );
}
