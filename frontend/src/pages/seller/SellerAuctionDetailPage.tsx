import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock3,
  Gavel,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  createAuctionSocket,
  getAuctionDetailApi,
  getAuctionIntroShowcaseApi,
  getSellerAuctionConsignmentsApi,
  type AuctionEntity,
  type AuctionIntroShowcaseResponse,
  type SellerAuctionConsignment,
} from '../../services/auction.service';
import {
  PageHeading,
  Panel,
  SellerButton,
  SellerLink,
  StatCard,
} from '../../components/seller/SellerUI';
import SellerAuctionLivePanel from '../../components/seller/SellerAuctionLivePanel';
import SellerAuctionItemsPanels from '../../components/seller/SellerAuctionItemsPanels';
import { canSubmitConsignment } from '../../components/seller/sellerConsignmentHelpers';

const money = (value?: number | string | null): string =>
  `${Number(value ?? 0).toLocaleString('vi-VN')} đ`;

/** Shows a Seller-facing read-only view of an auction and the seller's submitted lots. */
export default function SellerAuctionDetailPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const [auction, setAuction] = useState<AuctionEntity | null>(null);
  const [consignments, setConsignments] = useState<SellerAuctionConsignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveLotIndex, setLiveLotIndex] = useState(0);
  const [showcase, setShowcase] = useState<AuctionIntroShowcaseResponse | null>(null);

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
              items: (current.items ?? []).map((lot) =>
                lot.id === payload.auctionItemId
                  ? {
                      ...lot,
                      currentHighestBid: payload.bidAmount,
                      totalBidsCount: payload.totalBidsCount ?? (lot.totalBidsCount ?? 0) + 1,
                    }
                  : lot,
              ),
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
      if (payload.auctionId === auction.id) {
        void load();
        window.setTimeout(() => void load(), 250);
      }
    });
    socket.onTimerSync((payload) => {
      if (payload.auctionId !== auction.id) return;
      setAuction((current) => {
        if (!current) return current;
        const lots = current.items ?? [];
        const updatedLots = lots.map((lot) => {
          const timer = payload.lotTimers?.find((entry) => entry.auctionItemId === lot.id);
          return timer
            ? {
                ...lot,
                endTime: timer.endTime,
                lotStatus: timer.status,
                isExtended: timer.isExtended,
              }
            : lot;
        });
        return {
          ...current,
          endTime: payload.endTime,
          status: payload.status,
          isExtended: payload.isExtended,
          items: updatedLots,
          lots: updatedLots,
        };
      });
    });
    socket.onLotEnded((payload) => {
      if (payload.auctionId !== auction.id) return;
      void load();
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
            {canSubmitConsignment(auction) && (
              <SellerLink to={`/seller/auctions/new?auctionId=${encodeURIComponent(auction.id)}`}>
                <PackageCheck size={15} aria-hidden="true" />
                Thêm sản phẩm
              </SellerLink>
            )}
          </>
        }
      />

      <SellerAuctionLivePanel
        auction={auction}
        approvedItems={approvedItems}
        liveLotIndex={liveLotIndex}
        onLiveLotChange={setLiveLotIndex}
        showcase={showcase}
      />
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

      <SellerAuctionItemsPanels
        auctionId={auction.id}
        auctionStatus={auction.status}
        consignmentDeadline={auction.consignmentDeadline}
        isConsignmentLocked={auction.isConsignmentLocked}
        approvedItems={approvedItems}
        consignments={consignments}
        liveItems={auction.items}
      />

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Clock3 size={15} aria-hidden="true" />
        Dữ liệu được lấy từ API chi tiết phiên và danh sách ký gửi của Seller.
      </div>
    </div>
  );
}
