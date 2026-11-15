import { Film, Gavel, LockKeyhole, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { resolveAuctionImageUrl, type AdminAuctionEntity } from '../../../services/auction.service';
import { Badge, Button } from '../shared/AdminUI';
import type { useAdminAuctions } from './useAdminAuctions';
import { statuses } from './auctionStatuses';
import { consignmentLockReason } from './consignmentAvailability';

type Props = Pick<
  ReturnType<typeof useAdminAuctions>,
  | 'setSelectedAuction'
  | 'startingId'
  | 'setLockingAuction'
  | 'locking'
  | 'setLockError'
  | 'openShowcaseForAuction'
  | 'handleStartAuction'
  | 'now'
> & { item: AdminAuctionEntity };

export default function AuctionRow({
  item,
  setSelectedAuction,
  startingId,
  setLockingAuction,
  locking,
  setLockError,
  openShowcaseForAuction,
  handleStartAuction,
  now,
}: Props) {
  const lockReason = consignmentLockReason(item, now);
  const deadlinePassed =
    !!item.consignmentDeadline && new Date(item.consignmentDeadline).getTime() <= now;
  const ended = new Date(item.endTime).getTime() <= now;
  return (
    <tr>
      <td className="max-w-72 p-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            aria-label={`Xem video 3D phiên ${item.title}`}
            title="Xem video 3D"
            onClick={() => void openShowcaseForAuction(item)}
            className="group relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-blue-50 text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {item.imageUrl ? (
              <img
                src={resolveAuctionImageUrl(item.imageUrl)}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <Gavel size={20} aria-hidden="true" />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-slate-900/60 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Film size={22} aria-hidden="true" />
            </span>
          </button>
          <div className="min-w-0">
            <p className="break-words font-semibold text-slate-900">{item.title}</p>
            <p className="mt-1 text-slate-500">
              Người tạo: {item.createdByAdmin?.fullName || item.seller?.fullName || '—'}
            </p>
          </div>
        </div>
        {item.product && (
          <div className="mt-3 space-y-1 rounded-lg bg-blue-50 p-3">
            <p className="font-medium text-slate-800">Sản phẩm: {item.product.title}</p>
            <p className="text-slate-500">Seller: {item.seller?.fullName || '—'}</p>
            <p className="text-primary">
              Khởi điểm: {Number(item.startingPrice).toLocaleString('vi-VN')} ₫
            </p>
          </div>
        )}
      </td>
      <td className="whitespace-nowrap p-4">{new Date(item.startTime).toLocaleString('vi-VN')}</td>
      <td className="whitespace-nowrap p-4">{new Date(item.endTime).toLocaleString('vi-VN')}</td>
      <td className="p-4">
        <p>Buyer: {item.minBuyerReputation}</p>
        <p className="mt-1">Seller: {item.minSellerReputation}</p>
      </td>
      <td className="p-4">{item.totalBidsCount}</td>
      <td className="w-px whitespace-nowrap p-4 align-middle [&>span]:w-max [&>span]:leading-none">
        <Badge tone={item.status === 'ACTIVE' || item.status === 'EXTENDED' ? 'green' : 'blue'}>
          {statuses.find(([value]) => value === item.status)?.[1] || item.status}
        </Badge>
      </td>
      <td className="p-4">
        <div className="flex flex-col items-start gap-2">
          <Button variant="secondary" onClick={() => setSelectedAuction(item)}>
            Xem sản phẩm ({item._count?.items ?? 0})
          </Button>
          <Link
            to={`/admin/auctions/${item.id}/lots`}
            className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg bg-primary px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-primary-dark"
          >
            <Gavel size={14} /> Điều hành lô
          </Link>
        </div>
      </td>
      <td className="p-4">
        <div className="flex w-32 flex-col items-stretch gap-2 [&>button]:whitespace-nowrap">
          <Button
            variant="secondary"
            disabled={!!lockReason || !!startingId || locking}
            title={lockReason || 'Khóa nhận ký gửi cho phiên'}
            className="disabled:bg-slate-200 disabled:text-slate-500 disabled:opacity-100"
            onClick={() => {
              if (consignmentLockReason(item, Date.now())) return;
              setLockError('');
              setLockingAuction(item);
            }}
          >
            <LockKeyhole size={14} />
            {item.isConsignmentLocked ? 'Đã chốt ký gửi' : 'Chốt ký gửi'}
          </Button>
          {['DRAFT', 'SCHEDULED'].includes(item.status) ? (
            <>
              <Button
                disabled={
                  !!startingId || locking || ended || (!item.isConsignmentLocked && !deadlinePassed)
                }
                title={
                  ended
                    ? 'Đã quá thời gian kết thúc phiên.'
                    : !item.isConsignmentLocked && !deadlinePassed
                      ? 'Chốt ký gửi trước khi bắt đầu phiên'
                      : undefined
                }
                onClick={() => void handleStartAuction(item)}
              >
                <Play size={14} />
                {startingId === item.id ? 'Đang mở…' : 'Bắt đầu'}
              </Button>
            </>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
