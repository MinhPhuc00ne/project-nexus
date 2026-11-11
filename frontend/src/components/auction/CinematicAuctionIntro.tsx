import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FastForward,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  Film,
  Gavel,
  Layers,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  formatAuctionImage,
  type AuctionEntity,
  type AuctionConsignmentItem,
} from '../../services/auction.service';

interface CinematicAuctionIntroProps {
  isOpen: boolean;
  onClose: () => void;
  auction?: AuctionEntity | null;
  currentLot?: AuctionConsignmentItem | null;
  selectedLotIndex?: number;
  onSelectLot?: (idx: number) => void;
  initialTime?: number;
  onTimeSync?: (currentTime: number) => void;
}

export const CinematicAuctionIntro: React.FC<CinematicAuctionIntroProps> = ({
  isOpen,
  onClose,
  auction,
  currentLot: _currentLot,
  selectedLotIndex = 0,
  onSelectLot,
  initialTime = 0,
  onTimeSync,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(initialTime);
  const [countdown, setCountdown] = useState<number>(15);

  // Video của toàn bộ phiên đấu giá do Admin thiết lập
  const rawVideoUrl = auction?.videoUrl ? formatAuctionImage(auction.videoUrl) : '';
  const [videoError, setVideoError] = useState<boolean>(false);

  const ytMatch = rawVideoUrl.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
  );
  const isYouTube = Boolean(ytMatch);
  const ytEmbedUrl = ytMatch
    ? `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&enablejsapi=1`
    : '';

  // Đồng bộ phát video khi mở modal
  useEffect(() => {
    if (isOpen) {
      setVideoError(false);
      setCountdown(15);
      setIsPlaying(true);
      if (videoRef.current) {
        if (initialTime > 0) {
          videoRef.current.currentTime = initialTime;
        }
        void videoRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }
    }
  }, [isOpen, initialTime]);

  const handleClose = useCallback(() => {
    if (videoRef.current && onTimeSync) {
      onTimeSync(videoRef.current.currentTime);
    }
    onClose();
  }, [onClose, onTimeSync]);

  // Phím tắt bàn phím: Esc để bỏ qua, Space để Pause, M để Mute
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
          void videoRef.current.play();
          setIsPlaying(true);
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      } else if (e.key === 'm' || e.key === 'M') {
        if (!videoRef.current) return;
        videoRef.current.muted = !videoRef.current.muted;
        setIsMuted(videoRef.current.muted);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Đếm ngược 15s tự động vào sàn
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      void videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 1;
    setCurrentTime(cur);
    setDuration(dur);
    setVideoProgress((cur / dur) * 100);
    if (onTimeSync) onTimeSync(cur);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const target = (Number(e.target.value) / 100) * duration;
    videoRef.current.currentTime = target;
    setVideoProgress(Number(e.target.value));
  };

  const formatVND = (num?: number | string | null) => {
    if (!num) return '0 đ';
    return Number(num).toLocaleString('vi-VN') + ' đ';
  };

  const sessionItems: AuctionConsignmentItem[] = auction?.items || [];
  const sessionTitle = auction?.title || 'Phiên Đấu Giá Trực Tiếp';
  const sessionCode = auction?.id ? `#${auction.id.slice(0, 8).toUpperCase()}` : '#LIVE';
  const isLive = auction?.status === 'ACTIVE' || auction?.status === 'EXTENDED';

  // Tính tỷ lệ đếm ngược cho vòng tròn SVG
  const countdownDashOffset = 44 - (44 * (15 - countdown)) / 15;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl p-2.5 sm:p-5 transition-all duration-500 animate-fadeIn select-none">
      {/* Ambient Spotlight Background */}
      <div className="absolute inset-0 bg-radial from-rose-600/15 via-blue-600/5 to-transparent pointer-events-none" />

      {/* Main Cinematic Frame Container */}
      <div className="relative w-full max-w-5xl max-h-[96vh] flex flex-col rounded-3xl border border-slate-700/80 bg-slate-900/95 shadow-[0_0_100px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* Top Header Bar: Thể hiện đây là Video của TOÀN BỘ PHIÊN ĐẤU GIÁ */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800/90 bg-slate-950/80 backdrop-blur-md z-30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-rose-600 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-rose-600/40 shrink-0">
              <Film className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/15 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                  Video Toàn Phiên Đấu Giá
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                  {sessionCode}
                </span>
                {isLive ? (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Đang Đấu Giá Trực Tiếp
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {auction?.status === 'SCHEDULED' ? 'Phiên Sắp Mở' : 'Phiên Đấu Giá'}
                  </span>
                )}
              </div>
              <h2 className="text-xs sm:text-sm font-extrabold text-white tracking-wide truncate max-w-xs sm:max-w-lg mt-0.5 m-0">
                {sessionTitle}
              </h2>
            </div>
          </div>

          {/* NÚT BỎ QUA VIDEO KÈM VÒNG TRÒN TIẾN TRÌNH */}
          <div className="flex items-center gap-3 shrink-0 ml-2">
            <span className="text-[11px] text-slate-400 hidden md:inline font-mono">
              Nhấn{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">
                Esc
              </kbd>{' '}
              để vào sàn
            </span>

            <button
              type="button"
              onClick={handleClose}
              className="group relative flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white text-xs sm:text-sm font-extrabold rounded-full shadow-lg shadow-orange-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-white/30"
              title="Bỏ qua video và vào phòng đấu giá ngay"
            >
              {/* Vòng tròn đếm ngược SVG */}
              <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 -rotate-90">
                  <circle
                    cx="10"
                    cy="10"
                    r="7"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="transparent"
                    className="opacity-25"
                  />
                  <circle
                    cx="10"
                    cy="10"
                    r="7"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="transparent"
                    strokeDasharray="44"
                    strokeDashoffset={countdownDashOffset}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <span className="absolute text-[9px] font-mono font-black">{countdown}</span>
              </div>
              <span>Bỏ qua video</span>
              <FastForward className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        {/* Video Stage Area: 16:9 với max-height chống tràn */}
        <div className="relative aspect-video w-full max-h-[54vh] bg-black flex items-center justify-center overflow-hidden">
          {!rawVideoUrl || videoError ? (
            <div className="flex flex-col items-center justify-center p-6 text-center max-w-md">
              {auction?.imageUrl ? (
                <div className="relative mb-3 w-44 h-24 rounded-xl overflow-hidden border border-slate-700 shadow-md">
                  <img
                    src={formatAuctionImage(auction.imageUrl)}
                    alt={sessionTitle}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Film className="w-8 h-8 text-rose-400" />
                  </div>
                </div>
              ) : (
                <Film className="w-14 h-14 text-slate-700 mb-3" />
              )}
              <h3 className="text-base font-bold text-white mb-1">
                {videoError
                  ? 'Không thể phát video giới thiệu'
                  : 'Phiên này chưa có video giới thiệu'}
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                {videoError
                  ? 'Định dạng video không được hỗ trợ hoặc đường dẫn video đang được bảo trì.'
                  : 'Admin chưa đăng tải video trailer cho phiên đấu giá này.'}
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg transition cursor-pointer flex items-center gap-2"
              >
                <Gavel className="w-4 h-4" />
                <span>Vào Phòng Đấu Giá Ngay</span>
              </button>
            </div>
          ) : isYouTube ? (
            <iframe
              src={ytEmbedUrl}
              title="Auction Session Video Showcase"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoRef}
              src={rawVideoUrl}
              autoPlay
              playsInline
              muted={isMuted}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={() => {
                if (videoRef.current) setDuration(videoRef.current.duration);
              }}
              onError={() => {
                setVideoError(true);
              }}
              onEnded={handleClose}
              className="w-full h-full object-contain cursor-pointer"
              onClick={togglePlay}
            />
          )}

          {/* Watermark Logo Overlay */}
          {Boolean(rawVideoUrl) && (
            <div className="absolute top-4 left-4 z-20 pointer-events-none flex items-center gap-2 bg-black/75 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-[10px] font-mono font-bold text-slate-200">
                NEXUS OFFICIAL SHOWCASE • TOÀN CẢNH PHIÊN
              </span>
            </div>
          )}

          {/* Unmute Prompt Pill nếu video đang tắt tiếng */}
          {Boolean(rawVideoUrl) && isMuted && !isYouTube && (
            <button
              type="button"
              onClick={toggleMute}
              className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-semibold backdrop-blur-md shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer animate-pulse"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Bấm để bật âm thanh 🔊</span>
            </button>
          )}

          {/* Video Controls Bar */}
          {Boolean(rawVideoUrl) && !isYouTube && (
            <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 pt-8">
              <div className="w-full mb-2 flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={videoProgress}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>

              <div className="flex items-center justify-between text-white text-xs">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="p-1 hover:bg-white/20 rounded-lg transition cursor-pointer"
                    title={isPlaying ? 'Tạm dừng (Space)' : 'Phát tiếp (Space)'}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 fill-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1 hover:bg-white/20 rounded-lg transition cursor-pointer"
                    title={isMuted ? 'Bật âm thanh (M)' : 'Tắt tiếng (M)'}
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>

                  <span className="text-[11px] font-mono text-slate-300">
                    {Math.floor(currentTime / 60)}:
                    {String(Math.floor(currentTime % 60)).padStart(2, '0')} /{' '}
                    {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = 0;
                        void videoRef.current.play();
                        setIsPlaying(true);
                      }
                    }}
                    className="p-1 hover:bg-white/20 rounded-lg transition cursor-pointer text-slate-300 hover:text-white"
                    title="Phát lại từ đầu"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current?.requestFullscreen) {
                        void videoRef.current.requestFullscreen();
                      }
                    }}
                    className="p-1 hover:bg-white/20 rounded-lg transition cursor-pointer text-slate-300 hover:text-white"
                    title="Xem toàn màn hình"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM SECTION: DANH MỤC CÁC HIỆN VẬT / SẢN PHẨM TRONG PHIÊN NÀY */}
        <div className="bg-slate-950 px-4 sm:px-6 py-3 border-t border-slate-800/90 flex flex-col gap-2.5">
          {/* Thanh tiêu đề danh mục */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Layers className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Danh Mục Hiện Vật Trong Phiên
              </span>
              <span className="text-[11px] font-bold text-sky-400 bg-sky-950/60 border border-sky-500/30 px-2 py-0.5 rounded-full shrink-0">
                {sessionItems.length > 0
                  ? `${sessionItems.length} sản phẩm`
                  : 'Đang tiếp nhận sản phẩm'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Gavel className="w-3.5 h-3.5" />
              <span>Vào Sàn Đặt Giá Ngay</span>
            </button>
          </div>

          {/* Dải danh sách các sản phẩm (Lots) xuất hiện trong phiên video */}
          {sessionItems.length > 0 ? (
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin scrollbar-thumb-slate-700">
              {sessionItems.map((lot, idx) => {
                const isSelected = selectedLotIndex === idx;
                const thumb = lot.images?.[0]
                  ? formatAuctionImage(lot.images[0])
                  : 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80';

                return (
                  <button
                    key={lot.id || idx}
                    type="button"
                    onClick={() => {
                      if (onSelectLot) onSelectLot(idx);
                    }}
                    className={`flex items-center gap-2.5 p-2 px-3 rounded-xl border text-left cursor-pointer transition shrink-0 max-w-[240px] sm:max-w-[280px] ${
                      isSelected
                        ? 'border-rose-500 bg-rose-950/40 ring-1 ring-rose-500/60 shadow-md'
                        : 'border-slate-800 bg-slate-900/80 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <img
                      src={thumb}
                      alt={lot.title}
                      className="w-10 h-10 rounded-lg object-cover bg-slate-800 shrink-0 border border-slate-700"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-mono font-black px-1.5 py-0.2 rounded ${
                            isSelected
                              ? 'bg-rose-500 text-white'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          LÔ #{lot.lotNumber ?? idx + 1}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-bold text-rose-400 flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> Đang chọn
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-bold text-white truncate mt-0.5 m-0 max-w-[170px]">
                        {lot.title}
                      </p>
                      <p className="text-[10px] font-extrabold text-rose-400 mt-0.5 m-0">
                        {lot.startingPrice
                          ? `Khởi điểm: ${formatVND(lot.startingPrice)}`
                          : 'Chờ định giá'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Thông báo khi Admin chỉ mới tạo phiên, người bán chưa niêm yết hiện vật */
            <div className="flex items-center gap-3 p-2.5 px-3.5 rounded-xl border border-amber-500/30 bg-amber-950/20 text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <div className="min-w-0 flex-1">
                <span className="font-bold text-amber-200">
                  Phiên đấu giá đang mở tiếp nhận hiện vật ký gửi:
                </span>{' '}
                <span className="text-amber-300/80">
                  Video này là thước phim giới thiệu tổng quan do Admin tạo cho phiên. Người bán
                  (Seller) có thể gửi yêu cầu ký gửi để niêm yết các sản phẩm thực tế vào phiên này.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CinematicAuctionIntro;
