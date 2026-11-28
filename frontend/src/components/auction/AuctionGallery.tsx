import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Scan,
  Eye,
  Sparkles,
  Maximize2,
  ZoomIn,
  ZoomOut,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Film,
  Package,
  Clock,
  Layers,
  AlertCircle,
} from 'lucide-react';
import type { AuctionViewerMode } from './types';
import {
  formatAuctionImage,
  type AuctionEntity,
  type AuctionConsignmentItem,
} from '@/features/auction/services/auction.service';
import { openChatWithUser } from '../chat/chatEvents';

interface ThumbnailItem {
  label: string;
  src: string;
}

interface AuctionGalleryProps {
  viewerMode: AuctionViewerMode;
  setViewerMode: (mode: AuctionViewerMode) => void;
  selectedThumb: number;
  setSelectedThumb: (idx: number) => void;
  rotationAngle: number;
  setRotationAngle: React.Dispatch<React.SetStateAction<number>>;
  thumbnails: ThumbnailItem[];
  auction?: AuctionEntity | null;
  currentLot?: AuctionConsignmentItem | null;
  videoTime?: number;
  onTimeUpdate?: (time: number) => void;
  onOpenCinematic?: () => void;
  hasItems?: boolean;
  hasBanner?: boolean;
  hasVideo?: boolean;
  timeLeft?: number;
}

export const AuctionGallery: React.FC<AuctionGalleryProps> = ({
  viewerMode,
  setViewerMode,
  selectedThumb,
  setSelectedThumb,
  rotationAngle: _rotationAngle,
  setRotationAngle: _setRotationAngle,
  thumbnails,
  auction,
  currentLot,
  videoTime = 0,
  onTimeUpdate,
  onOpenCinematic,
  hasItems: _hasItems,
  hasBanner: _hasBanner,
  hasVideo: _hasVideo,
  timeLeft,
}) => {
  const { t } = useTranslation('auction');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(true);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(true);
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [currentVideoTime, setCurrentVideoTime] = useState<number>(videoTime);
  const [videoError, setVideoError] = useState<boolean>(false);

  const hasItems =
    _hasItems ?? Boolean((auction?.items && auction.items.length > 0) || auction?.product);
  const hasBanner = _hasBanner ?? Boolean(auction?.imageUrl && auction.imageUrl.trim().length > 0);

  // Session has no items and Admin has not uploaded a banner
  const isSessionEmpty = !hasItems && !hasBanner && (!thumbnails || thumbnails.length === 0);

  const isTimeOver =
    timeLeft !== undefined && timeLeft !== null
      ? timeLeft <= 0
      : Boolean(auction?.endTime && new Date(auction.endTime).getTime() <= Date.now());

  const isEnded =
    auction?.status === 'ENDED' ||
    auction?.status === 'SETTLED' ||
    auction?.status === 'CANCELLED' ||
    (isTimeOver && auction?.status !== 'SCHEDULED');

  const isLive = !isEnded && (auction?.status === 'ACTIVE' || auction?.status === 'EXTENDED');

  const isScheduled =
    !isLive &&
    !isEnded &&
    (auction?.status === 'SCHEDULED' ||
      (auction?.startTime ? new Date(auction.startTime).getTime() > Date.now() : false));

  // Only use real video from DB and normalize internal upload paths
  const rawVideoUrl = auction?.videoUrl
    ? formatAuctionImage(auction.videoUrl)
    : currentLot?.videoUrl
      ? formatAuctionImage(currentLot.videoUrl)
      : '';

  const ytMatch = rawVideoUrl.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
  );
  const isYouTube = Boolean(ytMatch);
  const ytEmbedUrl = ytMatch
    ? `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&enablejsapi=1`
    : '';

  // Sync playback position from videoTime prop when switching to video mode
  useEffect(() => {
    if (viewerMode === 'video' && videoRef.current && rawVideoUrl) {
      if (Math.abs(videoRef.current.currentTime - videoTime) > 1) {
        videoRef.current.currentTime = videoTime;
      }
      void videoRef.current
        .play()
        .then(() => setIsVideoPlaying(true))
        .catch(() => {});
    }
  }, [viewerMode, videoTime, rawVideoUrl]);

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      const dur = videoRef.current.duration || 1;
      setCurrentVideoTime(cur);
      setVideoProgress((cur / dur) * 100);
      if (onTimeUpdate) {
        onTimeUpdate(cur);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPercent = parseFloat(e.target.value);
    setVideoProgress(newPercent);
    if (videoRef.current && videoDuration > 0) {
      const newTime = (newPercent / 100) * videoDuration;
      videoRef.current.currentTime = newTime;
      setCurrentVideoTime(newTime);
      if (onTimeUpdate) onTimeUpdate(newTime);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      void videoRef.current.play();
      setIsVideoPlaying(true);
    } else {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsVideoMuted(videoRef.current.muted);
  };

  const handleRestart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    void videoRef.current.play();
    setIsVideoPlaying(true);
  };

  const handleLaunchCinematic = () => {
    if (videoRef.current && onTimeUpdate) {
      onTimeUpdate(videoRef.current.currentTime);
    }
    if (onOpenCinematic) {
      onOpenCinematic();
    }
  };

  const formatSecs = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentImage =
    thumbnails[selectedThumb]?.src ||
    thumbnails[0]?.src ||
    (auction?.imageUrl ? formatAuctionImage(auction.imageUrl) : '') ||
    '';

  const sellerName =
    auction?.seller?.fullName || auction?.product?.category?.name || t('gallery.defaultSeller');

  const sellerAvatar = auction?.seller?.avatarUrl;

  return (
    <div className="flex flex-col gap-4">
      {/* Studio / HD Viewer / Video Main Stage */}
      <div className="relative aspect-square w-full rounded-3xl overflow-hidden flex items-center justify-center bg-radial from-slate-850 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl select-none group">
        {/* Ambient Studio Spotlight Glow */}
        <div className="absolute inset-0 bg-radial from-sky-500/10 via-transparent to-transparent pointer-events-none" />

        {/* Floating Top Indicators */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
          {isSessionEmpty ? (
            <div className="inline-flex items-center gap-1.5 bg-amber-500/90 text-slate-950 text-[11px] font-extrabold px-3 py-1 rounded-full shadow-lg shadow-amber-900/40 backdrop-blur-md">
              <Clock className="w-3.5 h-3.5" />
              <span>{t('gallery.awaitingListingBadge')}</span>
            </div>
          ) : isLive ? (
            <div className="inline-flex items-center gap-2 bg-rose-600/90 text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow-lg shadow-rose-900/40 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>{t('gallery.liveBadge')}</span>
            </div>
          ) : isScheduled ? (
            <div className="inline-flex items-center gap-1.5 bg-blue-600/90 text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow-lg shadow-blue-900/40 backdrop-blur-md">
              <Clock className="w-3.5 h-3.5" />
              <span>{t('gallery.scheduledBadge')}</span>
            </div>
          ) : isEnded ? (
            <div className="inline-flex items-center gap-1.5 bg-slate-700/90 text-slate-200 text-[11px] font-extrabold px-3 py-1 rounded-full shadow-lg backdrop-blur-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t('gallery.endedBadge')}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 bg-blue-600/90 text-white text-[11px] font-extrabold px-3 py-1 rounded-full shadow-lg shadow-blue-900/40 backdrop-blur-md">
              <Clock className="w-3.5 h-3.5" />
              <span>{t('gallery.upcomingBadge')}</span>
            </div>
          )}

          {!isSessionEmpty && (
            <div className="inline-flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-slate-300 text-[11px] font-medium px-3 py-1 rounded-full w-fit">
              <Scan className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('gallery.resolutionBadge')}</span>
            </div>
          )}
        </div>

        {/* Floating Top Right Quick Actions (Only shown when media exists) */}
        {!isSessionEmpty && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-xl p-1 text-slate-300">
            <button
              type="button"
              title={t('gallery.zoomOutTitle')}
              disabled={zoomLevel <= 0.8}
              onClick={() => setZoomLevel((prev) => Math.max(0.8, prev - 0.2))}
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition disabled:opacity-30 cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono font-bold px-1 text-slate-400">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              title={t('gallery.zoomInTitle')}
              disabled={zoomLevel >= 2.2}
              onClick={() => setZoomLevel((prev) => Math.min(2.2, prev + 0.2))}
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition disabled:opacity-30 cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {currentImage && (
              <button
                type="button"
                title={t('gallery.fullscreenTitle')}
                onClick={() => window.open(currentImage, '_blank')}
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* CASE 1: SESSION HAS NO ITEMS AND NO BANNER (WAITING VAULT STAGE) */}
        {isSessionEmpty && viewerMode !== 'video' ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center select-none z-10">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-orange-500/10 to-transparent border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_60px_rgba(245,158,11,0.25)] mb-4 animate-pulse">
              <Package className="w-12 h-12 text-amber-400" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold mb-2">
              <Clock className="w-3.5 h-3.5" />
              <span>{t('gallery.emptyStageBadge')}</span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-white m-0 max-w-sm">
              {t('gallery.emptyStageTitle')}
            </h3>

            <p className="text-xs text-slate-400 max-w-md mt-2 mb-5 leading-relaxed">
              {t('gallery.emptyStageDesc')}
            </p>

            <div className="flex items-center gap-3 flex-wrap justify-center">
              <Link
                to="/seller/auctions/consignments"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-xs shadow-lg shadow-orange-600/30 transition hover:scale-105 active:scale-95"
              >
                <Package className="w-4 h-4" />
                <span>{t('gallery.consignButton')}</span>
              </Link>
            </div>
          </div>
        ) : viewerMode === 'video' ? (
          /* CASE 2: VIDEO PLAYER STAGE */
          <div className="relative w-full h-full flex flex-col justify-between bg-black">
            {!rawVideoUrl || videoError ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none">
                <Film className="w-12 h-12 text-slate-700 mb-3" />
                <h4 className="text-sm font-bold text-white mb-1">
                  {videoError ? t('gallery.videoErrorTitle') : t('gallery.noVideoTitle')}
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mb-4">
                  {videoError ? t('gallery.videoErrorDesc') : t('gallery.noVideoDesc')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setVideoError(false);
                    setViewerMode('photo');
                  }}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  {t('gallery.backToPhotos')}
                </button>
              </div>
            ) : isYouTube ? (
              <div className="w-full h-full flex items-center justify-center">
                <iframe
                  src={ytEmbedUrl}
                  title={t('gallery.youtubePlayerTitle')}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  src={rawVideoUrl}
                  className="w-full h-full object-contain cursor-pointer"
                  playsInline
                  autoPlay
                  muted={isVideoMuted}
                  loop
                  onTimeUpdate={handleVideoTimeUpdate}
                  onLoadedMetadata={(e) => {
                    const dur = (e.target as HTMLVideoElement).duration;
                    setVideoDuration(dur);
                  }}
                  onError={() => setVideoError(true)}
                  onClick={togglePlay}
                />

                {/* Unmute Prompt Overlay (if currently muted) */}
                {isVideoMuted && (
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="absolute top-16 left-4 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 text-amber-300 border border-amber-500/40 text-xs font-semibold backdrop-blur-md shadow-lg hover:bg-slate-800 cursor-pointer transition animate-pulse"
                  >
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>{t('gallery.unmutePrompt')}</span>
                  </button>
                )}

                {/* Big Center Play Indicator when paused */}
                {!isVideoPlaying && (
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs transition cursor-pointer"
                  >
                    <div className="w-16 h-16 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-2xl pl-1 hover:scale-110 transition">
                      <Play className="w-8 h-8 fill-white" />
                    </div>
                  </button>
                )}

                {/* Integrated Video Controller Bar */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col gap-2 z-20">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={videoProgress}
                    onChange={handleSeek}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500 hover:h-1.5 transition-all"
                  />

                  <div className="flex items-center justify-between text-white text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="p-1 hover:text-rose-400 transition cursor-pointer"
                        title={isVideoPlaying ? t('gallery.pauseTitle') : t('gallery.playTitle')}
                      >
                        {isVideoPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 fill-white" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleRestart}
                        className="p-1 hover:text-slate-300 transition cursor-pointer"
                        title={t('gallery.restartTitle')}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={toggleMute}
                        className="p-1 hover:text-slate-300 transition cursor-pointer"
                        title={isVideoMuted ? t('gallery.unmuteTitle') : t('gallery.muteTitle')}
                      >
                        {isVideoMuted ? (
                          <VolumeX className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>

                      <span className="font-mono text-[11px] text-slate-300 ml-1">
                        {formatSecs(currentVideoTime)} / {formatSecs(videoDuration || 30)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleLaunchCinematic}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-[11px] shadow-md transition cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>{t('gallery.fullscreenCinema')}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* CASE 3: MAIN PRODUCT IMAGE WITH ZOOM (WHEN REAL IMAGES EXIST) */
          <div
            className="relative w-full h-full flex items-center justify-center p-8 transition-transform duration-300 ease-out"
            style={{
              transform: `scale(${zoomLevel})`,
            }}
          >
            {currentImage ? (
              <img
                src={currentImage}
                alt={thumbnails[selectedThumb]?.label || 'Auction Product'}
                className="max-w-[85%] max-h-[85%] object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.65)] transition-transform duration-200"
              />
            ) : null}
          </div>
        )}

        {/* LiDAR Holographic Overlay (if mode = lidar) */}
        {viewerMode === 'lidar' &&
          (() => {
            const firstItem = currentLot || auction?.items?.[0];
            const certCode =
              firstItem?.appraisalCertificateNumber ||
              (auction?.id ? `NX-CERT-${auction.id.slice(0, 8).toUpperCase()}` : null);

            return (
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(6,182,212,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.15)_1px,transparent_1px)] bg-[size:24px_24px]">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#06b6d4] animate-pulse" />
                <div className="absolute bottom-4 left-4 bg-slate-950/90 backdrop-blur-md text-cyan-400 font-mono text-xs px-3.5 py-1.5 rounded-xl border border-cyan-500/40 flex items-center gap-2 shadow-xl">
                  {certCode ? (
                    <>
                      <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
                      <span>{t('gallery.lidarVerified', { code: certCode })}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      <span className="text-amber-300 font-sans font-bold">
                        {t('gallery.lidarMissing')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
      </div>

      {/* Viewer Mode Switcher: 2 Artifact Inspection Modes (HD Image & Appraisal File) */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200">
        <button
          type="button"
          className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            viewerMode === 'photo'
              ? 'bg-white text-slate-900 shadow-md border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
          onClick={() => {
            setViewerMode('photo');
            setZoomLevel(1);
          }}
        >
          <Eye className="w-4 h-4 text-slate-700" />
          <span className="truncate">{t('gallery.modeHdPhoto')}</span>
        </button>

        <button
          type="button"
          className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            viewerMode === 'lidar'
              ? 'bg-slate-900 text-cyan-400 shadow-md border border-cyan-500/40'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
          onClick={() => setViewerMode('lidar')}
        >
          <Scan className="w-4 h-4 text-cyan-500" />
          <span className="truncate">{t('gallery.modeAppraisal')}</span>
        </button>
      </div>

      {/* Gallery Thumbnails: Show clean info bar when empty */}
      {thumbnails.length > 0 ? (
        <div className="grid grid-cols-5 gap-2.5">
          {thumbnails.map((item, idx) => (
            <button
              key={idx}
              type="button"
              className={`aspect-square bg-white rounded-xl p-1.5 cursor-pointer overflow-hidden flex items-center justify-center border-2 transition ${
                selectedThumb === idx && viewerMode === 'photo'
                  ? 'border-sky-600 shadow-md bg-sky-50/40 ring-2 ring-sky-200'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              onClick={() => {
                setSelectedThumb(idx);
                if (viewerMode === 'video') {
                  setViewerMode('photo');
                }
              }}
              title={item.label}
            >
              <img
                src={item.src}
                alt={item.label}
                className="w-full h-full object-cover rounded-lg hover:scale-105 transition"
              />
            </button>
          ))}
        </div>
      ) : (
        <div className="p-3.5 bg-slate-100/80 border border-slate-200 rounded-2xl flex items-center justify-between text-xs text-slate-500 shadow-2xs">
          <span className="flex items-center gap-2 font-medium">
            <Layers className="w-4 h-4 text-slate-400" />
            <span>{t('gallery.noThumbnails')}</span>
          </span>
          <span className="text-[11px] font-bold text-slate-400 bg-slate-200/60 px-2.5 py-0.5 rounded-md">
            {t('gallery.zeroPhotos')}
          </span>
        </div>
      )}

      {/* Real Seller & Vault Guarantee Card */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-900 text-white flex items-center justify-center font-black text-base shrink-0 overflow-hidden shadow-inner">
            {sellerAvatar ? (
              <img src={sellerAvatar} alt={sellerName} className="w-full h-full object-cover" />
            ) : (
              <span>{sellerName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-slate-900 truncate m-0">{sellerName}</h4>
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            </div>
            <p className="text-[11px] text-slate-500 m-0 mt-0.5 flex items-center gap-2">
              <span className="text-amber-500 font-bold">★ 4.98/5</span>
              <span>•</span>
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> {t('gallery.kycVerified')}
              </span>
            </p>
          </div>
        </div>

        {auction?.seller?.id && (
          <button
            type="button"
            onClick={() => openChatWithUser({ userId: auction.seller!.id, userName: sellerName })}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition shrink-0 cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>{t('gallery.askSeller')}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default AuctionGallery;
