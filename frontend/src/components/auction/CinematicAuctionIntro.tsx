import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../i18n/formatters';
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
} from '@/features/auction/services/auction.service';

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
  const { t, i18n } = useTranslation('auction');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(initialTime);
  const [countdown, setCountdown] = useState<number>(15);

  // Full auction session video configured by Admin
  const rawVideoUrl = auction?.videoUrl ? formatAuctionImage(auction.videoUrl) : '';
  const [videoError, setVideoError] = useState<boolean>(false);

  const ytMatch = rawVideoUrl.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
  );
  const isYouTube = Boolean(ytMatch);
  const ytEmbedUrl = ytMatch
    ? `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&enablejsapi=1`
    : '';

  // Sync video playback when modal opens
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

  // Keyboard shortcuts: Esc to skip, Space to Pause, M to Mute
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

  // 15s countdown before automatically entering the auction floor
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
    if (!num) return formatCurrency(0, i18n.language);
    return formatCurrency(Number(num), i18n.language);
  };

  const sessionItems: AuctionConsignmentItem[] = auction?.items || [];
  const sessionTitle = auction?.title || t('cinematic.defaultTitle');
  const sessionCode = auction?.id ? `#${auction.id.slice(0, 8).toUpperCase()}` : '#LIVE';
  const isLive = auction?.status === 'ACTIVE' || auction?.status === 'EXTENDED';

  // Calculate countdown progress ratio for the SVG ring
  const countdownDashOffset = 44 - (44 * (15 - countdown)) / 15;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl p-2.5 sm:p-5 transition-all duration-500 animate-fadeIn select-none">
      {/* Ambient Spotlight Background */}
      <div className="absolute inset-0 bg-radial from-rose-600/15 via-blue-600/5 to-transparent pointer-events-none" />

      {/* Main Cinematic Frame Container */}
      <div className="relative w-full max-w-5xl max-h-[96vh] flex flex-col rounded-3xl border border-slate-700/80 bg-slate-900/95 shadow-[0_0_100px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* Top Header Bar: Indicates this is the full auction session intro video */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800/90 bg-slate-950/80 backdrop-blur-md z-30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-rose-600 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-rose-600/40 shrink-0">
              <Film className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/15 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                  {t('cinematic.badge')}
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                  {sessionCode}
                </span>
                {isLive ? (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    {t('cinematic.live')}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {auction?.status === 'SCHEDULED'
                      ? t('cinematic.upcoming')
                      : t('cinematic.session')}
                  </span>
                )}
              </div>
              <h2 className="text-xs sm:text-sm font-extrabold text-white tracking-wide truncate max-w-xs sm:max-w-lg mt-0.5 m-0">
                {sessionTitle}
              </h2>
            </div>
          </div>

          {/* SKIP VIDEO BUTTON WITH PROGRESS RING */}
          <div className="flex items-center gap-3 shrink-0 ml-2">
            <span className="text-[11px] text-slate-400 hidden md:inline font-mono">
              {t('cinematic.pressEscPrefix')}{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">
                Esc
              </kbd>{' '}
              {t('cinematic.pressEscSuffix')}
            </span>

            <button
              type="button"
              onClick={handleClose}
              className="group relative flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white text-xs sm:text-sm font-extrabold rounded-full shadow-lg shadow-orange-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-white/30"
              title={t('cinematic.skipTitle')}
            >
              {/* SVG countdown ring */}
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
              <span>{t('cinematic.skip')}</span>
              <FastForward className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        {/* Video Stage Area: 16:9 with max-height overflow guard */}
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
                {videoError ? t('cinematic.videoErrorTitle') : t('cinematic.noVideoTitle')}
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                {videoError ? t('cinematic.videoErrorDesc') : t('cinematic.noVideoDesc')}
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg transition cursor-pointer flex items-center gap-2"
              >
                <Gavel className="w-4 h-4" />
                <span>{t('cinematic.enterRoomNow')}</span>
              </button>
            </div>
          ) : isYouTube ? (
            <iframe
              src={ytEmbedUrl}
              title={t('cinematic.videoShowcaseTitle')}
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
                {t('cinematic.watermark')}
              </span>
            </div>
          )}

          {/* Unmute Prompt Pill when video is muted */}
          {Boolean(rawVideoUrl) && isMuted && !isYouTube && (
            <button
              type="button"
              onClick={toggleMute}
              className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-semibold backdrop-blur-md shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer animate-pulse"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>{t('cinematic.unmutePrompt')}</span>
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
                    title={isPlaying ? t('cinematic.pauseTitle') : t('cinematic.playTitle')}
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
                    title={isMuted ? t('cinematic.unmuteTitle') : t('cinematic.muteTitle')}
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
                    title={t('cinematic.restartTitle')}
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
                    title={t('cinematic.fullscreenTitle')}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM SECTION: CATALOG OF ARTIFACTS / LOTS IN THIS SESSION */}
        <div className="bg-slate-950 px-4 sm:px-6 py-3 border-t border-slate-800/90 flex flex-col gap-2.5">
          {/* Catalog section header bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Layers className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {t('cinematic.catalogTitle')}
              </span>
              <span className="text-[11px] font-bold text-sky-400 bg-sky-950/60 border border-sky-500/30 px-2 py-0.5 rounded-full shrink-0">
                {sessionItems.length > 0
                  ? t('cinematic.itemsCount', { count: sessionItems.length })
                  : t('cinematic.acceptingItems')}
              </span>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Gavel className="w-3.5 h-3.5" />
              <span>{t('cinematic.bidNow')}</span>
            </button>
          </div>

          {/* Strip of lots featured in the intro video */}
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
                          {t('cinematic.lotBadge', { number: lot.lotNumber ?? idx + 1 })}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-bold text-rose-400 flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> {t('cinematic.selected')}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-bold text-white truncate mt-0.5 m-0 max-w-[170px]">
                        {lot.title}
                      </p>
                      <p className="text-[10px] font-extrabold text-rose-400 mt-0.5 m-0">
                        {lot.startingPrice
                          ? t('cinematic.startPrice', { amount: formatVND(lot.startingPrice) })
                          : t('cinematic.awaitingValuation')}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Notice shown when Admin created the session without seller lots yet */
            <div className="flex items-center gap-3 p-2.5 px-3.5 rounded-xl border border-amber-500/30 bg-amber-950/20 text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <div className="min-w-0 flex-1">
                <span className="font-bold text-amber-200">
                  {t('cinematic.consignmentOpenLabel')}
                </span>{' '}
                <span className="text-amber-300/80">{t('cinematic.consignmentOpenDesc')}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CinematicAuctionIntro;
