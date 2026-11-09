import { useEffect, useState } from 'react';
import type { AdminAuctionItem } from '../../../services/auction.service';
import { getShopDetailApi, type ShopDetailResult } from '../../../services/products.service';
import { Badge, Button } from '../shared/AdminUI';

const money = (value: number | string | null | undefined) =>
  value === null || value === undefined ? 'Không có' : `${Number(value).toLocaleString('vi-VN')} ₫`;
const date = (value?: string | null) => (value ? new Date(value).toLocaleString('vi-VN') : '—');

function Gallery({ urls, title }: { urls: string[]; title: string }) {
  const images = urls.filter((url) => /^https?:\/\//i.test(url));
  return (
    <section className="space-y-3">
      <h4 className="font-semibold">{title}</h4>
      {images.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {images.map((url, index) => (
            <a
              key={`${url}:${index}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-200 bg-slate-50 p-2"
            >
              <img
                src={url}
                alt={`${title} ${index + 1}`}
                loading="lazy"
                className="h-64 w-full object-contain"
              />
              <span className="mt-2 block text-center text-xs text-blue-600">
                Mở ảnh {index + 1}
              </span>
            </a>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Chưa có ảnh.</p>
      )}
    </section>
  );
}

export default function AuctionItemDetails({
  item,
  view,
  minimumScore,
  onBack,
}: {
  item: AdminAuctionItem;
  view: 'item' | 'shop';
  minimumScore: number;
  onBack: () => void;
}) {
  const [shop, setShop] = useState<ShopDetailResult['shop'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (view !== 'shop') return;
    let active = true;
    setLoading(true);
    setError('');
    setShop(null);
    void getShopDetailApi(item.seller.id)
      .then((result) => {
        if (active) setShop(result.shop);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(cause instanceof Error ? cause.message : 'Không thể tải chi tiết shop.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [item.seller.id, view, revision]);

  const score = shop?.reputationScore ?? item.seller.reputationScore;
  return (
    <div className="space-y-5">
      <Button variant="secondary" onClick={onBack}>
        ← Quay lại danh sách duyệt
      </Button>
      <h3 className="text-lg font-semibold">
        {view === 'shop' ? 'Chi tiết shop / seller' : item.title}
      </h3>
      {view === 'shop' ? (
        <>
          {loading && (
            <p role="status" className="text-sm text-slate-500">
              Đang tải thông tin shop…
            </p>
          )}
          {error && (
            <div role="alert" className="space-y-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <p>{error}</p>
              <p>Thông tin seller trong hồ sơ ký gửi vẫn hiển thị bên dưới.</p>
              <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>
                Thử lại
              </Button>
            </div>
          )}
          <section className="space-y-4 rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              {(shop?.avatarUrl || item.seller.shopAvatarUrl) && (
                <img
                  src={shop?.avatarUrl || item.seller.shopAvatarUrl || ''}
                  alt="Ảnh shop"
                  className="size-16 rounded-lg object-cover"
                />
              )}
              <div>
                <p className="font-semibold">{shop?.name || item.seller.fullName}</p>
                <p className="text-sm text-slate-500">
                  Người bán: {shop?.sellerFullName || item.seller.fullName}
                </p>
              </div>
            </div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Điểm uy tín</dt>
                <dd className="mt-1 font-semibold">
                  {score ?? 'Chưa có dữ liệu'} / Yêu cầu phiên: {minimumScore}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Mức uy tín</dt>
                <dd>{shop?.trustLevel || item.seller.trustLevel || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Email tài khoản</dt>
                <dd className="break-all">{item.seller.platformEmail || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Trạng thái shop</dt>
                <dd>
                  {item.seller.isShopSuspended
                    ? 'Đang bị đình chỉ'
                    : shop
                      ? shop.isSellerActive
                        ? 'Đã kích hoạt bán hàng'
                        : 'Chưa kích hoạt bán hàng'
                      : 'Chưa có thông tin kích hoạt'}
                </dd>
              </div>
              {shop && (
                <>
                  <div>
                    <dt className="text-slate-500">Địa chỉ</dt>
                    <dd>
                      {shop.address?.formattedAddress ||
                        [shop.address?.district, shop.address?.city].filter(Boolean).join(', ') ||
                        'Chưa cập nhật'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Sản phẩm đang bán</dt>
                    <dd>{shop.stats.totalProducts}</dd>
                  </div>
                </>
              )}
            </dl>
            {score !== undefined && (
              <Badge tone={score >= minimumScore ? 'green' : 'red'}>
                {score >= minimumScore ? 'Đạt điểm uy tín yêu cầu' : 'Chưa đạt điểm uy tín yêu cầu'}
              </Badge>
            )}
            {item.seller.isShopSuspended && (
              <p className="text-sm text-red-700">Shop đang bị đình chỉ.</p>
            )}
            {item.isSellerFlagged && (
              <p className="text-sm text-amber-700">
                Cảnh báo hồ sơ: {item.flagReason || 'Seller được gắn cờ lưu ý.'}
              </p>
            )}
            {shop && (
              <div>
                <h4 className="font-semibold">Giới thiệu shop</h4>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">
                  {shop.description || 'Chưa có mô tả.'}
                </p>
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            Người gửi: {item.seller.fullName} · Số lô: {item.lotNumber ?? 'Chưa gán'} · Trạng thái:{' '}
            {
              { PENDING_REVIEW: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối' }[
                item.status
              ]
            }
          </p>
          <section>
            <h4 className="font-semibold">Mô tả, nguồn gốc & tình trạng</h4>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">
              {item.description}
            </p>
          </section>
          <Gallery urls={item.images} title="Ảnh vật phẩm" />
          <section className="rounded-lg bg-slate-50 p-4 text-sm">
            <h4 className="mb-3 font-semibold">Giá seller đề xuất</h4>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div>
                <dt>Giá khởi điểm</dt>
                <dd>{money(item.proposedStartingPrice)}</dd>
              </div>
              <div>
                <dt>Giá bảo lưu</dt>
                <dd>
                  {Number(item.proposedReservePrice) > 0
                    ? money(item.proposedReservePrice)
                    : 'Không có'}
                </dd>
              </div>
              <div>
                <dt>Bước giá</dt>
                <dd>{money(item.proposedBidIncrement)}</dd>
              </div>
            </dl>
            {item.status === 'APPROVED' && (
              <>
                <h4 className="mb-3 mt-4 font-semibold">Giá đã duyệt</h4>
                <dl className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <dt>Giá khởi điểm</dt>
                    <dd>{money(item.startingPrice)}</dd>
                  </div>
                  <div>
                    <dt>Giá bảo lưu</dt>
                    <dd>{Number(item.reservePrice) > 0 ? money(item.reservePrice) : 'Không có'}</dd>
                  </div>
                  <div>
                    <dt>Bước giá</dt>
                    <dd>{money(item.bidIncrement)}</dd>
                  </div>
                </dl>
              </>
            )}
          </section>
          <section className="space-y-3 text-sm">
            <h4 className="font-semibold">Hồ sơ kiểm định</h4>
            <p>Đơn vị cấp: {item.appraisalAgency || '—'}</p>
            <p>Số chứng thư: {item.appraisalCertificateNumber || '—'}</p>
            <p>Ngày cấp: {date(item.certificateIssueDate)}</p>
          </section>
          <Gallery urls={item.certificateImages} title="Ảnh chứng thư kiểm định" />
          <dl className="space-y-2 text-xs text-slate-500">
            <div>
              <dt>Ngày gửi</dt>
              <dd>{date(item.createdAt)}</dd>
            </div>
            <div>
              <dt>Người duyệt</dt>
              <dd>
                {item.reviewedByAdmin?.fullName || '—'} · {date(item.reviewedAt)}
              </dd>
            </div>
          </dl>
          {item.rejectionReason && (
            <p className="text-sm text-red-700">Lý do từ chối: {item.rejectionReason}</p>
          )}
        </>
      )}
      <Button variant="secondary" onClick={onBack}>
        ← Quay lại danh sách duyệt
      </Button>
    </div>
  );
}
