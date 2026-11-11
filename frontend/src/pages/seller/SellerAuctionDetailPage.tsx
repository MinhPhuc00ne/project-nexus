import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Box,
  Clock3,
  Gavel,
  ImageOff,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  createAuctionSocket,
  formatAuctionImage,
  getAuctionDetailApi,
  getAuctionIntroShowcaseApi,
  getSellerAuctionConsignmentsApi,
  type AuctionConsignmentItem,
  type AuctionEntity,
  type AuctionIntroShowcaseResponse,
  type SellerAuctionConsignment,
} from '../../services/auction.service';
import {
  Badge,
  EmptyState,
  PageHeading,
  Panel,
  SellerButton,
  SellerLink,
  StatCard,
} from '../../components/seller/SellerUI';
import { AuctionShowcaseHUD } from '../../components/auction/showcase/AuctionShowcaseHUD';

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

function statusTone(status: string): 'blue' | 'green' | 'amber' | 'gray' | 'red' {
  if (status === 'ACTIVE' || status === 'EXTENDED' || status === 'APPROVED') return 'green';
  if (status === 'SCHEDULED' || status === 'PENDING_REVIEW') return 'amber';
  if (status === 'REJECTED' || status === 'CANCELLED' || status === 'FAILED') return 'red';
  return 'gray';
}

function itemImage(item: AuctionConsignmentItem): string {
  return formatAuctionImage(item.images?.[0]);
}

/** Shows a Seller-facing read-only view of an auction and the seller's submitted lots. */
export default function SellerAuctionDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const [auction, setAuction] = useState<AuctionEntity | null>(null);
  const [consignments, setConsignments] = useState<SellerAuctionConsignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveLotIndex, setLiveLotIndex] = useState(0);
  const [showcase, setShowcase] = useState<AuctionIntroShowcaseResponse | null>(null);
  const [showLiveShowcase, setShowLiveShowcase] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    if (!id) {
      setError('Không tìm thấy mã phiên đấu giá.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [auctionData, sellerItems, showcaseData] = await Promise.all([
        getAuctionDetailApi(id),
        getSellerAuctionConsignmentsApi(),
        getAuctionIntroShowcaseApi(id),
      ]);
      setAuction(auctionData);
      setConsignments(sellerItems.filter((item) => item.auctionId === id));
      setShowcase(showcaseData);
      setShowLiveShowcase(showcaseData.isIntroActive);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải phiên đấu giá.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // GET /auctions/:id only returns approved lots. The serialized live payload intentionally
  // omits the internal review status, so filtering by item.status here would remove every lot.
  const approvedItems = useMemo(() => auction?.items ?? [], [auction]);
  const isLive = auction?.status === 'ACTIVE' || auction?.status === 'EXTENDED';
  const activeLiveLot = approvedItems[liveLotIndex] ?? approvedItems[0];

  useEffect(() => {
    if (!auction?.id || !isLive) return undefined;

    const socket = createAuctionSocket(auction.id);
    socket.onBidPlaced((payload) => {
      if (payload.auctionId !== auction.id) return;
      setAuction((current) =>
        current
          ? {
              ...current,
              currentHighestBid: payload.bidAmount,
              totalBidsCount: current.totalBidsCount + 1,
            }
          : current,
      );
    });
    socket.onTimeExtended((payload) => {
      if (payload.auctionId !== auction.id) return;
      setAuction((current) =>
        current ? { ...current, endTime: payload.newEndTime, isExtended: true } : current,
      );
    });
    socket.onAuctionStarted((payload) => {
      if (payload.auctionId === auction.id) void load();
    });

    return () => socket.disconnect();
  }, [auction?.id, isLive, load]);

  useEffect(() => {
    if (liveLotIndex >= approvedItems.length) setLiveLotIndex(0);
  }, [approvedItems.length, liveLotIndex]);

  if (loading) {
    return (
      <Panel title="Đang tải phiên đấu giá">
        <p className="py-10 text-center text-sm text-slate-500">Đang lấy dữ liệu phiên đấu giá…</p>
      </Panel>
    );
  }

  if (error || !auction) {
    return (
      <Panel
        title="Không thể tải phiên đấu giá"
        subtitle={error || 'Phiên đấu giá không tồn tại.'}
        action={
          <SellerButton secondary onClick={() => void load()}>
            <RefreshCw size={15} aria-hidden="true" />
            Thử lại
          </SellerButton>
        }
      >
        <SellerLink secondary to="/seller/auctions">
          <ArrowLeft size={15} aria-hidden="true" />
          Quay lại danh sách
        </SellerLink>
      </Panel>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-5" data-seller="page-stack">
      <PageHeading
        title="Chi tiết phiên đấu giá"
        description="Theo dõi tình trạng phiên, vật phẩm được duyệt và hồ sơ ký gửi của gian hàng."
        actions={
          <>
            <SellerButton secondary onClick={() => void load()}>
              <RefreshCw size={15} aria-hidden="true" />
              Làm mới
            </SellerButton>
            <SellerLink secondary to="/seller/auctions">
              <ArrowLeft size={15} aria-hidden="true" />
              Danh sách phiên
            </SellerLink>
            {(auction.status === 'SCHEDULED' || isLive) && (
              <SellerLink to={`/seller/auctions/new?auctionId=${encodeURIComponent(auction.id)}`}>
                <PackageCheck size={15} aria-hidden="true" />
                Thêm sản phẩm
              </SellerLink>
            )}
          </>
        }
      />

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
                ) : activeLiveLot && itemImage(activeLiveLot) ? (
                  <img
                    src={itemImage(activeLiveLot)}
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
                        onClick={() => setLiveLotIndex(index)}
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Giá hiện tại"
          value={money(auction.currentHighestBid || auction.startingPrice)}
          detail="Giá cao nhất / giá khởi điểm"
          icon={<Gavel size={19} aria-hidden="true" />}
        />
        <StatCard
          label="Lượt trả giá"
          value={auction.totalBidsCount.toString()}
          detail="Được cập nhật từ phiên đấu giá"
          icon={<Users size={19} aria-hidden="true" />}
        />
        <StatCard
          label="Vật phẩm đã duyệt"
          value={approvedItems.length.toString()}
          detail="Có thể xuất hiện trong live showcase"
          icon={<ShieldCheck size={19} aria-hidden="true" />}
        />
        <StatCard
          label="Hồ sơ của gian hàng"
          value={consignments.length.toString()}
          detail="Đã gửi vào phiên này"
          icon={<PackageCheck size={19} aria-hidden="true" />}
        />
      </div>

      <Panel
        title="Vật phẩm trong phiên"
        subtitle="Danh sách vật phẩm đã được Admin phê duyệt để hiển thị trong phiên đấu giá."
      >
        {approvedItems.length === 0 ? (
          <EmptyState
            title="Chưa có vật phẩm được duyệt"
            description="Bạn có thể gửi sản phẩm để Admin thẩm định khi phiên còn nhận ký gửi."
            action={
              (auction.status === 'SCHEDULED' || isLive) && (
                <SellerLink to={`/seller/auctions/new?auctionId=${encodeURIComponent(auction.id)}`}>
                  <PackageCheck size={15} aria-hidden="true" />
                  Gửi sản phẩm vào phiên
                </SellerLink>
              )
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {approvedItems.map((item) => {
              const image = itemImage(item);
              return (
                <article
                  key={item.id}
                  className="flex gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-md bg-slate-50">
                    {image ? (
                      <img src={image} alt={item.title} className="h-full w-full object-contain" />
                    ) : (
                      <ImageOff size={22} className="text-slate-300" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold text-slate-800">
                        {item.title}
                      </h3>
                      {item.lotNumber && <Badge tone="blue">Lô {item.lotNumber}</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Khởi điểm: {money(item.startingPrice)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Bước giá: {money(item.bidIncrement)}
                    </p>
                  </div>
                </article>
              );
            })}
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
              (auction.status === 'SCHEDULED' || isLive) && (
                <SellerLink to={`/seller/auctions/new?auctionId=${encodeURIComponent(auction.id)}`}>
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

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Clock3 size={15} aria-hidden="true" />
        Dữ liệu được lấy từ API chi tiết phiên và danh sách ký gửi của Seller.
      </div>

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
    </div>
  );
}
