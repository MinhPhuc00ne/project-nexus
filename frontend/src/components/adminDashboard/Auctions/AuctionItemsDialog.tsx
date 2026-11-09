import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  getAdminAuctionItemsApi,
  registerAuctionItemApi,
  reviewAuctionItemApi,
  type ReviewAuctionItemInput,
  type AdminAuctionEntity,
  type AdminAuctionItemsResponse,
} from '../../../services/auction.service';
import Popup from '../../Popup';
import { useToast } from '../../ToastNotification';
import { Badge, Button, EmptyState } from '../shared/AdminUI';
import ReviewAuctionItemForm from './ReviewAuctionItemForm';
import AuctionItemDetails from './AuctionItemDetails';

const itemStatuses: Record<string, string> = {
  PENDING_REVIEW: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
};
const inputClass =
  'mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500';

function imageUrls(value: FormDataEntryValue | null): string[] {
  const urls = String(value || '')
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean);
  if (
    !urls.length ||
    urls.some((url) => {
      try {
        return !['http:', 'https:'].includes(new URL(url).protocol);
      } catch {
        return true;
      }
    })
  )
    throw new Error('Vui lòng nhập URL ảnh hợp lệ (http/https), mỗi dòng một ảnh.');
  return urls;
}

export default function AuctionItemsDialog({
  auction,
  onClose,
  onChanged,
}: {
  auction: AdminAuctionEntity;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [data, setData] = useState<AdminAuctionItemsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const [detail, setDetail] = useState<{ id: string; view: 'item' | 'shop' } | null>(null);
  const lock = useRef(false);
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setLoadError('');
    void getAdminAuctionItemsApi(auction.id)
      .then((result) => {
        if (current) setData(result);
      })
      .catch((cause: unknown) => {
        if (current)
          setLoadError(cause instanceof Error ? cause.message : 'Không thể tải sản phẩm.');
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [auction.id, revision]);

  const canAdd = !!data && ['DRAFT', 'SCHEDULED', 'ACTIVE'].includes(data.auctionStatus);
  const detailItem = data?.items.find((item) => item.id === detail?.id);

  async function review(itemId: string, payload: ReviewAuctionItemInput) {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    try {
      const result = await reviewAuctionItemApi(itemId, payload);
      if (!active.current) return;
      // Hide review controls immediately, even if refreshing the list fails.
      setData((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      status: payload.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
                      ...(payload.action === 'REJECT'
                        ? { rejectionReason: payload.rejectionReason }
                        : {
                            startingPrice: payload.startingPrice ?? item.proposedStartingPrice,
                            lotNumber: payload.lotNumber ?? item.lotNumber,
                          }),
                    }
                  : item,
              ),
            }
          : current,
      );
      toast.success(result.message);
      setRevision((value) => value + 1);
      onChanged();
    } finally {
      lock.current = false;
      if (active.current) setSaving(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || !canAdd) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const text = (name: string) => String(values.get(name) || '').trim();
    setError('');
    try {
      if (!text('title') || !text('description'))
        throw new Error('Vui lòng nhập tên và mô tả sản phẩm.');
      const price = Number(text('price'));
      const increment = Number(text('increment'));
      const reserve = text('reserve') ? Number(text('reserve')) : undefined;
      if (
        !Number.isFinite(price) ||
        price < 10000 ||
        !Number.isFinite(increment) ||
        increment < 1000
      )
        throw new Error('Giá khởi điểm tối thiểu 10.000 ₫, bước giá tối thiểu 1.000 ₫.');
      if (reserve !== undefined && (!Number.isFinite(reserve) || reserve < price))
        throw new Error('Giá bảo lưu phải lớn hơn hoặc bằng giá khởi điểm.');
      const payload = {
        title: text('title'),
        description: text('description'),
        images: imageUrls(values.get('images')),
        certificateImages: imageUrls(values.get('certificates')),
        proposedStartingPrice: price,
        proposedBidIncrement: increment,
        proposedReservePrice: reserve,
        appraisalAgency: text('agency') || undefined,
        appraisalCertificateNumber: text('certificateNumber') || undefined,
        certificateIssueDate: text('issueDate')
          ? new Date(text('issueDate')).toISOString()
          : undefined,
        threeModelKey: text('model') || undefined,
      };
      lock.current = true;
      setSaving(true);
      const result = await registerAuctionItemApi(auction.id, payload);
      if (!active.current) return;
      form.reset();
      toast.success(result.message);
      setRevision((value) => value + 1);
      onChanged();
    } catch (cause) {
      if (active.current)
        setError(cause instanceof Error ? cause.message : 'Không thể thêm sản phẩm.');
    } finally {
      lock.current = false;
      if (active.current) setSaving(false);
    }
  }

  return (
    <Popup
      isOpen
      size="xl"
      title={`Sản phẩm · ${auction.title}`}
      onClose={() => {
        if (!lock.current) onClose();
      }}
    >
      {detail && detailItem ? (
        <AuctionItemDetails
          key={`${detail.id}:${detail.view}`}
          item={detailItem}
          view={detail.view}
          minimumScore={auction.minSellerReputation}
          onBack={() => setDetail(null)}
        />
      ) : (
        <div className="space-y-6">
          <section aria-label="Danh sách sản phẩm" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">
                Sản phẩm trong phiên {data ? `(${data.totalCount})` : ''}
              </h3>
              <Button
                variant="secondary"
                disabled={loading || saving}
                onClick={() => setRevision((value) => value + 1)}
              >
                Làm mới
              </Button>
            </div>
            {loading && (
              <p role="status" className="text-sm text-slate-500">
                Đang tải sản phẩm…
              </p>
            )}
            {loadError && (
              <p role="alert" className="text-sm text-red-700">
                {loadError}
              </p>
            )}
            {!loading && !loadError && data?.items.length === 0 && (
              <EmptyState text="Chưa có sản phẩm đăng ký trong phiên." />
            )}
            {!loading &&
              !loadError &&
              data?.items.map((item) => (
                <article key={item.id} className="rounded-lg border border-slate-200 p-4 text-sm">
                  <div className="flex items-start gap-3">
                    {item.images[0] && (
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        className="size-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold">
                        {item.lotNumber ? `Lô ${item.lotNumber} · ` : ''}
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500">Người gửi: {item.seller.fullName}</p>
                      <p className="mt-1">
                        Khởi điểm:{' '}
                        {Number(item.startingPrice ?? item.proposedStartingPrice).toLocaleString(
                          'vi-VN',
                        )}{' '}
                        ₫
                      </p>
                    </div>
                    <Badge
                      tone={
                        item.status === 'APPROVED'
                          ? 'green'
                          : item.status === 'REJECTED'
                            ? 'red'
                            : 'amber'
                      }
                    >
                      {itemStatuses[item.status] || item.status}
                    </Badge>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap break-words text-slate-600">
                    {item.description}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Button
                      variant="secondary"
                      disabled={saving}
                      onClick={() => setDetail({ id: item.id, view: 'shop' })}
                    >
                      Xem shop
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={saving}
                      onClick={() => setDetail({ id: item.id, view: 'item' })}
                    >
                      Chi tiết vật phẩm
                    </Button>
                    <span className="text-xs text-slate-500">
                      Uy tín seller: {item.seller.reputationScore ?? 'Chưa có dữ liệu'} · Yêu cầu:{' '}
                      {auction.minSellerReputation}
                    </span>
                    {item.seller.isShopSuspended && <Badge tone="red">Shop bị đình chỉ</Badge>}
                  </div>
                  {item.isSellerFlagged && (
                    <p className="mt-2 text-amber-700">Lưu ý: {item.flagReason}</p>
                  )}
                  {item.rejectionReason && (
                    <p className="mt-2 text-red-700">Lý do từ chối: {item.rejectionReason}</p>
                  )}
                  {item.status === 'PENDING_REVIEW' && (
                    <ReviewAuctionItemForm item={item} busy={saving || loading} onReview={review} />
                  )}
                </article>
              ))}
          </section>
          {canAdd && (
            <form
              onSubmit={(event) => void submit(event)}
              className="space-y-4 border-t border-slate-200 pt-5"
            >
              <h3 className="font-semibold">Thêm sản phẩm vào phiên</h3>
              <p className="text-xs text-slate-500">
                Sản phẩm được đăng ký dưới tài khoản hiện tại, cần đáp ứng điểm uy tín Seller của
                phiên và sẽ chờ duyệt. Ảnh sản phẩm và ảnh chứng thư kiểm định là bắt buộc.
              </p>
              <fieldset
                disabled={saving || loading || !!loadError}
                className="grid gap-4 sm:grid-cols-2 disabled:opacity-60"
              >
                <label className="text-xs font-medium sm:col-span-2">
                  Tên sản phẩm *<input name="title" required className={inputClass} />
                </label>
                <label className="text-xs font-medium sm:col-span-2">
                  Mô tả nguồn gốc, tình trạng *
                  <textarea name="description" required rows={3} className={inputClass} />
                </label>
                <label className="text-xs font-medium">
                  Giá khởi điểm (₫) *
                  <input
                    name="price"
                    type="number"
                    required
                    min="10000"
                    step="1"
                    className={inputClass}
                  />
                </label>
                <label className="text-xs font-medium">
                  Bước giá (₫) *
                  <input
                    name="increment"
                    type="number"
                    required
                    min="1000"
                    step="1"
                    defaultValue="100000"
                    className={inputClass}
                  />
                </label>
                <label className="text-xs font-medium">
                  Giá bảo lưu (₫)
                  <input name="reserve" type="number" min="10000" step="1" className={inputClass} />
                </label>
                <label className="text-xs font-medium">
                  Khóa mô hình 3D
                  <input name="model" className={inputClass} />
                </label>
                <label className="text-xs font-medium">
                  URL ảnh sản phẩm * (mỗi dòng một ảnh)
                  <textarea
                    name="images"
                    required
                    rows={3}
                    placeholder="https://…"
                    className={inputClass}
                  />
                </label>
                <label className="text-xs font-medium">
                  URL ảnh chứng thư * (mỗi dòng một ảnh)
                  <textarea
                    name="certificates"
                    required
                    rows={3}
                    placeholder="https://…"
                    className={inputClass}
                  />
                </label>
                <label className="text-xs font-medium">
                  Đơn vị thẩm định
                  <input name="agency" className={inputClass} />
                </label>
                <label className="text-xs font-medium">
                  Số chứng thư
                  <input name="certificateNumber" className={inputClass} />
                </label>
                <label className="text-xs font-medium">
                  Ngày cấp chứng thư
                  <input name="issueDate" type="date" className={inputClass} />
                </label>
              </fieldset>
              {error && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <Button type="submit" disabled={saving || loading || !!loadError}>
                  {saving ? 'Đang thêm…' : 'Thêm sản phẩm'}
                </Button>
              </div>
            </form>
          )}
          {data && !canAdd && (
            <p className="text-sm text-slate-500">Phiên hiện không nhận đăng ký sản phẩm.</p>
          )}
          <div className="flex justify-end">
            <Button variant="secondary" disabled={saving} onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      )}
    </Popup>
  );
}
