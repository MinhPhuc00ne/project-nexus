import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heart, Share2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { AuctionViewerMode, AuctionTabKey } from '../../types';
import AuctionGallery from '../../components/auction/AuctionGallery';
import AuctionBidTerminal from '../../components/auction/AuctionBidTerminal';
import AuctionDetailTabs from '../../components/auction/AuctionDetailTabs';
import SimilarAuctionsSection from '../../components/auction/SimilarAuctionsSection';
import { thumbnails, similarWatches } from '../../components/auction/mockData';
import {
  getAuctionsApi,
  getAuctionDetailApi,
  placeBidApi,
  createAuctionSocket,
  type AuctionEntity,
} from '../../services/auction.service';

export const AuctionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeAuction, setActiveAuction] = useState<AuctionEntity | null>(null);
  const [timeLeft, setTimeLeft] = useState(942);
  const [activeTab, setActiveTab] = useState<AuctionTabKey>('certs');
  const [viewerMode, setViewerMode] = useState<AuctionViewerMode>('photo');
  const [selectedThumb, setSelectedThumb] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likedSimilar, setLikedSimilar] = useState<Record<string, boolean>>({});

  const [currentPrice, setCurrentPrice] = useState(128500000);
  const [leadingBidder, setLeadingBidder] = useState('Nguyen_Horology');
  const [bidSuccessToast, setBidSuccessToast] = useState<string | null>(null);
  const [bidErrorToast, setBidErrorToast] = useState<string | null>(null);

  const [rotationAngle, setRotationAngle] = useState(0);

  useEffect(() => {
    let socketClient: ReturnType<typeof createAuctionSocket> | null = null;

    async function loadAuction() {
      try {
        let auctionData: AuctionEntity | null = null;
        if (id) {
          auctionData = await getAuctionDetailApi(id);
        } else {
          const list = await getAuctionsApi({ limit: 1 });
          if (list.items && list.items.length > 0) {
            auctionData = await getAuctionDetailApi(list.items[0].id);
          }
        }

        if (auctionData) {
          setActiveAuction(auctionData);
          const price = Number(auctionData.currentHighestBid) || Number(auctionData.startingPrice);
          setCurrentPrice(price);
          if (auctionData.bids && auctionData.bids.length > 0) {
            setLeadingBidder(auctionData.bids[0].bidder.fullName);
          }
          const remaining = Math.max(
            0,
            Math.floor((new Date(auctionData.endTime).getTime() - Date.now()) / 1000),
          );
          setTimeLeft(remaining);

          socketClient = createAuctionSocket(auctionData.id);
          socketClient.onBidPlaced((payload) => {
            setCurrentPrice(payload.bidAmount);
            setLeadingBidder(payload.bidderName);
          });
          socketClient.onTimeExtended((payload) => {
            setTimeLeft((prev) => prev + payload.extendedBySeconds);
          });
        }
      } catch (err: unknown) {
        console.warn('Không thể kết nối phòng đấu giá trực tiếp, dùng chế độ mô phỏng:', err);
      }
    }

    void loadAuction();

    return () => {
      socketClient?.disconnect();
    };
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  };

  const handleBidSuccess = async (amount: number) => {
    if (activeAuction?.id) {
      try {
        const res = await placeBidApi(activeAuction.id, { bidAmount: amount });
        setCurrentPrice(res.currentHighestBid);
        setLeadingBidder('Bạn (Tài khoản hiện tại)');
        setBidSuccessToast(
          `Đặt giá thành công: ${formatVND(amount)}! Số dư ví NEXUS Pay đã được khóa cọc an toàn.`,
        );
        setTimeout(() => setBidSuccessToast(null), 4500);
        return;
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
              'Đặt giá không thành công. Vui lòng thử lại.';
        setBidErrorToast(message);
        setTimeout(() => setBidErrorToast(null), 5000);
        return;
      }
    }

    // Local simulation fallback if offline
    setCurrentPrice(amount);
    setLeadingBidder('Bạn (Tài khoản hiện tại)');
    setBidSuccessToast(`Đặt giá thành công: ${formatVND(amount)}! Escrow đã tạm giữ cọc.`);
    setTimeout(() => {
      setBidSuccessToast(null);
    }, 4500);
  };

  const handleToggleSimilarLike = (id: string) => {
    setLikedSimilar((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 [font-family:-apple-system,_BlinkMacSystemFont,_'Segoe_UI',_Roboto,_Helvetica,_Arial,_sans-serif]">
      {/* Toast notification */}
      {bidSuccessToast && (
        <div className="fixed top-20 right-6 z-[2500] flex items-center gap-3 bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-2xl animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span className="text-sm font-semibold">{bidSuccessToast}</span>
        </div>
      )}

      {bidErrorToast && (
        <div className="fixed top-20 right-6 z-[2500] flex items-center gap-3 bg-rose-600 text-white px-5 py-3.5 rounded-xl shadow-2xl animate-bounce">
          <AlertCircle className="w-5 h-5 text-white" />
          <span className="text-sm font-semibold">{bidErrorToast}</span>
        </div>
      )}

      <main className="max-w-7xl [margin:0_auto] [padding:1.25rem_1rem_3rem_1rem]">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between mb-5 text-[13px] text-slate-500">
          <nav className="flex items-center gap-2 flex-wrap" aria-label="Breadcrumb">
            <Link
              to="/"
              className="text-slate-500 no-underline [transition:color_0.15s_ease] hover:[color:#ee4d2d]"
            >
              Trang Chủ
            </Link>
            <span className="text-slate-300">/</span>
            <Link
              to="/search?floor=Sàn+Đấu+Giá+Live"
              className="text-slate-500 no-underline [transition:color_0.15s_ease] hover:[color:#ee4d2d]"
            >
              Sàn Đấu Giá Live 3D
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500 no-underline [transition:color_0.15s_ease] hover:[color:#ee4d2d]">
              Đồng Hồ Cơ Xa Xỉ
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold">
              {activeAuction?.title || 'Đang tải thông tin đấu giá...'}
            </span>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 [padding:0.4rem_0.75rem] rounded-lg [border:1px_solid_#e2e8f0] bg-white text-xs font-semibold text-slate-700 cursor-pointer [transition:all_0.15s_ease] hover:border-slate-300 [&.liked]:text-red-500 [&.liked]:border-red-200 [&.liked]:bg-red-50 ${isLiked ? 'liked' : ''}`}
              onClick={() => setIsLiked(!isLiked)}
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500' : ''}`} />
              <span>{isLiked ? 'Đã Lưu (1.4K)' : 'Yêu Thích'}</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 [padding:0.4rem_0.75rem] rounded-lg [border:1px_solid_#e2e8f0] bg-white text-xs font-semibold text-slate-700 cursor-pointer [transition:all_0.15s_ease] hover:border-slate-300"
              onClick={() => alert('Đã sao chép liên kết phiên đấu giá!')}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Chia Sẻ</span>
            </button>
          </div>
        </div>

        {/* TOP SECTION: 2 COLUMNS (GALLERY & TERMINAL) */}
        <div className="grid [grid-template-columns:1fr_1.15fr] gap-8 mb-10 max-[1024px]:[grid-template-columns:1fr]">
          {/* LEFT: GALLERY & 3D VIEWER */}
          <AuctionGallery
            viewerMode={viewerMode}
            setViewerMode={setViewerMode}
            selectedThumb={selectedThumb}
            setSelectedThumb={setSelectedThumb}
            rotationAngle={rotationAngle}
            setRotationAngle={setRotationAngle}
            thumbnails={thumbnails}
          />

          {/* RIGHT: BID TERMINAL & VALUE PROPOSITION */}
          <AuctionBidTerminal
            timeLeft={timeLeft}
            currentPrice={currentPrice}
            leadingBidder={leadingBidder}
            onBidSuccess={handleBidSuccess}
          />
        </div>

        {/* TABS SECTION */}
        <AuctionDetailTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* SIMILAR AUCTIONS SECTION */}
        <SimilarAuctionsSection
          watches={similarWatches}
          likedSimilar={likedSimilar}
          onToggleLike={handleToggleSimilarLike}
        />
      </main>
    </div>
  );
};

export default AuctionPage;
