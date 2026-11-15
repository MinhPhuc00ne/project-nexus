import { useId, useState } from 'react';
import { ArrowRight, Ellipsis, Gavel, Timer, Trophy } from 'lucide-react';
import { resolveAuctionImageUrl, type AdminAuctionLot } from '../../../services/auction.service';
import { Badge, Button } from '../shared/AdminUI';
import { statuses } from './auctionStatuses';
import AuctionLotBidders from './AuctionLotBidders';
import Popup from '../../Popup';
import AuctionLotNote from './AuctionLotNote';
import { awardLabels, type AuctionAwardState } from '../../../types/admin-auction-operations.types';

type Props = {
  lot: AdminAuctionLot;
  now: number;
  confirming: boolean;
  busy: boolean;
  refreshing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onEnd: () => void;
  onRefresh: () => void;
  onViewAwards: () => void;
};

const money = (value: number | string | null | undefined) =>
  value === null || value === undefined ? '—' : `${Number(value).toLocaleString('vi-VN')} ₫`;
const date = (value: string) => new Date(value).toLocaleString('vi-VN');

export default function AuctionLotCard({
  lot,
  now,
  confirming,
  busy,
  refreshing,
  onConfirm,
  onCancel,
  onEnd,
  onRefresh,
  onViewAwards,
}: Props) {
  const [showBids, setShowBids] = useState(false);
  const bidsPanelId = useId();
  const live = lot.lotStatus === 'ACTIVE' || lot.lotStatus === 'EXTENDED';
  const remaining = Math.max(0, Math.ceil((new Date(lot.endTime).getTime() - now) / 1000));
  const countdown =
    remaining > 0
      ? `${Math.floor(remaining / 3600)
          .toString()
          .padStart(2, '0')}:${Math.floor((remaining % 3600) / 60)
          .toString()
          .padStart(2, '0')}:${(remaining % 60).toString().padStart(2, '0')}`
      : 'Chờ máy chủ chốt kết quả';
  const leader = lot.bids.find((bid) => bid.bidder.id === lot.currentHighestBidderId)?.bidder;
  const award = lot.activeAward;
  const imageUrl = resolveAuctionImageUrl(lot.images?.[0]);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-start gap-4 border-b border-slate-100 p-5">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={lot.title}
            className="size-20 rounded-xl bg-slate-50 object-cover"
          />
        ) : (
          <div className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary">
            <Gavel size={28} aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {lot.lotNumber === null || lot.lotNumber === undefined
              ? 'Chưa gán số lô'
              : `Lô ${lot.lotNumber}`}
          </p>
          <h2 className="mt-1 break-words text-base font-bold text-slate-900">{lot.title}</h2>
          <p className="mt-1 text-xs text-slate-500">Seller: {lot.seller?.fullName ?? '—'}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={live ? 'green' : lot.lotStatus === 'FAILED' ? 'red' : 'gray'}>
              {statuses.find(([status]) => status === lot.lotStatus)?.[1] ?? lot.lotStatus}
            </Badge>
            {lot.isExtended && <Badge tone="amber">Đã gia hạn</Badge>}
          </div>
        </div>
      </div>
      <div className="space-y-5 p-5">
        <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4">
          <div>
            <p className="text-xs text-slate-500">Giá cao nhất</p>
            <p className="mt-1 break-words text-lg font-bold text-primary">
              {lot.totalBidsCount > 0 ? money(lot.currentHighestBid) : 'Chưa có lượt đặt giá'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Lượt đặt giá</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-lg font-bold text-slate-900">{lot.totalBidsCount}</p>
              <button
                type="button"
                aria-label={`Xem lịch sử đặt giá: ${lot.title}`}
                title="Xem lịch sử đặt giá"
                aria-haspopup="dialog"
                aria-expanded={showBids}
                aria-controls={bidsPanelId}
                onClick={() => setShowBids(true)}
                className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-blue-100 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${showBids ? 'bg-blue-100 text-primary' : 'text-slate-500'}`}
              >
                <Ellipsis size={20} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        {showBids && (
          <Popup
            isOpen
            size="xl"
            title={`Lịch sử đặt giá · ${lot.lotNumber ? `Lô ${lot.lotNumber}` : lot.title}`}
            onClose={() => setShowBids(false)}
            footer={
              <Button variant="secondary" onClick={() => setShowBids(false)}>
                Đóng
              </Button>
            }
          >
            <p className="mb-4 text-sm font-semibold text-slate-800">
              {lot.title} · {lot.totalBidsCount} lượt đặt giá
            </p>
            <AuctionLotBidders
              id={bidsPanelId}
              bids={lot.bids}
              leadingBidderId={live ? lot.currentHighestBidderId : null}
            />
          </Popup>
        )}
        <dl className="grid gap-4 text-xs sm:grid-cols-2">
          {[
            ['Giá khởi điểm', money(lot.startingPrice)],
            ['Giá bảo lưu', money(lot.reservePrice)],
            ['Bước giá', money(lot.bidIncrement)],
            ['Giá đặt tiếp theo tối thiểu', money(lot.minimumNextBid)],
            [
              'Người dẫn đầu',
              leader?.fullName ?? (lot.currentHighestBidderId ? 'Đang có người dẫn đầu' : '—'),
            ],
            ['Bắt đầu', date(lot.startTime)],
            ['Kết thúc', date(lot.endTime)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-slate-500">{label}</dt>
              <dd className="mt-1 break-words font-medium text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
        {lot.hasReservePrice && (
          <p className={`text-xs ${lot.reserveMet ? 'text-emerald-700' : 'text-amber-700'}`}>
            {lot.reserveMet ? 'Đã đạt giá bảo lưu.' : 'Chưa đạt giá bảo lưu.'}
          </p>
        )}
        {live && (
          <p className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm font-semibold text-primary">
            <Timer size={17} aria-hidden="true" /> {countdown}
          </p>
        )}
        {award && (
          <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
            <p className="font-semibold">Quyền mua: {award.buyer?.fullName ?? '—'}</p>
            <p className="mt-1">Giá chốt: {money(award.offerAmount)}</p>
            <p className="mt-1">{awardLabels[award.status as AuctionAwardState] ?? award.status}</p>
          </div>
        )}
        {lot.lotStatus === 'FAILED' && (
          <p className="text-xs text-slate-500">Lô không có người thắng hợp lệ.</p>
        )}
        <Button variant="secondary" disabled={busy} onClick={onViewAwards}>
          <Trophy size={15} /> Xem quyền mua của lô <ArrowRight size={14} />
        </Button>
        <AuctionLotNote itemId={lot.id} note={lot.staffNote} onSaved={onRefresh} />
        {live &&
          (confirming ? (
            <section
              aria-label={`Xác nhận kết thúc ${lot.title}`}
              className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4"
            >
              <p className="text-sm font-semibold text-rose-900">Kết thúc lô này ngay?</p>
              <p className="text-xs leading-5 text-rose-800">
                Lô sẽ ngừng nhận giá và máy chủ chốt kết quả. Nếu có người thắng hợp lệ, hệ thống
                giữ 30% tiền cọc và hoàn 70% tiền giữ chỗ. Lô cuối kết thúc sẽ đóng phiên.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" disabled={busy || refreshing} onClick={onEnd}>
                  {busy ? 'Đang kết thúc…' : 'Xác nhận kết thúc lô'}
                </Button>
                <Button variant="secondary" disabled={busy} onClick={onCancel}>
                  Hủy
                </Button>
              </div>
            </section>
          ) : (
            <Button variant="danger" disabled={busy || refreshing} onClick={onConfirm}>
              Kết thúc lô
            </Button>
          ))}
      </div>
    </article>
  );
}
