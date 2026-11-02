import { useEffect, useState, type FormEvent } from 'react';
import { getStaffDisputes, resolveStaffDispute } from '../../services/staff';
import type { StaffDispute, StaffDisputeStatus, StaffDisputesPage } from '../../services/staff';

const statusLabel: Record<StaffDisputeStatus, string> = {
  OPEN: 'Mới mở',
  UNDER_REVIEW: 'Đang xem xét',
  RESOLVED_SELLER_FAVOR: 'Đã xử lý, có lợi cho Seller',
  RESOLVED_BUYER_FAVOR: 'Đã xử lý, có lợi cho Buyer',
  CANCELLED: 'Đã hủy',
};

const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export default function StaffDisputesPanel() {
  const [result, setResult] = useState<StaffDisputesPage | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StaffDisputeStatus | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<StaffDispute | null>(null);
  const [verdict, setVerdict] = useState<'BUYER' | 'SELLER'>('BUYER');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    void getStaffDisputes({
      page,
      limit: 10,
      status: status || undefined,
      search: search || undefined,
    })
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Không thể tải danh sách khiếu nại.');
          setResult(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, status, search, reload]);

  async function submitResolution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !reason.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await resolveStaffDispute(selected.orderId, verdict, reason.trim());
      setSelected(null);
      setReason('');
      setReload((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu kết quả xử lý.');
    } finally {
      setSaving(false);
    }
  }

  const counters = result?.counters;
  const summaryCards = [
    { label: 'Tất cả', value: counters?.all },
    { label: 'Chờ xử lý', value: counters?.pendingReview },
    { label: 'Đang xem xét', value: counters?.underReview },
    {
      label: 'Đã giải quyết',
      value: (counters?.resolvedBuyerFavor ?? 0) + (counters?.resolvedSellerFavor ?? 0),
    },
  ];

  return (
    <section className="mt-5 space-y-4" aria-label="Khiếu nại và tranh chấp">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{value ?? '—'}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input
          aria-label="Tìm khiếu nại"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Tìm mã khiếu nại, đơn hàng hoặc khách hàng"
          className="min-w-56 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <select
          aria-label="Lọc trạng thái khiếu nại"
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value as StaffDisputeStatus | '');
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(statusLabel).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setReload((value) => value + 1)}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Tải lại
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {loading ? (
        <p
          role="status"
          className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500"
        >
          Đang tải khiếu nại từ hệ thống…
        </p>
      ) : result?.items.length ? (
        <div className="space-y-3">
          {result.items.map((dispute) => {
            const canResolve = dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW';
            const evidenceUrls = Array.isArray(dispute.evidenceUrls)
              ? dispute.evidenceUrls.filter((url): url is string => typeof url === 'string')
              : [];
            return (
              <article
                key={dispute.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      Khiếu nại #{dispute.id.slice(0, 8)}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Đơn hàng {dispute.orderId} ·{' '}
                      {new Date(dispute.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {statusLabel[dispute.status]}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-700">{dispute.reason}</p>
                {evidenceUrls.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {evidenceUrls.map((url, index) => (
                      <a
                        key={`${dispute.id}-evidence-${index}`}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                      >
                        Mở bằng chứng {index + 1}
                      </a>
                    ))}
                  </div>
                )}
                <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  <p>
                    Người khiếu nại: <b>{dispute.openedBy.fullName}</b> ({dispute.openedBy.email})
                  </p>
                  <p>
                    Giá trị đơn: <b>{money(dispute.order.totalAmount)}</b>
                  </p>
                  <p>Buyer: {dispute.order.buyer.fullName}</p>
                  <p>Seller: {dispute.order.seller.fullName}</p>
                </div>
                {dispute.order.items.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                    {dispute.order.items.map((item) => (
                      <li key={item.id}>
                        {item.title} × {item.quantity} — {money(item.totalPrice)}
                      </li>
                    ))}
                  </ul>
                )}
                {dispute.resolutionNotes && (
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    Ghi chú xử lý: {dispute.resolutionNotes}
                  </p>
                )}
                {canResolve && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(dispute);
                      setVerdict('BUYER');
                      setReason('');
                    }}
                    className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Xử lý khiếu nại
                  </button>
                )}
              </article>
            );
          })}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
            <span>
              Trang {result.page} / {Math.max(1, result.totalPages)} · {result.total} khiếu nại
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((value) => value - 1)}
                className="rounded-md border px-3 py-1.5 disabled:opacity-40"
              >
                Trước
              </button>
              <button
                disabled={page >= result.totalPages || loading}
                onClick={() => setPage((value) => value + 1)}
                className="rounded-md border px-3 py-1.5 disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Không có khiếu nại phù hợp.
        </p>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
          role="presentation"
        >
          <form
            onSubmit={submitResolution}
            className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-dispute-resolution-title"
          >
            <div>
              <h2 id="staff-dispute-resolution-title" className="text-lg font-bold text-slate-900">
                Kết luận khiếu nại
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Kết quả sẽ cập nhật trạng thái tranh chấp và xử lý tiền ký quỹ của đơn{' '}
                {selected.orderId}.
              </p>
            </div>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              Kết luận
              <select
                value={verdict}
                onChange={(event) => setVerdict(event.target.value as 'BUYER' | 'SELLER')}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <option value="BUYER">Có lợi cho Buyer</option>
                <option value="SELLER">Có lợi cho Seller</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              Lý do xử lý
              <textarea
                required
                minLength={1}
                maxLength={2000}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="min-h-28 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setSelected(null)}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving || !reason.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Đang lưu…' : 'Xác nhận xử lý'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
