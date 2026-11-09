import { useState, type FormEvent } from 'react';
import type { AdminAuctionItem, ReviewAuctionItemInput } from '../../../services/auction.service';
import { Button } from '../shared/AdminUI';

const inputClass = 'mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm';

export default function ReviewAuctionItemForm({
  item,
  busy,
  onReview,
}: {
  item: AdminAuctionItem;
  busy: boolean;
  onReview: (itemId: string, data: ReviewAuctionItemInput) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState('');
  const money = (value: number | string) => `${Number(value).toLocaleString('vi-VN')} ₫`;

  async function submit(event: FormEvent<HTMLFormElement>, action: 'APPROVE' | 'REJECT') {
    event.preventDefault();
    if (busy) return;
    setError('');
    const values = new FormData(event.currentTarget);
    try {
      let payload: ReviewAuctionItemInput;
      if (action === 'REJECT') {
        const reason = String(values.get('reason') || '').trim();
        if (!reason) throw new Error('Vui lòng nhập lý do từ chối.');
        payload = { action, rejectionReason: reason };
      } else if (!editing) {
        payload = { action };
      } else {
        const optionalNumber = (name: string, minimum: number, integer = false) => {
          const text = String(values.get(name) || '').trim();
          if (!text) return undefined;
          const value = Number(text);
          if (
            !Number.isFinite(value) ||
            value < minimum ||
            (integer && !Number.isSafeInteger(value))
          )
            throw new Error('Vui lòng kiểm tra số lô và các mức giá.');
          return value;
        };
        const startingPrice = optionalNumber('price', 10000);
        const reservePrice = optionalNumber('reserve', 0);
        const effectiveReserve =
          reservePrice ??
          (item.proposedReservePrice === null ? undefined : Number(item.proposedReservePrice));
        if (
          effectiveReserve !== undefined &&
          effectiveReserve > 0 &&
          effectiveReserve < (startingPrice ?? Number(item.proposedStartingPrice))
        )
          throw new Error('Giá bảo lưu phải lớn hơn hoặc bằng giá khởi điểm.');
        payload = {
          action,
          startingPrice,
          reservePrice,
          lotNumber: optionalNumber('lot', 1, true),
          bidIncrement: optionalNumber('increment', 1000),
        };
      }
      await onReview(item.id, payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể xử lý sản phẩm.');
    }
  }

  return (
    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-600">Đề xuất của seller</p>
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => {
            setEditing(!editing);
            setError('');
          }}
        >
          {editing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa'}
        </Button>
      </div>
      <dl className="grid gap-3 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Giá khởi điểm</dt>
          <dd className="mt-1 font-medium">{money(item.proposedStartingPrice)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Giá bảo lưu</dt>
          <dd className="mt-1 font-medium">
            {Number(item.proposedReservePrice) > 0 ? money(item.proposedReservePrice!) : 'Không có'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Bước giá</dt>
          <dd className="mt-1 font-medium">{money(item.proposedBidIncrement)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Số lô</dt>
          <dd className="mt-1 font-medium">{item.lotNumber ?? 'Tự gán khi phê duyệt'}</dd>
        </div>
      </dl>
      <form onSubmit={(event) => void submit(event, 'APPROVE')}>
        <fieldset disabled={busy} className="space-y-3 disabled:opacity-60">
          {editing && (
            <>
              <p className="text-xs text-slate-500">
                Điều chỉnh của admin được áp dụng khi phê duyệt.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs">
                  Số lô (để trống để tự gán)
                  <input name="lot" type="number" min="1" step="1" className={inputClass} />
                </label>
                <label className="text-xs">
                  Giá khởi điểm (₫)
                  <input
                    name="price"
                    type="number"
                    min="10000"
                    step="1"
                    defaultValue={item.proposedStartingPrice}
                    className={inputClass}
                  />
                </label>
                <label className="text-xs">
                  Giá bảo lưu (₫)
                  <input
                    name="reserve"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={item.proposedReservePrice ?? ''}
                    className={inputClass}
                  />
                </label>
                <label className="text-xs">
                  Bước giá (₫)
                  <input
                    name="increment"
                    type="number"
                    min="1000"
                    step="1"
                    defaultValue={item.proposedBidIncrement}
                    className={inputClass}
                  />
                </label>
              </div>
            </>
          )}
          <div className="flex gap-3">
            <Button type="submit">{busy ? 'Đang xử lý…' : 'Phê duyệt'}</Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                setRejecting(!rejecting);
                setError('');
              }}
            >
              Từ chối
            </Button>
          </div>
        </fieldset>
      </form>
      {rejecting && (
        <form
          onSubmit={(event) => void submit(event, 'REJECT')}
          className="rounded-lg bg-red-50 p-3"
        >
          <fieldset disabled={busy} className="space-y-3 disabled:opacity-60">
            <label className="block text-xs">
              Lý do từ chối *
              <textarea autoFocus name="reason" required rows={3} className={inputClass} />
            </label>
            <div className="flex gap-3">
              <Button type="submit" variant="danger">
                {busy ? 'Đang xử lý…' : 'Xác nhận từ chối'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setRejecting(false);
                  setError('');
                }}
              >
                Hủy
              </Button>
            </div>
          </fieldset>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
