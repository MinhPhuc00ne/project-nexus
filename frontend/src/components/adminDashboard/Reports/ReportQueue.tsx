import { useEffect, useState } from 'react';
import Popup from '../../Popup';
import { Badge, Button, EmptyState, Panel } from '../shared/AdminUI';
import { DetailFields } from '../shared/CommerceUI';
import { listAdminReports, reviewAdminReport } from '../../../services/admin';
import type {
  AdminReport,
  AdminReportPage,
  AdminReportStatus,
} from '../../../types/admin-report.types';

const labels: Record<AdminReportStatus, string> = {
  PENDING: 'Chờ xử lý',
  INVESTIGATING: 'Đang điều tra',
  CONFIRMED: 'Đã xác nhận vi phạm',
  DISMISSED: 'Đã bác bỏ',
};

export default function ReportQueue() {
  const [status, setStatus] = useState<AdminReportStatus | ''>('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AdminReportPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [detail, setDetail] = useState<AdminReport | null>(null);
  const [decision, setDecision] = useState<'CONFIRMED' | 'DISMISSED' | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    listAdminReports({ page, limit: 10, status: status || undefined }, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(data.total / data.limit));
        if (page > lastPage) setPage(lastPage);
        else setResult(data);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setResult(null);
          setError(cause instanceof Error ? cause.message : 'Không thể tải báo cáo.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, status, refresh]);

  async function submitReview() {
    if (!detail || !decision || saving || reason.trim().length < 5) return;
    setSaving(true);
    setSaveError('');
    try {
      await reviewAdminReport(detail.id, { status: decision, reason: reason.trim() });
      setDecision(null);
      setDetail(null);
      setRefresh((value) => value + 1);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Không thể xử lý báo cáo.');
    } finally {
      setSaving(false);
    }
  }

  const canReview = detail?.status === 'PENDING' || detail?.status === 'INVESTIGATING';
  const evidence = Array.isArray(detail?.evidenceUrls)
    ? detail.evidenceUrls.filter((url): url is string => typeof url === 'string')
    : [];

  return (
    <Panel
      title="Báo cáo vi phạm"
      subtitle="Báo cáo sản phẩm và gian hàng"
      action={
        <Button variant="secondary" disabled={loading} onClick={() => setRefresh((v) => v + 1)}>
          Tải lại
        </Button>
      }
    >
      <select
        aria-label="Lọc trạng thái báo cáo"
        className="mb-4 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        value={status}
        onChange={(event) => {
          setStatus(event.target.value as AdminReportStatus | '');
          setPage(1);
        }}
      >
        <option value="">Tất cả trạng thái</option>
        {Object.entries(labels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {loading ? (
        <p role="status" className="py-12 text-center text-sm text-slate-500">
          Đang tải báo cáo…
        </p>
      ) : error ? (
        <div role="alert" className="space-y-3 text-sm text-rose-700">
          <p>{error}</p>
          <Button variant="secondary" onClick={() => setRefresh((v) => v + 1)}>
            Thử lại
          </Button>
        </div>
      ) : !result?.items.length ? (
        <EmptyState text="Không tìm thấy báo cáo phù hợp." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs text-slate-500">
                <tr>
                  {['Báo cáo', 'Đối tượng', 'Trạng thái', 'Thao tác'].map((label) => (
                    <th key={label} className="p-3">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 align-top">
                    <td className="max-w-xs break-words p-3">
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(item.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </td>
                    <td className="max-w-56 break-words p-3">
                      {item.productId ? `Sản phẩm: ${item.productId}` : `Gian hàng: ${item.shopId}`}
                    </td>
                    <td className="p-3">
                      <Badge
                        tone={
                          item.status === 'PENDING'
                            ? 'amber'
                            : item.status === 'CONFIRMED'
                              ? 'red'
                              : item.status === 'DISMISSED'
                                ? 'gray'
                                : 'blue'
                        }
                      >
                        {labels[item.status]}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setDetail(item);
                          setDecision(null);
                          setReason('');
                          setSaveError('');
                        }}
                      >
                        Xem chi tiết
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
            <p>
              {result.total} báo cáo · Trang {page}/
              {Math.max(1, Math.ceil(result.total / result.limit))}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((v) => v - 1)}
              >
                Trước
              </Button>
              <Button
                variant="secondary"
                disabled={page * result.limit >= result.total}
                onClick={() => setPage((v) => v + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        </>
      )}
      <Popup
        isOpen={!!detail}
        onClose={() => {
          if (saving) return;
          if (decision) setDecision(null);
          else setDetail(null);
        }}
        title={
          decision
            ? decision === 'CONFIRMED'
              ? 'Xác nhận khiếu nại'
              : 'Bác bỏ khiếu nại'
            : 'Chi tiết báo cáo'
        }
        size="lg"
      >
        {detail && !decision && (
          <div className="space-y-4">
            <DetailFields
              fields={[
                ['Mã báo cáo', detail.id],
                ['Tiêu đề', detail.title],
                ['Nội dung', detail.description],
                ['Gian hàng', detail.shopId],
                ['Sản phẩm', detail.productId],
                ['Người báo cáo', detail.reporterId],
                ['Trạng thái', labels[detail.status]],
                ['Kết luận / ghi chú', detail.resolutionNotes],
                ['Người xử lý', detail.handledByAdminId],
                [
                  'Ngày xử lý',
                  detail.handledAt ? new Date(detail.handledAt).toLocaleString('vi-VN') : '—',
                ],
              ]}
            />
            <section>
              <h3 className="mb-2 text-sm font-semibold">Bằng chứng</h3>
              {evidence.length ? (
                evidence.map((url, index) =>
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
                    <p key={`${index}-${url}`} className="break-all text-sm">
                      {url}
                    </p>
                  ),
                )
              ) : (
                <p className="text-sm text-slate-500">Chưa có bằng chứng đính kèm.</p>
              )}
            </section>
            {canReview && (
              <div className="space-y-3 border-t pt-4">
                <label className="block text-sm">
                  Lý do xử lý
                  <textarea
                    required
                    minLength={5}
                    maxLength={2000}
                    disabled={saving}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="mt-1 block min-h-24 w-full rounded-lg border p-2"
                  />
                </label>
                <p className="text-xs text-slate-500">
                  Nhập lý do ít nhất 5 ký tự, sau đó chọn xác nhận hoặc bác bỏ khiếu nại.
                </p>
                {saveError && (
                  <p role="alert" className="text-sm text-rose-700">
                    {saveError}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={reason.trim().length < 5}
                    onClick={() => {
                      setSaveError('');
                      setDecision('CONFIRMED');
                    }}
                  >
                    Xác nhận khiếu nại
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={reason.trim().length < 5}
                    onClick={() => {
                      setSaveError('');
                      setDecision('DISMISSED');
                    }}
                  >
                    Bác bỏ khiếu nại
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        {detail && decision && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Bạn có chắc muốn <strong>{decision === 'CONFIRMED' ? 'xác nhận' : 'bác bỏ'}</strong>{' '}
              khiếu nại <strong>{detail.title}</strong>?
            </p>
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="mb-1 font-semibold">Lý do xử lý</p>
              <p className="whitespace-pre-wrap break-words">{reason.trim()}</p>
            </div>
            <p className="text-sm text-amber-700">
              Đây là kết luận cuối cùng. Sau khi lưu, bạn không thể thay đổi kết quả xử lý.
            </p>
            {saveError && (
              <p role="alert" className="text-sm text-rose-700">
                {saveError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => {
                  setDecision(null);
                  setSaveError('');
                }}
              >
                Quay lại
              </Button>
              <Button
                type="button"
                variant={decision === 'DISMISSED' ? 'danger' : 'primary'}
                disabled={saving}
                onClick={() => void submitReview()}
              >
                {saving
                  ? 'Đang xử lý…'
                  : decision === 'CONFIRMED'
                    ? 'Đồng ý xác nhận'
                    : 'Đồng ý bác bỏ'}
              </Button>
            </div>
          </div>
        )}
      </Popup>
    </Panel>
  );
}
