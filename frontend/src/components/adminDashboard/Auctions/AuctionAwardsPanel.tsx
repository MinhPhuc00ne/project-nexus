import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  confirmAdminAuctionAwardApi,
  listAdminAuctionAwardsApi,
} from '../../../services/auction.service';
import {
  awardLabels,
  canConfirmAwardAction,
  type AwardAction,
} from '../../../types/admin-auction-operations.types';
import { Badge, Button, EmptyState, Panel } from '../shared/AdminUI';
import { useAuctionOperationResource } from './useAuctionOperationResource';

const money = (value: number) => `${Number(value).toLocaleString('vi-VN')} ₫`;
export default function AuctionAwardsPanel({
  auctionId,
  now,
  refreshKey,
}: {
  auctionId: string;
  now: number;
  refreshKey: number;
}) {
  const load = useCallback(() => listAdminAuctionAwardsApi(auctionId), [auctionId]);
  const resource = useAuctionOperationResource(load, refreshKey);
  const [status, setStatus] = useState('');
  const [selection, setSelection] = useState<{ id: string; action: AwardAction } | null>(null);
  const visible = resource.rows.filter((row) => !status || row.status === status);
  return (
    <Panel
      title="Quyền mua sau đấu giá"
      subtitle="Theo dõi người thắng, tiền cọc và hạn thanh toán của từng lô."
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
        aria-label="Lọc trạng thái quyền mua"
        value={status}
        disabled={resource.pending}
        onChange={(event) => setStatus(event.target.value)}
        className="mb-4 rounded-lg border border-slate-200 p-3 text-xs"
      >
        <option value="">Tất cả trạng thái</option>
        {Object.entries(awardLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {resource.loading && (
        <p role="status" className="mb-3 text-sm text-slate-500">
          Đang cập nhật quyền mua…
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
      {!resource.loading && !resource.error && !visible.length && (
        <EmptyState text="Chưa có quyền mua phù hợp trong phiên." />
      )}
      <div className="space-y-4">
        {visible.map((award) => {
          const selected = selection?.id === award.id;
          const overdue =
            award.status === 'AWAITING_CHECKOUT' && new Date(award.expiresAt).getTime() <= now;
          return (
            <article key={award.id} className="space-y-4 rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    {award.auctionItem?.lotNumber ? `Lô ${award.auctionItem.lotNumber} · ` : ''}
                    {award.auctionItem?.title ?? 'Vật phẩm đấu giá'}
                  </h3>
                  <p className="mt-1 text-sm">
                    {award.buyer?.fullName ?? 'Chưa có thông tin người mua'}
                  </p>
                  <p className="text-xs text-slate-500">{award.buyer?.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={award.status === 'PAID' ? 'green' : overdue ? 'red' : 'amber'}>
                    {awardLabels[award.status]}
                  </Badge>
                  <Badge tone="gray">
                    {award.tier === 'PRIMARY_WINNER' ? 'Người thắng' : 'Người mua thứ hai'}
                  </Badge>
                </div>
              </div>
              <dl className="grid gap-3 text-xs sm:grid-cols-4">
                {[
                  ['Giá mua', money(award.offerAmount)],
                  ['Tiền cọc', money(award.depositAmount)],
                  ['Tiền hàng còn lại', money(award.remainingProductAmount)],
                  ['Hạn xử lý', new Date(award.expiresAt).toLocaleString('vi-VN')],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="mt-1 font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              {award.resolutionNote && (
                <p className="text-sm text-slate-600">Ghi chú: {award.resolutionNote}</p>
              )}
              {award.order && (
                <p className="text-xs">
                  Đơn hàng:{' '}
                  <Link to="/admin/orders" className="break-all text-blue-600 underline">
                    {award.order.id}
                  </Link>{' '}
                  · {award.order.status}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {award.canConfirmPaymentDefault && (
                  <Button
                    variant="danger"
                    disabled={
                      resource.pending ||
                      resource.loading ||
                      !!resource.error ||
                      !canConfirmAwardAction(award, 'payment-default', now)
                    }
                    title={!overdue ? 'Chỉ xác nhận khi đã hết hạn thanh toán.' : undefined}
                    onClick={() => setSelection({ id: award.id, action: 'payment-default' })}
                  >
                    Xác nhận quá hạn thanh toán
                  </Button>
                )}
                {award.canMarkNotBuying && (
                  <Button
                    variant="secondary"
                    disabled={resource.pending || resource.loading || !!resource.error}
                    onClick={() => setSelection({ id: award.id, action: 'not-buying' })}
                  >
                    Khách không mua nữa
                  </Button>
                )}
              </div>
              {selected && selection && (
                <form
                  className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!canConfirmAwardAction(award, selection.action, now)) return;
                    const values = new FormData(event.currentTarget);
                    const note = String(values.get('note') ?? '');
                    void resource
                      .run(() => confirmAdminAuctionAwardApi(award.id, selection.action, note))
                      .then((success) => {
                        if (success) setSelection(null);
                      });
                  }}
                >
                  <p className="text-sm font-semibold">
                    {selection.action === 'payment-default'
                      ? 'Người mua sẽ mất 30% cọc, bị trừ 10 điểm uy tín. Với người thắng đầu tiên, hệ thống sẽ mời người mua thứ hai nếu đủ điều kiện.'
                      : 'Hoàn 30% cọc nếu đã đóng và đóng lô hàng. Chỉ áp dụng cho người mua thứ hai.'}
                  </p>
                  <label className="block text-xs">
                    Ghi chú
                    <textarea
                      name="note"
                      maxLength={1000}
                      disabled={resource.pending}
                      className="mt-1 w-full rounded-lg border border-slate-200 p-3"
                      rows={3}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" required disabled={resource.pending} />
                    Tôi xác nhận thực hiện thao tác này.
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      variant="danger"
                      disabled={
                        resource.pending ||
                        resource.loading ||
                        !!resource.error ||
                        !canConfirmAwardAction(award, selection.action, now)
                      }
                    >
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
          );
        })}
      </div>
    </Panel>
  );
}
