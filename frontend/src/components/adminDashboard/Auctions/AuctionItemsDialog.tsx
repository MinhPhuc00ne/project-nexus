import { useEffect, useRef, useState } from 'react';
import {
  getAdminAuctionItemsApi,
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
