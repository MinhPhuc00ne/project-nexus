import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heart, Share2, CheckCircle2, AlertCircle } from 'lucide-react';
import { BidStatus } from '@nexus/types';
import type { AuctionViewerMode, AuctionTabKey, SimilarWatch } from '../../types';
import AuctionGallery from '../../components/auction/AuctionGallery';
import AuctionBidTerminal from '../../components/auction/AuctionBidTerminal';
import AuctionDetailTabs from '../../components/auction/AuctionDetailTabs';
import SimilarAuctionsSection from '../../components/auction/SimilarAuctionsSection';
import {
  getAuctionsApi,
  getAuctionDetailApi,
  placeBidApi,
  createAuctionSocket,
  checkBuyerEligibilityApi,
  type AuctionEntity,
  type BuyerEligibilityResponse,
  type AuctionBidItem,
} from '../../services/auction.service';
import { getStoredToken } from '../../services/auth';

export const AuctionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeAuction, setActiveAuction] = useState<AuctionEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [activeTab, setActiveTab] = useState<AuctionTabKey>('certs');
  const [viewerMode, setViewerMode] = useState<AuctionViewerMode>('photo');
  const [selectedThumb, setSelectedThumb] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likedSimilar, setLikedSimilar] = useState<Record<string, boolean>>({});

  const [currentPrice, setCurrentPrice] = useState(0);
  const [leadingBidder, setLeadingBidder] = useState('Chưa có lượt trả giá');
  const [bidSuccessToast, setBidSuccessToast] = useState<string | null>(null);
  const [bidErrorToast, setBidErrorToast] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<BuyerEligibilityResponse | null>(null);
  const [similarList, setSimilarList] = useState<SimilarWatch[]>([]);

  const [rotationAngle, setRotationAngle] = useState(0);

  useEffect(() => {
    let socketClient: ReturnType<typeof createAuctionSocket> | null = null;
    let isMounted = true;

    async function loadAuction() {
      setIsLoading(true);
      try {
        let auctionData: AuctionEntity | null = null;
        if (id) {
          auctionData = await getAuctionDetailApi(id);
        } else {
          // Lấy danh sách các phiên đấu giá thật từ API database
          const list = await getAuctionsApi({ limit: 10 });
          if (list?.items && list.items.length > 0) {
            // Ưu tiên chọn phiên đang ACTIVE/EXTENDED, sau đó đến SCHEDULED
            const target =
              list.items.find((a) => a.status === 'ACTIVE' || a.status === 'EXTENDED') ||
              list.items.find((a) => a.status === 'SCHEDULED') ||
              list.items[0];
            if (target) {
              auctionData = await getAuctionDetailApi(target.id);
            }
          }
        }

        if (!isMounted) return;

        if (auctionData) {
          setActiveAuction(auctionData);
          const price =
            Number(auctionData.currentHighestBid) || Number(auctionData.startingPrice) || 0;
          setCurrentPrice(price);
          if (auctionData.bids && auctionData.bids.length > 0) {
            setLeadingBidder(auctionData.bids[0].bidder?.fullName || 'Người tham gia ẩn danh');
          } else {
            setLeadingBidder('Chưa có lượt trả giá');
          }
          const remaining = Math.max(
            0,
            Math.floor((new Date(auctionData.endTime).getTime() - Date.now()) / 1000),
          );
          setTimeLeft(remaining);

          // Kiểm tra điều kiện tham gia đấu giá nếu đã đăng nhập
          if (getStoredToken()) {
            checkBuyerEligibilityApi(auctionData.id)
              .then((elig) => {
                if (isMounted) setEligibility(elig);
              })
              .catch(() => {});
          }

          socketClient = createAuctionSocket(auctionData.id);
          socketClient.onBidPlaced((payload) => {
            if (!isMounted) return;
            setCurrentPrice(payload.bidAmount);
            setLeadingBidder(payload.bidderName);
            setActiveAuction((prev) => {
              if (!prev) return null;
              const newBid: AuctionBidItem = {
                id: payload.bidId,
                bidAmount: payload.bidAmount,
                status: BidStatus.ACCEPTED,
                placedAt: new Date().toISOString(),
                bidder: {
                  id: payload.bidderId,
                  fullName: payload.bidderName,
                },
              };
              return {
                ...prev,
                currentHighestBid: payload.bidAmount,
                currentHighestBidderId: payload.bidderId,
                totalBidsCount: (prev.totalBidsCount || 0) + 1,
                bids: [newBid, ...(prev.bids || [])],
              };
            });
          });

          socketClient.onTimeExtended((payload) => {
            if (!isMounted) return;
            setTimeLeft((prev) => prev + payload.extendedBySeconds);
            setBidSuccessToast(
              `Phiên đấu giá được tự động gia hạn thêm ${payload.extendedBySeconds}s (Anti-Sniping)!`,
            );
            setTimeout(() => setBidSuccessToast(null), 4000);
          });
        } else {
          setActiveAuction(null);
        }

        // Tải danh sách các phiên tương tự thật từ API database
        const res = await getAuctionsApi({ limit: 8 });
        if (isMounted && res?.items && res.items.length > 0) {
          const otherAuctions = res.items.filter((a) => a.id !== auctionData?.id);
          if (otherAuctions.length > 0) {
            const mapped: SimilarWatch[] = otherAuctions.map((a) => {
              const isLive = a.status === 'ACTIVE' || a.status === 'EXTENDED';
              const img = a.product?.images?.[0]?.imageUrl || '/images/watches/watch5_clean.png';
              const currentBid = Number(a.currentHighestBid) || Number(a.startingPrice) || 0;
              return {
                id: a.id,
                badge: {
                  text: isLive
                    ? 'LIVE BID'
                    : a.status === 'SCHEDULED'
                      ? 'SẮP DIỄN RA'
                      : 'ĐÃ KẾT THÚC',
                  type: isLive ? 'live' : a.status === 'SCHEDULED' ? 'upcoming' : 'buy-now',
                },
                brand: a.product?.category?.name || 'NEXUS AUCTION',
                title: a.title,
                image: img,
                priceLabel: isLive ? 'Giá hiện tại:' : 'Khởi điểm:',
                price: `${currentBid.toLocaleString('vi-VN')} đ`,
                usdPrice: `(≈ $${Math.round(currentBid / 24000).toLocaleString('en-US')} USD)`,
                statusLabel: isLive ? 'Trạng thái:' : 'Thời gian:',
                statusVal: isLive
                  ? 'Đang diễn ra'
                  : a.status === 'SCHEDULED'
                    ? 'Sắp mở'
                    : 'Đã kết thúc',
                statusType: isLive ? 'blue' : 'green',
              };
            });
            setSimilarList(mapped);
          } else {
            setSimilarList([]);
          }
        } else if (isMounted) {
          setSimilarList([]);
        }
      } catch (err: unknown) {
        console.error('Không thể tải phiên đấu giá từ database:', err);
        if (isMounted) setActiveAuction(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadAuction();

    return () => {
      isMounted = false;
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
    if (!activeAuction?.id) return;

    try {
      const res = await placeBidApi(activeAuction.id, { bidAmount: amount });
      setCurrentPrice(res.currentHighestBid);
      setLeadingBidder('Bạn (Tài khoản hiện tại)');

      // Cập nhật lượt đặt giá mới vào danh sách
      const myNewBid: AuctionBidItem = {
        id: res.bidId,
        bidAmount: res.bidAmount,
        status: BidStatus.ACCEPTED,
        placedAt: new Date().toISOString(),
        bidder: {
          id: 'current-user',
          fullName: 'Bạn (Tài khoản hiện tại)',
        },
      };

      setActiveAuction((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentHighestBid: res.currentHighestBid,
          currentHighestBidderId: 'current-user',
          totalBidsCount: (prev.totalBidsCount || 0) + 1,
          bids: [myNewBid, ...(prev.bids || [])],
        };
      });

      setBidSuccessToast(
        `Đặt giá thành công: ${formatVND(amount)}! Số dư ví NEXUS Pay đã được khóa cọc 10% an toàn.`,
      );
      setTimeout(() => setBidSuccessToast(null), 4500);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Đặt giá không thành công. Vui lòng kiểm tra số dư ví NEXUS Pay hoặc thử lại.';
      setBidErrorToast(message);
      setTimeout(() => setBidErrorToast(null), 5000);
    }
  };

  const handleToggleSimilarLike = (targetId: string) => {
    setLikedSimilar((prev) => ({ ...prev, [targetId]: !prev[targetId] }));
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] bg-slate-50 flex flex-col items-center justify-center p-8 gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-rose-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">
          Đang kết nối phòng đấu giá trực tiếp từ cơ sở dữ liệu NEXUS...
        </p>
      </div>
    );
  }

  if (!activeAuction) {
    return (
      <div className="min-h-[70vh] bg-slate-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            🔨
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Hiện chưa có phiên đấu giá nào được mở
          </h2>
          <p className="text-xs text-slate-500 mt-2 mb-6 leading-relaxed">
            Các phiên đấu giá 3D thẩm định trực tiếp sẽ được mở theo lịch trình kiểm định thực tế
            của sàn.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-blue-700 transition"
          >
            Quay Về Trang Chủ
          </Link>
        </div>
      </div>
    );
  }

  const itemImages = activeAuction.items?.[0]?.images || [];
  const productImages = activeAuction.product?.images || [];
  const dynamicThumbnails =
    productImages.length > 0
      ? productImages.map((img, i) => ({
          label: img.isThumbnail ? 'Ảnh đại diện' : `Góc máy ${i + 1}`,
          src: img.imageUrl,
        }))
      : itemImages.length > 0
        ? itemImages.map((url, i) => ({
            label: i === 0 ? 'Hiện vật giám định' : `Góc máy ${i + 1}`,
            src: url,
          }))
        : [
            {
              label: activeAuction.title,
              src: '/images/watches/watch5_clean.png',
            },
          ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
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

      <main className="max-w-7xl mx-auto px-4 py-5 pb-14">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between mb-5 text-[13px] text-slate-500">
          <nav className="flex items-center gap-2 flex-wrap" aria-label="Breadcrumb">
            <Link to="/" className="text-slate-500 hover:text-rose-500 transition">
              Trang Chủ
            </Link>
            <span className="text-slate-300">/</span>
            <Link to="/auction" className="text-slate-500 hover:text-rose-500 transition">
              Sàn Đấu Giá Live 3D
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold truncate max-w-xs sm:max-w-md">
              {activeAuction.title}
            </span>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer transition hover:border-slate-300 ${
                isLiked ? 'text-red-500 border-red-200 bg-red-50' : ''
              }`}
              onClick={() => setIsLiked(!isLiked)}
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500' : ''}`} />
              <span>{isLiked ? 'Đã Lưu' : 'Yêu Thích'}</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer transition hover:border-slate-300"
              onClick={() => {
                void navigator.clipboard?.writeText(window.location.href);
                alert('Đã sao chép liên kết phòng đấu giá!');
              }}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Chia Sẻ</span>
            </button>
          </div>
        </div>

        {/* TOP SECTION: 2 COLUMNS (GALLERY & TERMINAL) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-8 mb-10">
          {/* LEFT: GALLERY & 3D VIEWER */}
          <AuctionGallery
            auction={activeAuction}
            viewerMode={viewerMode}
            setViewerMode={setViewerMode}
            selectedThumb={selectedThumb}
            setSelectedThumb={setSelectedThumb}
            rotationAngle={rotationAngle}
            setRotationAngle={setRotationAngle}
            thumbnails={dynamicThumbnails}
          />

          {/* RIGHT: BID TERMINAL */}
          <AuctionBidTerminal
            auction={activeAuction}
            timeLeft={timeLeft}
            currentPrice={currentPrice}
            leadingBidder={leadingBidder}
            onBidSuccess={handleBidSuccess}
            isEligible={eligibility?.isEligible ?? true}
            eligibilityReason={eligibility?.reason}
            isFlaggedViewOnly={eligibility?.isFlaggedViewOnly ?? false}
            totalBidsCount={activeAuction.bids?.length ?? activeAuction.totalBidsCount ?? 0}
          />
        </div>

        {/* TABS SECTION */}
        <AuctionDetailTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          auction={activeAuction}
        />

        {/* SIMILAR AUCTIONS SECTION */}
        <SimilarAuctionsSection
          watches={similarList}
          likedSimilar={likedSimilar}
          onToggleLike={handleToggleSimilarLike}
        />
      </main>
    </div>
  );
};

export default AuctionPage;
