import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { Badge, Button, EmptyState, Panel, SearchInput } from '../shared/AdminUI';
import { formatMoney } from '../shared/adminData';
import { getAdminWalletTransactions } from '../../../services/admin';
import type {
  AdminWalletTransaction,
  AdminWalletTransactionPage,
  AdminWalletTransactionType,
} from '../../../types/admin-wallet.types';
import { typeLabels, statusLabels, date } from './transactionPresentation';
import { buildTransactionCsv } from './transactionCsv';
import TransactionDetailDialog from './TransactionDetailDialog';

export default function TransactionHistory() {
  const [params, setParams] = useSearchParams();
  const orderId = params.get('order') ?? '';
  const [search, setSearch] = useState(orderId);
  const [term, setTerm] = useState(orderId);
  const [type, setType] = useState<AdminWalletTransactionType | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AdminWalletTransactionPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [detail, setDetail] = useState<AdminWalletTransaction | null>(null);
  const invalidRange = !!from && !!to && from > to;

  useEffect(() => {
    setSearch(orderId);
  }, [orderId]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTerm(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (invalidRange) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getAdminWalletTransactions(
      {
        page,
        limit: 10,
        search: term || undefined,
        type: type || undefined,
        startDate: from || undefined,
        endDate: to || undefined,
      },
      controller.signal,
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, data.totalPages);
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setResult(data);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setResult(null);
          setError(cause instanceof Error ? cause.message : 'Không thể tải lịch sử giao dịch.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, term, type, from, to, invalidRange, refresh]);

  function exportCsv() {
    if (!result?.items.length || loading || invalidRange || error) return;
    const url = URL.createObjectURL(
      new Blob([buildTransactionCsv(result.items)], { type: 'text/csv;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `nexus-wallet-transactions-page-${result.page}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const inputClass =
    'mt-1 block max-w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-800';
  return (
    <div className="space-y-5">
      <Panel
        title="Lịch sử giao dịch & đối soát"
        subtitle="Tra cứu các giao dịch của ví nền tảng và thông tin đơn hàng liên quan"
        icon={<Wallet size={19} />}
        action={
          <Button
            variant="secondary"
            disabled={loading || invalidRange}
            onClick={() => setRefresh((value) => value + 1)}
          >
            Tải lại
          </Button>
        }
      >
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Tìm mã tham chiếu hoặc mô tả giao dịch..."
            />
          </div>
          <label className="text-xs text-slate-500">
            Loại giao dịch
            <select
              className={inputClass}
              value={type}
              onChange={(event) => {
                setType(event.target.value as AdminWalletTransactionType | '');
                setPage(1);
              }}
            >
              <option value="">Tất cả loại giao dịch</option>
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Từ ngày
            <input
              type="date"
              value={from}
              aria-invalid={invalidRange}
              aria-describedby={invalidRange ? 'transaction-date-error' : undefined}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
              className={inputClass}
            />
          </label>
          <label className="text-xs text-slate-500">
            Đến ngày
            <input
              type="date"
              value={to}
              aria-invalid={invalidRange}
              aria-describedby={invalidRange ? 'transaction-date-error' : undefined}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
              className={inputClass}
            />
          </label>
          <Button
            variant="secondary"
            disabled={loading || invalidRange || !!error || !result?.items.length}
            onClick={exportCsv}
          >
            Xuất CSV trang hiện tại
          </Button>
          {(from || to || type || search || orderId) && (
            <Button
              variant="secondary"
              onClick={() => {
                setFrom('');
                setTo('');
                setType('');
                setSearch('');
                setTerm('');
                setPage(1);
                const next = new URLSearchParams(params);
                next.delete('order');
                setParams(next, { replace: true });
              }}
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>
        {invalidRange ? (
          <p id="transaction-date-error" role="alert" className="text-sm text-red-600">
            Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.
          </p>
        ) : loading ? (
          <p role="status" className="py-12 text-center text-sm text-slate-500">
            Đang tải lịch sử giao dịch…
          </p>
        ) : error ? (
          <div role="alert" className="space-y-3 text-sm text-red-600">
            <p>{error}</p>
            <Button variant="secondary" onClick={() => setRefresh((value) => value + 1)}>
              Thử lại
            </Button>
          </div>
        ) : (
          result && (
            <>
              {result.items.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left text-xs">
                    <thead className="bg-blue-50 text-slate-500">
                      <tr>
                        {[
                          'Giao dịch / Tham chiếu',
                          'Loại / Thời gian',
                          'Đơn hàng / Người bán',
                          'Số tiền',
                          'Trạng thái',
                          'Thao tác',
                        ].map((title) => (
                          <th scope="col" key={title} className="p-3 font-semibold">
                            {title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.items.map((row) => (
                        <tr key={row.id} className="align-top hover:bg-slate-50/70">
                          <td className="max-w-56 break-all p-3 leading-5">
                            <p className="font-semibold">{row.id}</p>
                            <p className="text-slate-500">{row.referenceId || '—'}</p>
                          </td>
                          <td className="p-3 leading-5">
                            <p>{typeLabels[row.type] ?? row.type}</p>
                            <p className="text-slate-500">{date(row.createdAt)}</p>
                          </td>
                          <td className="max-w-64 break-words p-3 leading-5">
                            {row.orderDetails ? (
                              <>
                                <p className="break-all">{row.orderDetails.orderId}</p>
                                <p>{row.orderDetails.shopName || '—'}</p>
                              </>
                            ) : (
                              <p>{row.description || '—'}</p>
                            )}
                          </td>
                          <td className="whitespace-nowrap p-3 font-semibold">
                            {formatMoney(row.amount)}
                          </td>
                          <td className="p-3">
                            <Badge
                              tone={
                                row.status === 'SUCCESS'
                                  ? 'green'
                                  : row.status === 'FAILED'
                                    ? 'red'
                                    : 'amber'
                              }
                            >
                              {statusLabels[row.status] ?? row.status}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Button variant="secondary" onClick={() => setDetail(row)}>
                              Chi tiết
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState text="Không có giao dịch phù hợp với bộ lọc." />
              )}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <span>
                  {result.total} giao dịch · Trang {result.page}/{Math.max(1, result.totalPages)}
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
                    disabled={page >= result.totalPages}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            </>
          )
        )}
      </Panel>
      <TransactionDetailDialog detail={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

export { buildTransactionCsv } from './transactionCsv';
