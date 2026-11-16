import { useEffect, useState, type ReactElement } from 'react';
import { Box } from 'lucide-react';
import type {
  AuctionConsignmentItem,
  AuctionEntity,
  AuctionIntroShowcaseResponse,
} from '../../services/auction.service';
import { formatAuctionImage } from '../../services/auction.service';
import { AuctionShowcaseHUD } from '../auction/showcase/AuctionShowcaseHUD';
import { Badge, Panel, SellerButton } from './SellerUI';

/**
 * Properties for the seller-facing auction overview and live showcase.
 */
export interface SellerAuctionLivePanelProps {
  auction: AuctionEntity;
  approvedItems: AuctionConsignmentItem[];
  liveLotIndex: number;
  onLiveLotChange: (index: number) => void;
  showcase: AuctionIntroShowcaseResponse | null;
}

const money = (value?: number | string | null): string =>
  `${Number(value ?? 0).toLocaleString('vi-VN')} đ`;

function auctionStatusLabel(status: AuctionEntity['status']): string {
  const labels: Record<AuctionEntity['status'], string> = {
    DRAFT: 'Bản nháp',
    SCHEDULED: 'Sắp diễn ra',
    ACTIVE: 'Đang diễn ra',
    EXTENDED: 'Được gia hạn',
    ENDED: 'Đã kết thúc',
    SETTLED: 'Đã quyết toán',
    CANCELLED: 'Đã hủy',
    FAILED: 'Thất bại',
  };
  return labels[status] ?? status;
}

function statusTone(status: AuctionEntity['status']): 'blue' | 'green' | 'amber' | 'gray' | 'red' {
  if (status === 'ACTIVE' || status === 'EXTENDED') return 'green';
  if (status === 'SCHEDULED') return 'amber';
  if (status === 'CANCELLED' || status === 'FAILED') return 'red';
  return 'gray';
}

/**
 * Renders auction overview, the live seller feed, and synchronized introduction controls.
 *
 * @param props - Current auction, approved lots, selected lot, and intro payload.
 * @returns Auction detail overview and live monitoring panels.
 */
export default function SellerAuctionLivePanel({
  auction,
  approvedItems,
  liveLotIndex,
  onLiveLotChange,
  showcase,
}: SellerAuctionLivePanelProps): ReactElement {
  const [showLiveShowcase, setShowLiveShowcase] = useState(false);
  const isLive = auction.status === 'ACTIVE' || auction.status === 'EXTENDED';
  const activeLiveLot = approvedItems[liveLotIndex] ?? approvedItems[0];

  useEffect(() => {
    if (showcase?.isIntroActive) setShowLiveShowcase(true);
  }, [showcase]);

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.6fr)]">
          <div className="grid min-h-52 place-items-center overflow-hidden rounded-lg bg-slate-50">
            {auction.imageUrl ? (
              <img
                src={formatAuctionImage(auction.imageUrl)}
                alt={auction.title}
                className="h-full max-h-72 w-full object-contain p-3"
              />
            ) : (
              <Box className="h-14 w-14 text-blue-300" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusTone(auction.status)}>{auctionStatusLabel(auction.status)}</Badge>
              {auction.isExtended && <Badge tone="amber">Đã gia hạn thời gian</Badge>}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{auction.title}</h2>
              {auction.description && (
                <p className="mt-2 text-sm leading-6 text-slate-600">{auction.description}</p>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Bắt đầu</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {new Date(auction.startTime).toLocaleString('vi-VN')}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Kết thúc</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {new Date(auction.endTime).toLocaleString('vi-VN')}
                </p>
              </div>
            </div>
            {isLive && <Badge tone="green">Dữ liệu trả giá đang cập nhật trực tiếp</Badge>}
          </div>
        </div>
      </section>
      {isLive && (
        <Panel
          title="Live showcase của phiên"
          subtitle="Giao diện theo dõi dành cho Seller. Không có chức năng đặt giá."
          action={<Badge tone="red">LIVE</Badge>}
        >
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-lg">
            <div className="flex items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 text-white">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500" />
                <strong className="truncate text-sm">Đang phát trực tiếp: {auction.title}</strong>
              </div>
              <span className="shrink-0 text-xs text-slate-300">
                {auction.totalBidsCount} lượt trả giá
              </span>
            </div>
            <div className="grid min-h-[330px] lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.9fr)]">
              <div className="grid min-h-[330px] place-items-center bg-[radial-gradient(circle_at_center,_#22345b,_#060d1f_70%)] p-5">
                {auction.videoUrl ? (
                  <video
                    key={auction.videoUrl}
                    src={formatAuctionImage(auction.videoUrl)}
                    controls
                    autoPlay
                    muted
                    playsInline
                    className="max-h-[430px] w-full rounded-lg bg-black object-contain"
                  />
                ) : activeLiveLot?.images?.[0] ? (
                  <img
                    src={formatAuctionImage(activeLiveLot.images[0])}
                    alt={activeLiveLot.title}
                    className="max-h-[390px] w-full object-contain"
                  />
                ) : (
                  <Box className="h-20 w-20 text-blue-300" aria-hidden="true" />
                )}
              </div>
              <aside className="space-y-4 bg-slate-900 p-5 text-white">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">
                    Giá cao nhất
                  </p>
                  <p className="mt-1 text-3xl font-bold text-amber-300">
                    {money(auction.currentHighestBid || auction.startingPrice)}
                  </p>
                  <p className="mt-2 text-xs text-slate-300">
                    Kết thúc: {new Date(auction.endTime).toLocaleString('vi-VN')}
                  </p>
                </div>
                <div className="border-t border-slate-700 pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Vật phẩm đang hiển thị
                  </p>
                  <p className="mt-1 text-base font-semibold">
                    {activeLiveLot?.title ?? 'Chờ vật phẩm được duyệt'}
                  </p>
                  {activeLiveLot && (
                    <p className="mt-1 text-xs text-slate-300">
                      Lô #{activeLiveLot.lotNumber ?? liveLotIndex + 1} · Khởi điểm{' '}
                      {money(activeLiveLot.startingPrice)}
                    </p>
                  )}
                </div>
                {approvedItems.length > 1 && (
                  <div className="flex flex-wrap gap-2 border-t border-slate-700 pt-4">
                    {approvedItems.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onLiveLotChange(index)}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${index === liveLotIndex ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                      >
                        Lô {item.lotNumber ?? index + 1}
                      </button>
                    ))}
                  </div>
                )}
                {showcase?.isIntroActive && (
                  <SellerButton className="w-full" onClick={() => setShowLiveShowcase(true)}>
                    Mở live showcase đồng bộ
                  </SellerButton>
                )}
              </aside>
            </div>
          </div>
        </Panel>
      )}
      {showLiveShowcase && showcase && (
        <AuctionShowcaseHUD
          auctionTitle={showcase.title}
          auctionDescription={showcase.description ?? undefined}
          items={showcase.items}
          playbackMode="live"
          initialElapsedMs={showcase.elapsedMs}
          onComplete={() => setShowLiveShowcase(false)}
          onCancel={() => setShowLiveShowcase(false)}
        />
      )}
    </>
  );
}
