import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { listAdminReturns } from '../../../services/admin-returns';
import {
  returnStatusLabels,
  type AdminReturnRequest,
  type ReturnStatus,
} from '../../../types/admin-return.types';
import { Badge, Button, EmptyState, Panel } from '../shared/AdminUI';
import { date, message } from './orderPresentation';
import ReturnDetail from './ReturnDetail';

export default function ReturnManagement() {
  const [params, setParams] = useSearchParams();
  const selectedOrder = params.get('return');
  const [status, setStatus] = useState<ReturnStatus | ''>('');
  const [rows, setRows] = useState<AdminReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const currentPage = Math.min(page, pages);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    listAdminReturns(status, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setRows(data);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setRows([]);
          setError(message(cause));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [status, revision]);

  const selectOrder = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('return', id);
    else next.delete('return');
    setParams(next, { replace: !id });
  };

  return (
    <div className="space-y-4">
      {notice && (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {notice}
        </p>
      )}
      <Panel
        title="Hoàn trả hàng"
        subtitle="Duyệt yêu cầu, theo dõi vận đơn chiều về và xác nhận kiểm hàng."
        icon={<RotateCcw size={19} />}
        action={
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => setRevision((value) => value + 1)}
          >
            Làm mới
          </Button>
        }
      >
        <select
          aria-label="Lọc trạng thái trả hàng"
          value={status}
          className="mb-4 rounded-lg border border-slate-200 p-3 text-sm"
          onChange={(event) => {
            setStatus(event.target.value as ReturnStatus | '');
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(returnStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {loading ? (
          <p role="status" className="py-12 text-center text-sm text-slate-500">
            Đang tải yêu cầu trả hàng…
          </p>
        ) : error ? (
          <div role="alert" className="space-y-3 text-sm text-red-600">
            <p>{error}</p>
            <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
              Thử lại
            </Button>
          </div>
        ) : !rows.length ? (
          <EmptyState text="Chưa có yêu cầu trả hàng phù hợp." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[740px] text-left text-xs">
                <thead className="bg-blue-50 text-slate-500">
                  <tr>
                    {[
                      'Đơn hàng',
                      'Lý do trả hàng',
                      'Vận đơn chiều về',
                      'Trạng thái',
                      'Thao tác',
                    ].map((label) => (
                      <th key={label} scope="col" className="p-3 font-semibold">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.slice((currentPage - 1) * 10, currentPage * 10).map((row) => (
                    <tr key={row.id} className="align-top hover:bg-slate-50">
                      <td className="p-3">
                        <p className="max-w-52 break-all font-semibold">{row.orderId}</p>
                        <p className="mt-2 text-slate-400">{date(row.createdAt)}</p>
                      </td>
                      <td className="max-w-72 p-3">
                        <p className="line-clamp-3 whitespace-pre-wrap break-words">{row.reason}</p>
                      </td>
                      <td className="p-3">
                        <p className="break-all">
                          {row.returnWaybillCode || 'Chưa gắn vận đơn riêng'}
                        </p>
                        {row.receivedAt && (
                          <p className="mt-2 text-slate-500">Nhận: {date(row.receivedAt)}</p>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge
                          tone={
                            row.status === 'REJECTED'
                              ? 'red'
                              : row.status === 'COMPLETED'
                                ? 'green'
                                : 'amber'
                          }
                        >
                          {returnStatusLabels[row.status as ReturnStatus] ?? row.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Button variant="secondary" onClick={() => selectOrder(row.orderId)}>
                          Xem & xử lý
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                {rows.length} yêu cầu · Trang {currentPage}/{pages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Trước
                </Button>
                <Button
                  variant="secondary"
                  disabled={currentPage >= pages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          </>
        )}
      </Panel>
      {selectedOrder && (
        <ReturnDetail
          key={selectedOrder}
          orderId={selectedOrder}
          onClose={() => selectOrder(null)}
          onUpdated={() => {
            setNotice(
              'Đã cập nhật yêu cầu. Trạng thái và hoàn tiền được cập nhật theo kết quả xử lý của hệ thống.',
            );
            setRevision((value) => value + 1);
          }}
        />
      )}
    </div>
  );
}
