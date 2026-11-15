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
import AuctionAwardActionDialog from './AuctionAwardActionDialog';

const money = (value: number) => `${Number(value).toLocaleString('vi-VN')} ₫`;
export default function AuctionAwardsPanel({
  auctionId,
  refreshKey,
  realtimeConnected,
  lotId,
  onLotChange,
}: {
  auctionId: string;
  refreshKey: number;
  realtimeConnected: boolean;
  lotId: string;
  onLotChange: (lotId: string) => void;
}) {
  const load = useCallback(() => listAdminAuctionAwardsApi(auctionId), [auctionId]);
  const resource = useAuctionOperationResource(load, refreshKey, realtimeConnected);
  const [status, setStatus] = useState('');
  const [selection, setSelection] = useState<{ id: string; action: AwardAction } | null>(null);
  const selectedAward = resource.rows.find((row) => row.id === selection?.id);
  const visible = resource.rows.filter(
    (row) => (!status || row.status === status) && (!lotId || row.auctionItemId === lotId),
  );
  const lotOptions = [
    ...new Map(
      resource.rows
        .filter((row) => row.auctionItem)
        .map((row) => [row.auctionItem!.id, row.auctionItem!]),
    ).values(),
  ];
  return (
    <Panel
      title="Quyền mua & thanh toán"
      subtitle="Theo dõi quyền mua, tiền cọc, hạn thanh toán và xử lý sau đấu giá."
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
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Tổng quyền mua', resource.rows.length],
          [
            'Đang chờ xử lý',
            resource.rows.filter((row) =>
              ['AWAITING_ACCEPTANCE', 'AWAITING_DEPOSIT', 'AWAITING_CHECKOUT'].includes(row.status),
            ).length,
          ],
          [
            'Đã xử phạt quá hạn',
            resource.rows.filter((row) => row.status === 'PAYMENT_DEFAULT').length,
          ],
          ['Đã thanh toán', resource.rows.filter((row) => row.status === 'PAID').length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-primary">
              {resource.loading && !resource.rows.length ? '—' : value}
            </p>
          </div>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          aria-label="Lọc quyền mua theo lô"
          value={lotId}
          disabled={resource.pending}
          onChange={(event) => {
            onLotChange(event.target.value);
            setSelection(null);
          }}
          className="max-w-full rounded-lg border border-slate-200 p-3 text-xs"
        >
          <option value="">Tất cả lô</option>
          {lotId && !lotOptions.some((lot) => lot.id === lotId) && (
            <option value={lotId}>Lô đang chọn</option>
          )}
          {lotOptions.map((lot) => (
            <option key={lot.id} value={lot.id}>
              Lô {lot.lotNumber ?? '—'} · {lot.title}
            </option>
          ))}
        </select>
        <select
          aria-label="Lọc trạng thái quyền mua"
          value={status}
          disabled={resource.pending}
          onChange={(event) => {
            setStatus(event.target.value);
            setSelection(null);
          }}
          className="rounded-lg border border-slate-200 p-3 text-xs"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(awardLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {lotId && (
          <Button
            variant="secondary"
            disabled={resource.pending}
            onClick={() => {
              onLotChange('');
              setSelection(null);
            }}
          >
            Xem tất cả lô
          </Button>
        )}
      </div>
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
        <EmptyState
          text={
            lotId
              ? 'Lô này chưa có quyền mua phù hợp. Quyền mua được tạo khi lô kết thúc và có người thắng hợp lệ.'
              : 'Chưa có quyền mua phù hợp. Khi lô kết thúc và có người thắng hợp lệ, kết quả sẽ xuất hiện tại đây.'
          }
        />
      )}
      <div className="space-y-4">
        {visible.map((award) => {
          const canPenalize = canConfirmAwardAction(award, 'payment-default');
          const canWithdraw = canConfirmAwardAction(award, 'not-buying');
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
                  <Badge
                    tone={
                      award.status === 'PAID'
                        ? 'green'
                        : award.status === 'PAYMENT_DEFAULT'
                          ? 'red'
                          : 'amber'
                    }
                  >
                    {awardLabels[award.status] ?? award.status}
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
                <Button
                  variant="danger"
                  className="disabled:opacity-40"
                  disabled={
                    resource.pending || resource.loading || !!resource.error || !canPenalize
                  }
                  title={!canPenalize ? 'Máy chủ chưa cho phép xử phạt quyền mua này.' : undefined}
                  onClick={() => {
                    if (canPenalize) setSelection({ id: award.id, action: 'payment-default' });
                  }}
                >
                  Xử phạt quá hạn thanh toán
                </Button>
                <Button
                  variant="secondary"
                  className="disabled:opacity-40"
                  disabled={
                    resource.pending || resource.loading || !!resource.error || !canWithdraw
                  }
                  title={!canWithdraw ? 'Máy chủ chưa cho phép thao tác này.' : undefined}
                  onClick={() => {
                    if (canWithdraw) setSelection({ id: award.id, action: 'not-buying' });
                  }}
                >
                  Khách không mua nữa
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      {selection && selectedAward && (
        <AuctionAwardActionDialog
          key={`${selection.id}:${selection.action}`}
          award={selectedAward}
          action={selection.action}
          pending={resource.pending}
          blocked={resource.loading || !!resource.error}
          error={resource.actionError || resource.error}
          onClose={() => setSelection(null)}
          onConfirm={(note) => {
            if (!canConfirmAwardAction(selectedAward, selection.action)) return;
            void resource
              .run(() => confirmAdminAuctionAwardApi(selectedAward.id, selection.action, note))
              .then((success) => {
                if (success) setSelection(null);
              });
          }}
        />
      )}
    </Panel>
  );
}
