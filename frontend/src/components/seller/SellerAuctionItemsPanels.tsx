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
  if (status === 'ACTIVE' || status === 'EXTENDED' || status === 'APPROVED') return 'green';
  if (status === 'SCHEDULED' || status === 'PENDING_REVIEW') return 'amber';
  if (status === 'REJECTED' || status === 'CANCELLED' || status === 'FAILED') return 'red';
  return 'gray';
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
                    {item.lotNumber && <Badge tone="blue">Lô {item.lotNumber}</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Khởi điểm: {money(item.startingPrice)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Bước giá: {money(item.bidIncrement)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    {item.lotStatus === 'ACTIVE' || item.lotStatus === 'EXTENDED'
                      ? `Đang đấu · Giá hiện tại ${money(item.currentHighestBid || item.startingPrice)} · ${item.totalBidsCount ?? 0} lượt trả giá`
                      : item.lotStatus === 'ENDED' || item.lotStatus === 'SETTLED'
                        ? `Đã kết thúc · Giá cuối ${money(item.currentHighestBid || item.startingPrice)}`
                        : `Trạng thái: ${item.lotStatus ?? 'Chưa bắt đầu'}`}
                  </p>
                  {item.activeAward && (
                    <div className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900">
                      <p className="font-semibold">
                        {item.activeAward.tier === 'SECOND_CHANCE'
                          ? 'Lượt mua kế tiếp'
                          : 'Người thắng'}
                        : {item.activeAward.buyer?.fullName ?? 'Đang xử lý'}
                      </p>
                      <p>
                        Cọc 30%: {money(item.activeAward.depositAmount)} · Hạn xử lý:{' '}
                        {new Date(item.activeAward.expiresAt).toLocaleString('vi-VN')}
                      </p>
                      <Badge tone="amber">{item.activeAward.status.replace(/_/g, ' ')}</Badge>
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
