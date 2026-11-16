import { ImageOff, PackageCheck } from 'lucide-react';
import type {
  AuctionConsignmentItem,
  SellerAuctionConsignment,
} from '../../services/auction.service';
import { formatAuctionImage } from '../../services/auction.service';
import { canSubmitConsignment } from './sellerConsignmentHelpers';
import { Badge, EmptyState, Panel, SellerLink } from './SellerUI';

/**
 * Seller auction data displayed in the approved-lot and consignment panels.
 */
export interface SellerAuctionItemsPanelsProps {
  auctionId: string;
  auctionStatus: string;
  consignmentDeadline?: string | null;
  isConsignmentLocked?: boolean;
  approvedItems: AuctionConsignmentItem[];
  consignments: SellerAuctionConsignment[];
  liveItems?: AuctionConsignmentItem[];
}

const money = (value?: number | string | null): string =>
  `${Number(value ?? 0).toLocaleString('vi-VN')} đ`;

function statusTone(status: string): 'blue' | 'green' | 'amber' | 'gray' | 'red' {
  if (
    status === 'ACTIVE' ||
    status === 'EXTENDED' ||
    status === 'APPROVED' ||
    status === 'PAID' ||
    status === 'SETTLED'
  ) {
    return 'green';
  }
  if (
    status === 'SCHEDULED' ||
    status === 'PENDING_REVIEW' ||
    status === 'AWAITING_ACCEPTANCE' ||
    status === 'AWAITING_DEPOSIT' ||
    status === 'AWAITING_CHECKOUT'
  ) {
    return 'amber';
  }
  if (
    status === 'REJECTED' ||
    status === 'CANCELLED' ||
    status === 'FAILED' ||
    status === 'PAYMENT_DEFAULT' ||
    status === 'BUYER_WITHDRAWN' ||
    status === 'DECLINED' ||
    status === 'EXPIRED'
  ) {
    return 'red';
  }
  return 'gray';
}

function lotStatusLabel(status?: string): string {
  const labels: Record<string, string> = {
    SCHEDULED: 'Chờ mở phiên',
    ACTIVE: 'Đang đấu',
    EXTENDED: 'Đang gia hạn',
    ENDED: 'Đã kết thúc',
    SETTLED: 'Đã thanh toán',
    CANCELLED: 'Đã hủy',
    FAILED: 'Chưa bán được',
  };
  return status ? (labels[status] ?? status) : 'Chưa bắt đầu';
}

function awardStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    AWAITING_ACCEPTANCE: 'Chờ người kế tiếp phản hồi',
    AWAITING_DEPOSIT: 'Chờ người kế tiếp nạp đủ 30% cọc',
    AWAITING_CHECKOUT: 'Chờ thanh toán 70% còn lại + ship',
    PAID: 'Đã thanh toán đầy đủ',
    PAYMENT_DEFAULT: 'Quá hạn thanh toán (đã tịch thu 30% cọc)',
    BUYER_WITHDRAWN: 'Khách không tiếp tục mua',
    DECLINED: 'Người kế tiếp đã từ chối',
    EXPIRED: 'Đã hết hạn xử lý',
  };
  return labels[status] ?? status.replace(/_/g, ' ');
}

function formatDeadlineCountdown(expiresAt: string): string {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(diffMs)) return '';
  if (diffMs <= 0) return 'Đã quá hạn';
  const totalMinutes = Math.ceil(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `Còn ${hours}g ${minutes}p` : `Còn ${minutes} phút`;
}

/**
 * Renders approved lots and the seller's submitted consignment records.
 *
 * @param props - Auction eligibility state, approved items, and seller consignments.
 * @returns Approved lot and seller consignment panels.
 */
export default function SellerAuctionItemsPanels({
  auctionId,
  auctionStatus,
  consignmentDeadline,
  isConsignmentLocked,
  approvedItems,
  consignments,
  liveItems,
}: SellerAuctionItemsPanelsProps) {
  const displayItems = liveItems ?? approvedItems;
  const canSubmit = canSubmitConsignment({
    status: auctionStatus,
    consignmentDeadline,
    isConsignmentLocked,
  });
  return (
    <>
      <Panel
        title="Vật phẩm trong phiên"
        subtitle="Danh sách vật phẩm đã được Admin phê duyệt để hiển thị trong phiên đấu giá."
      >
        {displayItems.length === 0 ? (
          <EmptyState
            title="Chưa có vật phẩm được duyệt"
            description="Bạn có thể gửi sản phẩm để Admin thẩm định khi phiên còn nhận ký gửi."
            action={
              canSubmit && (
                <SellerLink to={`/seller/auctions/new?auctionId=${encodeURIComponent(auctionId)}`}>
                  <PackageCheck size={15} aria-hidden="true" />
                  Gửi sản phẩm vào phiên
                </SellerLink>
              )
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {displayItems.map((item) => (
              <article key={item.id} className="flex gap-3 rounded-lg border border-slate-200 p-3">
                <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-md bg-slate-50">
                  {item.images?.[0] ? (
                    <img
                      src={formatAuctionImage(item.images[0])}
                      alt={item.title}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ImageOff size={22} className="text-slate-300" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold text-slate-800">{item.title}</h3>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {item.isExtended && <Badge tone="amber">Gia hạn +2p</Badge>}
                      {item.lotNumber && <Badge tone="blue">Lô {item.lotNumber}</Badge>}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Khởi điểm: {money(item.startingPrice)} · Bước giá: {money(item.bidIncrement)}
                  </p>
                  {item.endTime && (
                    <p className="mt-1 text-xs text-slate-500">
                      Kết thúc lô: {new Date(item.endTime).toLocaleString('vi-VN')}
                    </p>
                  )}
                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    {item.lotStatus === 'ACTIVE' || item.lotStatus === 'EXTENDED'
                      ? `${lotStatusLabel(item.lotStatus)} · Giá hiện tại ${money(item.currentHighestBid || item.startingPrice)} · ${item.totalBidsCount ?? 0} lượt trả giá`
                      : item.lotStatus === 'ENDED' || item.lotStatus === 'SETTLED'
                        ? `${lotStatusLabel(item.lotStatus)} · Giá cuối ${money(item.currentHighestBid || item.startingPrice)}`
                        : `Trạng thái: ${lotStatusLabel(item.lotStatus)}`}
                  </p>
                  {item.staffNote && (
                    <p className="mt-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                      Ghi chú hỗ trợ: {item.staffNote}
                    </p>
                  )}
                  {item.activeAward && (
                    <div className="mt-2 space-y-1 rounded-md bg-amber-50 p-2.5 text-xs text-amber-900">
                      <p className="font-semibold">
                        {item.activeAward.tier === 'SECOND_CHANCE'
                          ? 'Người mua kế tiếp'
                          : 'Người thắng chính'}
                        : {item.activeAward.buyer?.fullName ?? 'Đang xử lý'}
                      </p>
                      <p>
                        Đã giữ 30% cọc: {money(item.activeAward.depositAmount)} · Còn lại 70%:{' '}
                        {money(
                          item.activeAward.remainingProductAmount ??
                            Math.max(
                              0,
                              Number(item.activeAward.offerAmount || 0) -
                                Number(item.activeAward.depositAmount || 0),
                            ),
                        )}
                      </p>
                      {item.activeAward.expiresAt && (
                        <p>
                          Hạn 24h: {new Date(item.activeAward.expiresAt).toLocaleString('vi-VN')} (
                          {formatDeadlineCountdown(item.activeAward.expiresAt)})
                        </p>
                      )}
                      <Badge tone={statusTone(item.activeAward.status)}>
                        {awardStatusLabel(item.activeAward.status)}
                      </Badge>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>
      <Panel
        title="Hồ sơ ký gửi của gian hàng"
        subtitle="Theo dõi trạng thái các sản phẩm bạn đã gửi vào riêng phiên này."
      >
        {consignments.length === 0 ? (
          <EmptyState
            title="Bạn chưa gửi sản phẩm vào phiên này"
            description="Tạo hồ sơ ký gửi để Admin kiểm định và phê duyệt trước khi lên sóng."
            action={
              canSubmit && (
                <SellerLink to={`/seller/auctions/new?auctionId=${encodeURIComponent(auctionId)}`}>
                  <PackageCheck size={15} aria-hidden="true" />
                  Thêm sản phẩm
                </SellerLink>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            {consignments.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Giá đề xuất: {money(item.proposedStartingPrice)} · Gửi lúc{' '}
                    {new Date(item.createdAt).toLocaleString('vi-VN')}
                  </p>
                  {item.rejectionReason && (
                    <p className="mt-1 text-xs text-red-600">
                      Lý do từ chối: {item.rejectionReason}
                    </p>
                  )}
                </div>
                <Badge tone={statusTone(item.status)}>{item.status.replace(/_/g, ' ')}</Badge>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
