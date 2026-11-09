import { useEffect, useState } from 'react';
import { Flag } from 'lucide-react';
import Popup from '../../Popup';
import { Badge, Button, EmptyState, Panel, SearchInput } from '../shared/AdminUI';
import { DetailFields } from '../shared/CommerceUI';
import { listAdminDisputes } from '../../../services/admin';
import DisputeResolution from './DisputeResolution';
import type {
  AdminDispute,
  AdminDisputePage,
  AdminDisputeStatus,
} from '../../../types/admin-dispute.types';

const labels: Record<AdminDisputeStatus, string> = {
  OPEN: 'Mới mở',
  UNDER_REVIEW: 'Đang xem xét',
  RESOLVED_SELLER_FAVOR: 'Đã xử lý — bên bán thắng',
  RESOLVED_BUYER_FAVOR: 'Đã xử lý — bên mua thắng',
  CANCELLED: 'Đã hủy',
};
const money = (value: number) => value.toLocaleString('vi-VN') + ' ₫';
const date = (value: string) => new Date(value).toLocaleString('vi-VN');
function DisputeBadge({ status }: { status: AdminDisputeStatus }) {
  return (
    <Badge
      tone={
        status === 'OPEN'
          ? 'amber'
          : status === 'UNDER_REVIEW'
            ? 'blue'
            : status === 'CANCELLED'
              ? 'gray'
              : 'green'
      }
    >
      {labels[status]}
    </Badge>
  );
}

export default function ReportsManagement() {
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState<AdminDisputeStatus | ''>('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AdminDisputePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [detail, setDetail] = useState<AdminDispute | null>(null);
  const [resolving, setResolving] = useState(false);
  const evidenceUrls = Array.isArray(detail?.evidenceUrls)
    ? detail.evidenceUrls.filter((url): url is string => typeof url === 'string')
    : [];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTerm(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    listAdminDisputes(
      { page, limit: 10, search: term || undefined, status: status || undefined },
      controller.signal,
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        if (page > Math.max(1, data.totalPages)) {
          setPage(Math.max(1, data.totalPages));
          return;
        }
        setResult(data);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setResult(null);
          setError(cause instanceof Error ? cause.message : 'Không thể tải danh sách khiếu nại.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, term, status, refresh]);

  return (
    <div className="space-y-5">
      {result && !loading && !error && (
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries({
            'Tất cả khiếu nại': result.counters.all,
            'Chờ xử lý': result.counters.pendingReview,
            'Đã giải quyết':
              result.counters.resolvedBuyerFavor + result.counters.resolvedSellerFavor,
          }).map(([label, count]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-bold text-primary">{count}</p>
            </div>
          ))}
        </div>
      )}
      <Panel
        title="Danh sách khiếu nại"
        subtitle="Khiếu nại và tranh chấp đơn hàng trên toàn sàn"
        icon={<Flag size={19} />}
        action={
          <Button
            variant="secondary"
            onClick={() => setRefresh((value) => value + 1)}
            disabled={loading}
          >
            Tải lại
          </Button>
        }
      >
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="min-w-48 flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Tìm mã khiếu nại, đơn hàng, người liên quan..."
            />
          </div>
          <select
            aria-label="Lọc trạng thái khiếu nại"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as AdminDisputeStatus | '');
              setPage(1);
            }}
            className="max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <p role="status" className="py-12 text-center text-sm text-slate-500">
            Đang tải danh sách khiếu nại…
          </p>
        ) : error ? (
          <div role="alert" className="space-y-3 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
            <p>{error}</p>
            <Button variant="secondary" onClick={() => setRefresh((value) => value + 1)}>
              Thử lại
            </Button>
          </div>
        ) : !result?.items.length ? (
          <EmptyState text="Không tìm thấy khiếu nại phù hợp." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    {[
                      'Khiếu nại / đơn hàng',
                      'Người mở / bên bán',
                      'Nội dung',
                      'Trạng thái',
                      'Thao tác',
                    ].map((title) => (
                      <th key={title} className="px-3 py-3">
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 align-top">
                      <td className="max-w-56 break-words px-3 py-4">
                        <p className="font-semibold">{item.id}</p>
                        <p className="mt-1 text-xs text-slate-500">Đơn: {item.orderId}</p>
                        <p className="mt-1 text-xs text-slate-400">{date(item.createdAt)}</p>
                      </td>
                      <td className="px-3 py-4">
                        <p>{item.openedBy.fullName}</p>
                        <p className="text-xs text-slate-500">{item.openedBy.email}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          Bên bán: {item.order.seller.fullName}
                        </p>
                      </td>
                      <td className="max-w-xs whitespace-pre-line break-words px-3 py-4">
                        {item.reason}
                      </td>
                      <td className="px-3 py-4">
                        <DisputeBadge status={item.status} />
                      </td>
                      <td className="px-3 py-4">
                        <Button variant="secondary" onClick={() => setDetail(item)}>
                          Xem chi tiết
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <p>
                {result.total} khiếu nại · Trang {result.page}/{Math.max(1, result.totalPages)}
              </p>
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
                  disabled={page >= result.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          </>
        )}
      </Panel>
      <Popup
        isOpen={!!detail}
        onClose={() => {
          if (!resolving) setDetail(null);
        }}
        title="Chi tiết khiếu nại"
        size="lg"
      >
        {detail && (
          <div className="space-y-5">
            <DetailFields
              fields={[
                ['Mã khiếu nại', detail.id],
                ['Mã đơn hàng', detail.orderId],
                ['Người mở', `${detail.openedBy.fullName} (${detail.openedBy.email})`],
                ['Bên mua', `${detail.order.buyer.fullName} (${detail.order.buyer.email})`],
                ['Bên bán', `${detail.order.seller.fullName} (${detail.order.seller.email})`],
                ['Trạng thái', labels[detail.status]],
                ['Ngày mở', date(detail.createdAt)],
                ['Tổng tiền đơn hàng', money(detail.order.totalAmount)],
                [
                  'Tiền ký quỹ',
                  detail.order.escrowRecord ? money(detail.order.escrowRecord.totalAmount) : '—',
                ],
                ['Lý do khiếu nại', detail.reason],
                ['Kết luận / ghi chú', detail.resolutionNotes],
                ['Người xử lý', detail.resolvedBy?.fullName],
                ['Ngày xử lý', detail.resolvedAt ? date(detail.resolvedAt) : '—'],
              ]}
            />
            <section>
              <h3 className="mb-2 text-sm font-semibold">Sản phẩm trong đơn</h3>
              {detail.order.items.map((item) => (
                <p key={item.id} className="py-1 text-sm text-slate-600">
                  {item.title} × {item.quantity} — {money(item.totalPrice)}
                </p>
              ))}
            </section>
            <section>
              <h3 className="mb-2 text-sm font-semibold">Bằng chứng</h3>
              {evidenceUrls.length ? (
                evidenceUrls.map((url, index) =>
                  /^https?:\/\//i.test(url) ? (
                    <a
                      key={`${index}-${url}`}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-2 block break-all text-sm text-primary underline"
                    >
                      Bằng chứng {index + 1}
                    </a>
                  ) : (
                    <p key={`${index}-${url}`} className="break-all text-sm text-slate-500">
                      {url}
                    </p>
                  ),
                )
              ) : (
                <p className="text-sm text-slate-500">Chưa có bằng chứng đính kèm.</p>
              )}
            </section>
            {(detail.status === 'OPEN' || detail.status === 'UNDER_REVIEW') && (
              <DisputeResolution
                key={detail.id}
                orderId={detail.orderId}
                onBusyChange={setResolving}
                onResolved={() => {
                  setDetail(null);
                  setRefresh((value) => value + 1);
                }}
              />
            )}
          </div>
        )}
      </Popup>
    </div>
  );
}
