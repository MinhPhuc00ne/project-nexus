import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heart, Share2, CheckCircle2, AlertCircle, Layers } from 'lucide-react';
import { BidStatus, AuctionStatus } from '@nexus/types';
import type { AuctionViewerMode, AuctionTabKey, SimilarWatch } from '../../types';
import AuctionGallery from '../../components/auction/AuctionGallery';
import AuctionBidTerminal from '../../components/auction/AuctionBidTerminal';
import AuctionDetailTabs from '../../components/auction/AuctionDetailTabs';
import SimilarAuctionsSection from '../../components/auction/SimilarAuctionsSection';
import { CinematicAuctionIntro } from '../../components/auction/CinematicAuctionIntro';
import { AuctionShowcaseHUD } from '../../components/auction/showcase/AuctionShowcaseHUD';
import {
  getAuctionsApi,
  getAuctionDetailApi,
  getAuctionIntroShowcaseApi,
  placeBidApi,
  createAuctionSocket,
  checkBuyerEligibilityApi,
  formatAuctionImage,
  type AuctionEntity,
  type AuctionConsignmentItem,
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
  const [selectedLotIndex, setSelectedLotIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likedSimilar, setLikedSimilar] = useState<Record<string, boolean>>({});
  const [showCinematicIntro, setShowCinematicIntro] = useState<boolean>(false);
  const [show3DShowcase, setShow3DShowcase] = useState<boolean>(false);
  const [playbackMode, setPlaybackMode] = useState<'live' | 'admin-replay'>('live');
  const [initialElapsedMs, setInitialElapsedMs] = useState<number>(0);
  const [videoPlaybackTime, setVideoPlaybackTime] = useState<number>(0);

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
          if (auctionData.videoUrl && auctionData.videoUrl.trim().length > 0) {
            setShowCinematicIntro(true);
          } else {
            setShowCinematicIntro(false);
          }
          const price =
            Number(auctionData.currentHighestBid) || Number(auctionData.startingPrice) || 0;
          setCurrentPrice(price);
          if (auctionData.bids && auctionData.bids.length > 0) {
            setLeadingBidder(auctionData.bids[0].bidder?.fullName || 'Người tham gia ẩn danh');
          } else {
            setLeadingBidder('Chưa có lượt trả giá');
          }
          const isLiveSession =
            auctionData.status === 'ACTIVE' || auctionData.status === 'EXTENDED';
          const isScheduled =
            !isLiveSession &&
            (auctionData.status === 'SCHEDULED' ||
              new Date(auctionData.startTime).getTime() > Date.now());
          const targetDateStr = isScheduled ? auctionData.startTime : auctionData.endTime;
          const remaining = Math.max(
            0,
            Math.floor((new Date(targetDateStr).getTime() - Date.now()) / 1000),
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

          // Kiểm tra nếu phiên này đang trong thời gian chiếu video 3D giới thiệu trực tiếp
          try {
            const showcase = await getAuctionIntroShowcaseApi(auctionData.id);
            if (isMounted && showcase?.isIntroActive) {
              setPlaybackMode('live');
              setInitialElapsedMs(showcase.elapsedMs || 0);
              setShow3DShowcase(true);
            }
          } catch {
            // Phiên không có showcase telemetry
          }

          socketClient = createAuctionSocket(auctionData.id);

          // LẮNG NGHE SỰ KIỆN ADMIN BẮT ĐẦU PHIÊN ĐẤU GIÁ VÀ PHÁT SÓNG VIDEO TRỰC TIẾP TỚI BUYER
          socketClient.onAuctionStarted((payload) => {
            if (!isMounted) return;
            if (payload.auctionId === auctionData.id) {
              setActiveAuction((prev) =>
                prev
                  ? {
                      ...prev,
                      status: AuctionStatus.ACTIVE,
                      items:
                        payload.items && payload.items.length > 0
                          ? (payload.items as unknown as AuctionConsignmentItem[])
                          : prev.items,
                    }
                  : prev,
              );
              setBidSuccessToast(
                `🔔 Phiên đấu giá "${payload.title}" đã bắt đầu! Đang phát sóng video giới thiệu trực tiếp...`,
              );
              if (auctionData.endTime) {
                const remaining = Math.max(
                  0,
                  Math.floor((new Date(auctionData.endTime).getTime() - Date.now()) / 1000),
                );
                setTimeLeft(remaining);
              }
              setTimeout(() => setBidSuccessToast(null), 5000);

              // Tự động chiếu video trực tiếp lên màn hình Buyer ngay lập tức mà không cần click!
              if (payload.items && payload.items.length > 0) {
                setPlaybackMode('live');
                setInitialElapsedMs(0);
                setShow3DShowcase(true);
              } else if (auctionData.videoUrl) {
                setShowCinematicIntro(true);
              }
            }
          });

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
              const aHasItems = Boolean(a.items && a.items.length > 0) || Boolean(a.product);
              // ƯU TIÊN 1: Banner chính thức do Admin tạo cho phiên (imageUrl)
              const img =
                (a.imageUrl && a.imageUrl.trim().length > 0
                  ? formatAuctionImage(a.imageUrl)
                  : null) ||
                (a.items?.[0]?.images?.[0] ? formatAuctionImage(a.items[0].images[0]) : null) ||
                (a.product?.images?.[0]?.imageUrl
                  ? formatAuctionImage(a.product.images[0].imageUrl)
                  : null) ||
                '';
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
                brand: a.product?.category?.name || 'PHIÊN ĐẤU GIÁ',
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
                hasItems: aHasItems,
                hasVideo: Boolean(a.videoUrl && a.videoUrl.trim().length > 0),
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

  const handleCloseShowcase = useCallback(() => {
    setShow3DShowcase(false);
    setPlaybackMode('admin-replay');
  }, []);

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
            Các phiên đấu giá thẩm định trực tiếp sẽ được mở theo lịch trình kiểm định thực tế của
            sàn.
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

  const currentLot = activeAuction.items?.[selectedLotIndex] || activeAuction.items?.[0];
  const lotImages = (currentLot?.images || [])
    .filter((u) => Boolean(u && typeof u === 'string' && u.trim().length > 0))
    .map((u) => formatAuctionImage(u));

  const productImages = (activeAuction.product?.images || [])
    .filter((img) => Boolean(img?.imageUrl && img.imageUrl.trim().length > 0))
    .map((img) => ({
      ...img,
      imageUrl: formatAuctionImage(img.imageUrl),
    }));

  let rawThumbnails: Array<{ label: string; src: string }> = [];

  if (lotImages.length > 0) {
    rawThumbnails = lotImages.map((url, i) => ({
      label:
        i === 0
          ? `Lô #${currentLot?.lotNumber ?? selectedLotIndex + 1} - Ảnh chính thực tế`
          : `Góc chụp thực tế ${i + 1}`,
      src: url,
    }));
  } else if (activeAuction.imageUrl && activeAuction.imageUrl.trim().length > 0) {
    // ƯU TIÊN 1: Khi Seller chưa đưa lô hàng lên, hiển thị chính xác Banner phiên do Admin tạo!
    rawThumbnails = [
      {
        label: 'Banner đại diện phiên đấu giá (Admin khởi tạo)',
        src: formatAuctionImage(activeAuction.imageUrl),
      },
    ];
  } else if (productImages.length > 0) {
    rawThumbnails = productImages.map((img, i) => ({
      label: img.isThumbnail ? 'Ảnh sản phẩm chính thức' : `Góc chụp thực tế ${i + 1}`,
      src: img.imageUrl,
    }));
  }

  // Không dùng ảnh giả lập, chỉ dùng ảnh thật từ dữ liệu
  const dynamicThumbnails = rawThumbnails;
  const hasLots = Boolean(activeAuction.items && activeAuction.items.length > 0);
  const hasItems = hasLots || Boolean(activeAuction.product);
  const hasBanner = Boolean(activeAuction.imageUrl && activeAuction.imageUrl.trim().length > 0);
  const hasVideo = Boolean(activeAuction.videoUrl && activeAuction.videoUrl.trim().length > 0);

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

      {/* MÀN HÌNH RẠP CHIẾU 3D SHOWCASE TRIỂN LÃM BẢO TÀNG */}
      {show3DShowcase && activeAuction && (
        <AuctionShowcaseHUD
          auctionTitle={activeAuction.title}
          auctionDescription={activeAuction.description ?? undefined}
          items={activeAuction.items ?? []}
          playbackMode={playbackMode}
          initialElapsedMs={initialElapsedMs}
          onComplete={handleCloseShowcase}
          onCancel={handleCloseShowcase}
        />
      )}

      {/* PHƯƠNG ÁN KẾT HỢP A & B: MÀN HÌNH RẠP CHIẾU CINEMATIC INTRO TỰ ĐỘNG MỞ KHI VÀO SÀN HOẶC KHI BẤM PHÓNG TO */}
      <CinematicAuctionIntro
        isOpen={showCinematicIntro}
        onClose={() => setShowCinematicIntro(false)}
        auction={activeAuction}
        currentLot={currentLot}
        selectedLotIndex={selectedLotIndex}
        onSelectLot={(idx) => {
          setSelectedLotIndex(idx);
          setSelectedThumb(0);
        }}
        initialTime={videoPlaybackTime}
        onTimeSync={(t) => setVideoPlaybackTime(t)}
      />

      <main className="max-w-7xl mx-auto px-4 py-5 pb-14">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between mb-5 text-[13px] text-slate-500">
          <nav className="flex items-center gap-2 flex-wrap" aria-label="Breadcrumb">
            <Link to="/" className="text-slate-500 hover:text-rose-500 transition">
              Trang Chủ
            </Link>
            <span className="text-slate-300">/</span>
            <Link to="/auction" className="text-slate-500 hover:text-rose-500 transition">
              Sàn Đấu Giá Trực Tuyến
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold truncate max-w-xs sm:max-w-md">
              {currentLot?.title || activeAuction.title}
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

        {/* MULTI-LOT SELECTION STRIP (Nhiều sản phẩm trong 1 phiên) */}
        {activeAuction.items && activeAuction.items.length > 1 && (
          <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Layers size={17} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 m-0">
                    Danh Sách Lô Hàng Trong Phiên Này ({activeAuction.items.length} sản phẩm)
                  </h3>
                  <p className="text-[11px] text-slate-500 m-0">
                    Bấm chọn từng lô hàng để xem hình ảnh thực tế, giấy kiểm định và thông tin chi
                    tiết
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                Đang xem: Lô #{currentLot?.lotNumber ?? selectedLotIndex + 1}
              </span>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-1">
              {activeAuction.items.map((lot, idx) => {
                const isSelected = selectedLotIndex === idx;
                const thumb = lot.images?.[0]
                  ? formatAuctionImage(lot.images[0])
                  : 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80';
                return (
                  <button
                    key={lot.id || idx}
                    type="button"
                    onClick={() => {
                      setSelectedLotIndex(idx);
                      setSelectedThumb(0);
                    }}
                    className={`flex items-center gap-3 p-2.5 px-3.5 rounded-xl border text-left cursor-pointer transition shrink-0 max-w-xs ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-600/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <img
                      src={thumb}
                      alt={lot.title}
                      className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-100"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          LÔ #{lot.lotNumber ?? idx + 1}
                        </span>
                        {lot.threeModelKey && (
                          <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-sky-100 text-sky-700">
                            3D
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-900 truncate mt-1 max-w-[150px]">
                        {lot.title}
                      </p>
                      <p className="text-[11px] font-extrabold text-blue-600 mt-0.5">
                        {lot.startingPrice
                          ? `${Number(lot.startingPrice).toLocaleString('vi-VN')} đ`
                          : 'Chờ định giá'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* THÔNG BÁO NẾU PHIÊN CHƯA CÓ SẢN PHẨM / LÔ HÀNG KÝ GỬI */}
        {(!activeAuction.items || activeAuction.items.length === 0) && !activeAuction.product && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-amber-900 flex items-center gap-3.5 shadow-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
            <div className="text-xs">
              <p className="font-bold text-amber-900 text-sm">
                Phiên đấu giá đang mở tiếp nhận sản phẩm (Chờ người bán ký gửi)
              </p>
              <p className="text-amber-700 mt-0.5">
                Admin đã khởi tạo phiên đấu giá. Ảnh hiển thị hiện tại là ảnh bìa đại diện của
                phiên. Người bán (Seller) có thể vào mục <b>Ký Gửi Đấu Giá</b> để đăng ký niêm yết
                sản phẩm thật lên phiên này.
              </p>
            </div>
          </div>
        )}

        {/* TOP SECTION: 2 COLUMNS (GALLERY & TERMINAL) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-8 mb-10">
          {/* LEFT: GALLERY & INTEGRATED VIDEO STAGE (PHƯƠNG ÁN B KẾT HỢP) */}
          <AuctionGallery
            auction={activeAuction}
            currentLot={currentLot}
            viewerMode={viewerMode}
            setViewerMode={setViewerMode}
            selectedThumb={selectedThumb}
            setSelectedThumb={setSelectedThumb}
            rotationAngle={rotationAngle}
            setRotationAngle={setRotationAngle}
            thumbnails={dynamicThumbnails}
            videoTime={videoPlaybackTime}
            onTimeUpdate={(t) => setVideoPlaybackTime(t)}
            onOpenCinematic={() => setShowCinematicIntro(true)}
            hasItems={hasItems}
            hasBanner={hasBanner}
            hasVideo={hasVideo}
          />

          {/* RIGHT: BID TERMINAL */}
          <AuctionBidTerminal
            auction={activeAuction}
            selectedItem={currentLot}
            timeLeft={timeLeft}
            currentPrice={currentPrice}
            leadingBidder={leadingBidder}
            onBidSuccess={handleBidSuccess}
            isEligible={eligibility?.isEligible ?? true}
            eligibilityReason={eligibility?.reason}
            isFlaggedViewOnly={eligibility?.isFlaggedViewOnly ?? false}
            totalBidsCount={activeAuction.bids?.length ?? activeAuction.totalBidsCount ?? 0}
            buyerReputationScore={eligibility?.currentScore}
            requiredReputationScore={
              eligibility?.requiredScore ?? activeAuction.minBuyerReputation ?? 40
            }
            hasItems={hasItems}
          />
        </div>

        {/* TABS SECTION */}
        <AuctionDetailTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          auction={activeAuction}
          selectedItem={currentLot}
          hasItems={hasItems}
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
