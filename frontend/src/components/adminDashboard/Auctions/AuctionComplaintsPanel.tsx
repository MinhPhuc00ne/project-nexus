import { useCallback, useState } from 'react';
import {
  listAdminAuctionComplaintsApi,
  resolveAdminAuctionComplaintApi,
} from '../../../services/auction.service';
import {
  complaintLabels,
  type AuctionComplaintState,
} from '../../../types/admin-auction-operations.types';
import { Badge, Button, EmptyState, Panel } from '../shared/AdminUI';
import { useAuctionOperationResource } from './useAuctionOperationResource';

export default function AuctionComplaintsPanel({
  auctionId,
  refreshKey,
}: {
  auctionId: string;
  refreshKey: number;
}) {
  const [status, setStatus] = useState<AuctionComplaintState | ''>('');
  const [selection, setSelection] = useState<{
    id: string;
    decision: 'ACCEPTED' | 'REJECTED';
  } | null>(null);
  const load = useCallback(
    () => listAdminAuctionComplaintsApi(auctionId, status),
    [auctionId, status],
  );
  const resource = useAuctionOperationResource(load, refreshKey);
  return (
    <Panel
      title="Khiếu nại đấu giá"
      subtitle="Xem bằng chứng và xử lý khiếu nại của người tham gia trong phiên này."
      action={
        <Button
          variant="secondary"
          disabled={resource.loading || resource.pending}
          onClick={resource.refresh}
        >
          Làm mới
        </Button>
      }
    >
      <select
        aria-label="Lọc khiếu nại đấu giá"
        value={status}
        disabled={resource.pending}
        onChange={(event) => {
          setStatus(event.target.value as AuctionComplaintState | '');
          setSelection(null);
        }}
        className="mb-4 rounded-lg border border-slate-200 p-3 text-xs"
      >
        <option value="">Tất cả trạng thái</option>
        {Object.entries(complaintLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {resource.loading && (
        <p role="status" className="mb-3 text-sm text-slate-500">
          Đang tải khiếu nại…
        </p>
      )}
      {(resource.error || resource.actionError) && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {resource.error || resource.actionError}
        </p>
      )}
      {resource.notice && (
        <p role="status" className="mb-3 text-sm text-emerald-700">
          {resource.notice}
        </p>
      )}
      {!resource.loading && !resource.error && !resource.rows.length && (
        <EmptyState text="Chưa có khiếu nại phù hợp trong phiên." />
      )}
      {!resource.error && (
        <div className="space-y-4">
          {resource.rows.map((complaint) => (
            <article
              key={complaint.id}
              className="space-y-3 rounded-xl border border-slate-200 p-4"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{complaint.reporter.fullName}</h3>
                  <p className="text-xs text-slate-500">
                    {complaint.reporter.email} ·{' '}
                    {new Date(complaint.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <Badge
                  tone={
                    complaint.status === 'OPEN'
                      ? 'amber'
                      : complaint.status === 'ACCEPTED'
                        ? 'green'
                        : 'red'
                  }
                >
                  {complaintLabels[complaint.status]}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                {complaint.auctionItem
                  ? `Lô ${complaint.auctionItem.lotNumber ?? '—'} · ${complaint.auctionItem.title}`
                  : 'Khiếu nại chung về phiên'}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm">{complaint.reason}</p>
              {!!complaint.evidenceUrls.length && (
                <div className="flex flex-wrap gap-3">
                  {complaint.evidenceUrls.map(
                    (url, index) =>
                      /^https?:\/\//i.test(url) && (
                        <a
                          key={`${url}-${index}`}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 underline"
                        >
                          Bằng chứng {index + 1}
                        </a>
                      ),
                  )}
                </div>
              )}
              {complaint.adminNote && (
                <p className="rounded-lg bg-slate-50 p-3 text-sm">
                  Ghi chú Admin: {complaint.adminNote}
                </p>
              )}
              {complaint.handledBy && (
                <p className="text-xs text-slate-500">
                  Xử lý bởi {complaint.handledBy.fullName}
                  {complaint.handledAt
                    ? ` · ${new Date(complaint.handledAt).toLocaleString('vi-VN')}`
                    : ''}
                </p>
              )}
              {complaint.status === 'OPEN' && (
                <div className="flex gap-2">
                  <Button
                    disabled={resource.pending || resource.loading}
                    onClick={() => setSelection({ id: complaint.id, decision: 'ACCEPTED' })}
                  >
                    Chấp thuận
                  </Button>
                  <Button
                    variant="danger"
                    disabled={resource.pending || resource.loading}
                    onClick={() => setSelection({ id: complaint.id, decision: 'REJECTED' })}
                  >
                    Từ chối
                  </Button>
                </div>
              )}
              {complaint.status === 'OPEN' && selection?.id === complaint.id && (
                <form
                  className="space-y-3 rounded-lg bg-slate-50 p-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (resource.loading || resource.error) return;
                    const note = String(new FormData(event.currentTarget).get('adminNote') ?? '');
                    void resource
                      .run(() =>
                        resolveAdminAuctionComplaintApi(complaint.id, selection.decision, note),
                      )
                      .then((success) => {
                        if (success) setSelection(null);
                      });
                  }}
                >
                  <p className="text-sm font-semibold">
                    Xác nhận {selection.decision === 'ACCEPTED' ? 'chấp thuận' : 'từ chối'} khiếu
                    nại?
                  </p>
                  <label className="block text-xs">
                    Ghi chú xử lý
                    <textarea
                      name="adminNote"
                      rows={3}
                      maxLength={1000}
                      disabled={resource.pending}
                      className="mt-1 w-full rounded-lg border border-slate-200 p-3"
                    />
                  </label>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={resource.pending || resource.loading}>
                      {resource.pending ? 'Đang xử lý…' : 'Xác nhận'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={resource.pending}
                      onClick={() => setSelection(null)}
                    >
                      Hủy
                    </Button>
                  </div>
                </form>
              )}
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}
