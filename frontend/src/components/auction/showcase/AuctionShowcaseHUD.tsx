import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { formatCurrency as formatI18nCurrency } from '../../../i18n/formatters';
import { getIntlLocale } from '../../../i18n/config';
import {
  CheckCircle2,
  FileCheck2,
  Gavel,
  ShieldCheck,
  Sparkles,
  Store,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  formatAuctionImage,
  type AuctionConsignmentItem,
} from '@/features/auction/services/auction.service';
import { AuctionAudioEngine } from './AuctionAudioEngine';
import { Museum3DCanvas } from './Museum3DCanvas';
import { SellerGalleryFrame3D } from './SellerGalleryFrame3D';
import { resolveShowcaseItemVisual } from './preset3dModels';
import './AuctionShowcaseHUD.css';

export interface AuctionShowcaseHUDProps {
  auctionTitle: string;
  auctionDescription?: string;
  items: AuctionConsignmentItem[];
  /**
   * 'live': Video phát trực tiếp khi mở phiên (không có nút dừng/skip/chuyển lô).
   * 'admin-replay': Chế độ Admin xem lại phục vụ demo (có nút chuyển lô & đóng cục bộ).
   */
  playbackMode?: 'live' | 'admin-replay';
  /**
   * Mốc thời gian đã trôi qua (ms) so với server khi người xem vào phòng muộn giữa lúc video trực tiếp đang chiếu.
   */
  initialElapsedMs?: number;
  onComplete: () => void;
  onCancel?: () => void;
}

type ScenePhase = 'hall' | 'lot' | 'climax';

const HALL_DURATION_MS = 3800;
const LOT_DURATION_MS = 4800;
const CLIMAX_DURATION_MS = 3500;

const waitMs = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });

const RealProductPhotoSpotlight: React.FC<{ title: string; images: string[] }> = ({
  title,
  images,
}) => {
  const { t } = useTranslation('auction');
  const [photoIdx, setPhotoIdx] = useState(0);
  const resolvedUrls = useMemo(
    () => images.map((u) => formatAuctionImage(u)).filter(Boolean),
    [images],
  );

  useEffect(() => {
    setPhotoIdx(0);
    if (resolvedUrls.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setPhotoIdx((prev) => (prev + 1) % resolvedUrls.length);
    }, 1550);
    return () => window.clearInterval(timer);
  }, [title, resolvedUrls.length]);

  const currentUrl = resolvedUrls[photoIdx];
  if (!currentUrl) return null;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div className="relative aspect-[4/3] w-full max-w-[235px] overflow-hidden rounded-2xl border border-amber-400/50 bg-slate-950 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
        <div className="relative h-full w-full overflow-hidden rounded-xl bg-slate-900">
          <img
            key={currentUrl}
            src={currentUrl}
            alt={t('showcase.realPhotoAlt', { title })}
            className="ken-burns-pan h-full w-full object-cover"
          />
          <div className="museum-frame-glass-glare pointer-events-none absolute inset-0" />
          <span className="absolute right-2 bottom-2 rounded-md border border-amber-400/40 bg-slate-950/85 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-200">
            {t('showcase.realPhotoBadge', { current: photoIdx + 1, total: resolvedUrls.length })}
          </span>
        </div>
      </div>
      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-cyan-400/35 bg-slate-950/75 px-3 py-1 text-[10px] font-mono font-semibold tracking-wider text-cyan-200 backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span>{t('showcase.realPhotoTag')}</span>
      </div>
    </div>
  );
};

/**
 * Video Giới Thiệu Phiên Đấu Giá Điện Ảnh 3D (không dùng file MP4).
 * Hỗ trợ phát trực tiếp đồng bộ (live) và chế độ xem lại demo cho riêng Admin (admin-replay).
 */
export const AuctionShowcaseHUD: React.FC<AuctionShowcaseHUDProps> = ({
  auctionTitle,
  auctionDescription,
  items,
  playbackMode = 'live',
  initialElapsedMs = 0,
  onComplete,
  onCancel,
}) => {
  const { t, i18n } = useTranslation('auction');
  const isAdminReplay = playbackMode === 'admin-replay';

  const formatCurrency = (val?: number | string | null): string => {
    const num = Number(val ?? 0);
    if (!Number.isFinite(num) || num <= 0) return t('showcase.byAgreement');
    return formatI18nCurrency(num, i18n.language);
  };

  const formatDateVi = (iso?: string | null): string | null => {
    if (!iso) return null;
    const parsed = new Date(iso);
    if (!Number.isFinite(parsed.getTime())) return null;
    return parsed.toLocaleDateString(getIntlLocale(i18n.language));
  };

  const [phase, setPhase] = useState<ScenePhase>('hall');
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [currentLotIdx, setCurrentLotIdx] = useState(0);
  const [climaxStep, setClimaxStep] = useState<1 | 2 | 3>(1);
  const [climaxCountdown, setClimaxCountdown] = useState<number | 'START'>(3);
  const [hudVisibleCount, setHudVisibleCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [flareKey, setFlareKey] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [manualJumpTrigger, setManualJumpTrigger] = useState<{
    targetPhase: ScenePhase;
    lotIdx?: number;
    seqId: number;
  } | null>(null);

  const audioRef = useRef<AuctionAudioEngine | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;
  const initialElapsedRef = useRef(initialElapsedMs);

  // Hỗ trợ phím Escape để bỏ qua video hoặc đóng xem lại
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onCancelRef.current) onCancelRef.current();
        else onCompleteRef.current?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Chuẩn hóa danh sách lô hàng đã duyệt để trình chiếu
  const showcaseLots = useMemo(() => {
    if (items && items.length > 0) return items;
    return [
      {
        id: 'fallback-lot-1',
        title: auctionTitle,
        description: auctionDescription || t('showcase.fallbackDesc'),
        images: [],
        lotNumber: 1,
        startingPrice: 0,
        bidIncrement: 0,
      } as AuctionConsignmentItem,
    ];
  }, [items, auctionTitle, auctionDescription]);

  const resolvedLots = useMemo(
    () => showcaseLots.map((item) => ({ item, visual: resolveShowcaseItemVisual(item) })),
    [showcaseLots],
  );

  const totalDurationMs =
    HALL_DURATION_MS + resolvedLots.length * LOT_DURATION_MS + CLIMAX_DURATION_MS;

  useEffect(() => {
    audioRef.current = new AuctionAudioEngine();
    return () => {
      audioRef.current?.dispose();
      audioRef.current = null;
    };
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      audioRef.current?.setMuted(next);
      return next;
    });
  }, []);

  // Thanh tiến trình mượt cho người xem ở chế độ trực tiếp
  useEffect(() => {
    const startClock = performance.now();
    const baseOffset = manualJumpTrigger
      ? manualJumpTrigger.targetPhase === 'hall'
        ? 0
        : manualJumpTrigger.targetPhase === 'lot'
          ? HALL_DURATION_MS + (manualJumpTrigger.lotIdx ?? 0) * LOT_DURATION_MS
          : HALL_DURATION_MS + resolvedLots.length * LOT_DURATION_MS
      : Math.max(0, Math.min(totalDurationMs, initialElapsedRef.current));

    const timer = window.setInterval(() => {
      const elapsed = baseOffset + (performance.now() - startClock);
      setProgressPct(Math.min(100, Math.max(0, (elapsed / totalDurationMs) * 100)));
    }, 80);
    return () => window.clearInterval(timer);
  }, [manualJumpTrigger, resolvedLots.length, totalDurationMs]);

  // Kịch bản đạo diễn bất đồng bộ (Async Timeline Sequencer — không bị hủy khi component cha re-render)
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function runSequence() {
      try {
        let startPhase: ScenePhase = 'hall';
        let startLotIdx = 0;
        let offsetInPhaseMs = 0;

        const currentElapsed = initialElapsedRef.current;
        if (manualJumpTrigger && isAdminReplay) {
          startPhase = manualJumpTrigger.targetPhase;
          startLotIdx = manualJumpTrigger.lotIdx ?? 0;
        } else if (currentElapsed > 0) {
          if (currentElapsed < HALL_DURATION_MS) {
            startPhase = 'hall';
            offsetInPhaseMs = currentElapsed;
          } else if (currentElapsed < HALL_DURATION_MS + resolvedLots.length * LOT_DURATION_MS) {
            const intoLots = currentElapsed - HALL_DURATION_MS;
            startPhase = 'lot';
            startLotIdx = Math.min(resolvedLots.length - 1, Math.floor(intoLots / LOT_DURATION_MS));
            offsetInPhaseMs = intoLots % LOT_DURATION_MS;
          } else {
            startPhase = 'climax';
            offsetInPhaseMs = Math.max(
              0,
              currentElapsed - (HALL_DURATION_MS + resolvedLots.length * LOT_DURATION_MS),
            );
          }
        }

        // 1. MỞ MÀN ĐIỆN ẢNH: GIỚI THIỆU PHIÊN ĐẤU GIÁ
        if (startPhase === 'hall') {
          setPhase('hall');
          setFlareKey((k) => k + 1);
          setDoorsOpen(offsetInPhaseMs > 180);
          if (offsetInPhaseMs <= 180) {
            await waitMs(160, signal);
            setDoorsOpen(true);
            audioRef.current?.playMuseumBoot();
          }
          const remainingHall = Math.max(250, HALL_DURATION_MS - Math.max(160, offsetInPhaseMs));
          await waitMs(remainingHall, signal);
          offsetInPhaseMs = 0;
        } else {
          setDoorsOpen(true);
        }

        // 2. GIỚI THIỆU CHI TIẾT TỪNG LÔ HÀNG (10 MODEL 3D / TƯ LIỆU ẢNH SELLER)
        if (startPhase === 'hall' || startPhase === 'lot') {
          setPhase('lot');
          for (let i = startLotIdx; i < resolvedLots.length; i++) {
            setCurrentLotIdx(i);
            setFlareKey((k) => k + 1);
            const skipOffset = i === startLotIdx ? offsetInPhaseMs : 0;

            if (skipOffset > 900) {
              setHudVisibleCount(4);
              const remainingLot = Math.max(400, LOT_DURATION_MS - skipOffset);
              await waitMs(remainingLot, signal);
              continue;
            }

            setHudVisibleCount(0);
            audioRef.current?.playSpotlightCue();

            await waitMs(380, signal);
            setHudVisibleCount(1);
            audioRef.current?.playHudTick();

            await waitMs(300, signal);
            setHudVisibleCount(2);
            audioRef.current?.playLaserScan();

            await waitMs(300, signal);
            setHudVisibleCount(3);
            audioRef.current?.playHudTick();

            await waitMs(300, signal);
            setHudVisibleCount(4);
            audioRef.current?.playHudTick();

            await waitMs(LOT_DURATION_MS - 1280, signal);
          }
          offsetInPhaseMs = 0;
        }

        // 3. CAO TRÀO KHAI MẠC & ĐẾM NGƯỢC MỞ SÀN
        setPhase('climax');
        setFlareKey((k) => k + 1);

        if (offsetInPhaseMs < 1000) {
          setClimaxStep(1);
          audioRef.current?.playLaserScan();
          await waitMs(1000 - offsetInPhaseMs, signal);
          offsetInPhaseMs = 0;
        } else {
          offsetInPhaseMs -= 1000;
        }

        if (offsetInPhaseMs < 950) {
          setClimaxStep(2);
          audioRef.current?.playSpotlightCue();
          await waitMs(950 - offsetInPhaseMs, signal);
        }

        setClimaxStep(3);
        for (const count of [3, 2, 1] as const) {
          setClimaxCountdown(count);
          audioRef.current?.playCountdownTone(false);
          await waitMs(520, signal);
        }
        setClimaxCountdown('START');
        audioRef.current?.playCountdownTone(true);
        await waitMs(850, signal);

        onCompleteRef.current?.();
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        onCompleteRef.current?.();
      }
    }

    void runSequence();
    return () => controller.abort();
  }, [isAdminReplay, manualJumpTrigger, resolvedLots.length]);

  const activeEntry = resolvedLots[currentLotIdx] || resolvedLots[0];
  const activeVisual = activeEntry.visual;
  const activeLot = activeEntry.item;

  // Luôn ưu tiên giá chính thức sau duyệt -> giá Seller đề xuất ban đầu
  const resolvedStartingPrice = activeLot.startingPrice ?? activeLot.proposedStartingPrice;
  const resolvedBidIncrement = activeLot.bidIncrement ?? activeLot.proposedBidIncrement;
  const certNumber = activeLot.appraisalCertificateNumber?.trim() || null;
  const certAgency = activeLot.appraisalAgency?.trim() || null;
  const certIssueDate = formatDateVi(activeLot.certificateIssueDate);
  const certPreviewImg = activeLot.certificateImages?.[0]
    ? formatAuctionImage(activeLot.certificateImages[0])
    : null;

  const handleAdminJump = (targetPhase: ScenePhase, lotIdx = 0) => {
    if (!isAdminReplay) return;
    setManualJumpTrigger({ targetPhase, lotIdx, seqId: Date.now() });
  };

  return (
    <div
      className="museum-showcase-root flex flex-col justify-between"
      role="dialog"
      aria-modal="true"
      aria-label={t('showcase.dialogAria', { title: auctionTitle })}
    >
      {/* Khung nền điện ảnh: Sàn phản chiếu + Bokeh hạt vàng + Spotlight + Lens Flare */}
      <div className="cinema-bokeh-field" />
      <div className="museum-floor-grid" />
      <div className="museum-pillar hidden md:block" />
      <div className="museum-pillar museum-pillar-right hidden md:block" />
      <div className="museum-spotlight-beam" />
      <div key={`flare-${flareKey}`} className="cinema-flare-sweep" />

      {/* Cánh cửa đại sảnh mở màn */}
      <div className={`museum-door museum-door-left ${doorsOpen ? 'museum-door-open-left' : ''}`} />
      <div
        className={`museum-door museum-door-right ${doorsOpen ? 'museum-door-open-right' : ''}`}
      />

      {/* Dải Cinema Letterbox trên */}
      <div className="cinema-letterbox-bar relative z-50 w-full shrink-0" />

      {/* TOP BAR: Trạng thái phát sóng + Âm thanh (chỉ Admin Replay mới có nút Đóng) */}
      <header className="relative z-50 flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 bg-slate-950/65 px-4 py-3 backdrop-blur-md sm:px-8 sm:py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-[11px] font-bold tracking-wider text-amber-200 uppercase">
            <span
              className={`h-2 w-2 rounded-full ${
                isAdminReplay ? 'bg-amber-400' : 'bg-rose-500 animate-ping'
              }`}
            />
            {isAdminReplay ? t('showcase.adminReplayBadge') : t('showcase.liveBroadcastBadge')}
          </span>
          <span className="hidden max-w-md truncate text-xs font-medium text-slate-300 sm:inline-block">
            {auctionTitle}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/85 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-amber-400/50 hover:text-white"
            title={isMuted ? t('showcase.unmuteTitle') : t('showcase.muteTitle')}
          >
            {isMuted ? (
              <VolumeX className="h-3.5 w-3.5 text-rose-400" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-amber-400" />
            )}
            <span className="hidden sm:inline">
              {isMuted ? t('showcase.muted') : t('showcase.sound')}
            </span>
          </button>

          <button
            type="button"
            onClick={onCancel ?? onComplete}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-amber-400/50 bg-amber-500/20 px-3.5 py-1.5 text-xs font-bold text-amber-100 transition hover:bg-amber-500/35 hover:scale-105 active:scale-95"
            title={isAdminReplay ? t('showcase.closeReplayTitle') : t('showcase.skipToBidTitle')}
          >
            <X className="h-3.5 w-3.5" />
            <span>{isAdminReplay ? t('showcase.closeReplay') : t('showcase.skipVideo')}</span>
          </button>
        </div>
      </header>

      {/* MAIN CINEMATIC STAGE */}
      <main className="relative z-30 flex flex-1 items-center justify-center overflow-y-auto px-4 py-4 sm:px-8">
        {/* SCENE 1: MỞ MÀN PHIÊN ĐẤU GIÁ */}
        {phase === 'hall' && (
          <section className="museum-pedestal-enter w-full max-w-4xl space-y-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-slate-900/85 px-4 py-1.5 text-xs font-mono tracking-[0.22em] text-amber-200 uppercase">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>{t('showcase.hallOpeningBadge')}</span>
            </div>

            <div className="relative mx-auto rounded-3xl border border-amber-400/40 bg-slate-950/80 p-7 shadow-[0_0_90px_rgba(245,158,11,0.22)] backdrop-blur-xl sm:p-11">
              <svg
                className="hud-svg-frame pointer-events-none absolute inset-0 h-full w-full"
                preserveAspectRatio="none"
                viewBox="0 0 800 320"
                fill="none"
              >
                <path d="M24 2 H90 M2 24 V90" stroke="#fbbf24" strokeWidth="3" />
                <path d="M776 2 H710 M798 24 V90" stroke="#fbbf24" strokeWidth="3" />
                <path d="M24 318 H90 M2 296 V230" stroke="#38bdf8" strokeWidth="3" />
                <path d="M776 318 H710 M798 296 V230" stroke="#38bdf8" strokeWidth="3" />
              </svg>

              <p className="text-[11px] font-mono uppercase tracking-[0.38em] text-cyan-300">
                OFFICIAL LIVE AUCTION BROADCAST
              </p>
              <h1 className="mt-3 bg-gradient-to-r from-amber-100 via-yellow-300 to-amber-200 bg-clip-text text-2xl font-black leading-tight tracking-tight text-transparent sm:text-4xl md:text-5xl">
                {auctionTitle}
              </h1>
              <div className="broadcast-hairline mx-auto mt-4 w-48" />
              {auctionDescription && (
                <p className="mx-auto mt-4 max-w-2xl text-xs leading-relaxed text-slate-300 sm:text-sm">
                  {auctionDescription}
                </p>
              )}

              <div className="mt-7 grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    {t('showcase.hallCatalogLabel')}
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-white">
                    {t('showcase.hallLotsVerified', { count: resolvedLots.length })}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-amber-300">
                    {t('showcase.hallOriginLabel')}
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-amber-100">
                    {t('showcase.hallOriginValue')}
                  </p>
                </div>
                <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-300">
                    {t('showcase.hallStatusLabel')}
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-cyan-100">
                    {t('showcase.hallStatusValue')}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SCENE 2: TRÌNH CHIẾU TỪNG SẢN PHẨM VỚI DỮ LIỆU THẬT TỪ SELLER */}
        {phase === 'lot' && (
          <section
            key={activeLot.id || currentLotIdx}
            className="museum-pedestal-enter grid w-full max-w-6xl grid-cols-1 items-center gap-6 lg:grid-cols-[1.15fr_0.95fr]"
          >
            {/* CỘT TRÁI: SÂN KHẤU TRÌNH DIỄN HOLOGRAM / TƯ LIỆU ẢNH SELLER */}
            <div className="relative flex min-h-[370px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-amber-400/35 bg-slate-950/70 p-5 shadow-[0_0_70px_rgba(0,0,0,0.85)] backdrop-blur-md sm:min-h-[440px] sm:p-6">
              <svg
                className="hud-svg-frame pointer-events-none absolute inset-0 h-full w-full"
                preserveAspectRatio="none"
                viewBox="0 0 600 440"
                fill="none"
              >
                <rect
                  x="10"
                  y="10"
                  width="580"
                  height="420"
                  rx="24"
                  stroke="url(#cinemaFrameGrad)"
                  strokeWidth="1.5"
                  strokeDasharray="10 6"
                  opacity="0.65"
                />
                <path d="M10 64 V24 Q10 10 24 10 H64" stroke="#fbbf24" strokeWidth="3" />
                <path d="M536 10 H576 Q590 10 590 24 V64" stroke="#fbbf24" strokeWidth="3" />
                <path d="M10 376 V416 Q10 430 24 430 H64" stroke="#22d3ee" strokeWidth="3" />
                <path d="M536 430 H576 Q590 430 590 416 V376" stroke="#22d3ee" strokeWidth="3" />
                <defs>
                  <linearGradient id="cinemaFrameGrad" x1="0" y1="0" x2="600" y2="440">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
              </svg>

              {activeVisual.mode === '3d-preset' && <div className="hud-scanline" />}

              <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                <span className="rounded-lg border border-amber-400/50 bg-amber-400/20 px-2.5 py-1 text-[11px] font-mono font-bold text-amber-100">
                  {t('showcase.lotCounter', {
                    current: String(activeLot.lotNumber ?? currentLotIdx + 1).padStart(2, '0'),
                    total: String(resolvedLots.length).padStart(2, '0'),
                  })}
                </span>
                <span className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-mono font-bold text-emerald-300">
                  {t('showcase.verifiedValid')}
                </span>
              </div>

              <div className="relative z-10 flex min-h-[320px] w-full items-center justify-center pt-7 sm:min-h-[365px]">
                {activeVisual.mode === '3d-preset' ? (
                  activeVisual.images.length > 0 ? (
                    <div className="grid w-full grid-cols-1 items-center gap-4 sm:grid-cols-[1.12fr_0.88fr]">
                      <div className="h-[260px] w-full sm:h-[340px]">
                        <Museum3DCanvas
                          presetKey={activeVisual.preset.key}
                          accentColor={activeVisual.preset.accentColor}
                          secondaryColor={activeVisual.preset.secondaryColor}
                          modelLabel={
                            (i18n.resolvedLanguage ?? i18n.language).startsWith('en')
                              ? activeVisual.preset.englishLabel
                              : activeVisual.preset.label
                          }
                        />
                      </div>
                      <RealProductPhotoSpotlight
                        title={activeLot.title}
                        images={activeVisual.images}
                      />
                    </div>
                  ) : (
                    <div className="h-[320px] w-full sm:h-[365px]">
                      <Museum3DCanvas
                        presetKey={activeVisual.preset.key}
                        accentColor={activeVisual.preset.accentColor}
                        secondaryColor={activeVisual.preset.secondaryColor}
                        modelLabel={
                          i18n.language === 'en'
                            ? activeVisual.preset.englishLabel
                            : activeVisual.preset.label
                        }
                      />
                    </div>
                  )
                ) : (
                  <SellerGalleryFrame3D
                    title={activeLot.title}
                    sellerName={activeLot.seller?.fullName}
                    lotNumber={activeLot.lotNumber ?? currentLotIdx + 1}
                    images={activeVisual.images}
                  />
                )}
              </div>
            </div>

            {/* CỘT PHẢI: HỒ SƠ THÔNG SỐ & CHỨNG THƯ KIỂM ĐỊNH THỰC TẾ CỦA SELLER */}
            <div className="space-y-3.5">
              {hudVisibleCount >= 1 && (
                <div className="hud-panel-slide rounded-2xl border border-amber-400/35 bg-slate-900/85 p-5 shadow-xl backdrop-blur-md">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono uppercase text-amber-300">
                    <span className="flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5" />
                      {activeLot.seller?.fullName || t('showcase.defaultConsignmentShop')}
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {t('showcase.approved')}
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-extrabold leading-snug text-white sm:text-2xl">
                    {activeLot.title}
                  </h2>
                  <div className="broadcast-hairline mt-2.5 w-28" />
                  {activeLot.description && (
                    <p className="mt-2.5 line-clamp-3 text-xs leading-relaxed text-slate-300 sm:text-sm">
                      {activeLot.description}
                    </p>
                  )}
                </div>
              )}

              {hudVisibleCount >= 2 && (
                <div className="hud-panel-slide grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-cyan-500/35 bg-slate-900/85 p-4 backdrop-blur-md">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-300">
                      {t('showcase.startingPrice')}
                    </p>
                    <p className="mt-1 text-lg font-black text-white sm:text-xl">
                      {formatCurrency(resolvedStartingPrice)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-500/35 bg-slate-900/85 p-4 backdrop-blur-md">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-amber-300">
                      {t('showcase.minIncrement')}
                    </p>
                    <p className="mt-1 text-lg font-black text-amber-300 sm:text-xl">
                      {Number(resolvedBidIncrement ?? 0) > 0
                        ? `+${formatCurrency(resolvedBidIncrement)}`
                        : t('showcase.byRules')}
                    </p>
                  </div>
                </div>
              )}

              {hudVisibleCount >= 3 && (
                <div className="hud-panel-slide flex items-start gap-3.5 rounded-2xl border border-emerald-500/35 bg-slate-900/85 p-4 backdrop-blur-md">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/20 text-emerald-300">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-300">
                      {t('showcase.certSectionTitle')}
                    </p>
                    <p className="truncate text-sm font-bold text-white">
                      {certNumber
                        ? t('showcase.certNumber', { code: certNumber })
                        : t('showcase.certMissing')}
                    </p>
                    <p className="truncate text-xs text-slate-300">
                      {certAgency
                        ? t('showcase.certAgency', { agency: certAgency })
                        : t('showcase.certAgencyMissing')}
                    </p>
                    {certIssueDate && (
                      <p className="text-[11px] text-emerald-300/90">
                        {t('showcase.certIssueDate', { date: certIssueDate })}
                      </p>
                    )}
                  </div>
                  {certPreviewImg && (
                    <div className="shrink-0 overflow-hidden rounded-lg border border-emerald-400/40 bg-slate-950 p-0.5">
                      <img
                        src={certPreviewImg}
                        alt={t('showcase.certAlt', { name: certNumber || activeLot.title })}
                        className="h-14 w-14 rounded object-cover"
                      />
                    </div>
                  )}
                </div>
              )}

              {hudVisibleCount >= 4 && (
                <div className="hud-panel-slide flex items-center gap-2.5 rounded-2xl border border-amber-400/25 bg-slate-950/85 p-3.5 text-xs text-slate-300">
                  <FileCheck2 className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>{t('showcase.syncNote')}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* SCENE 3: CAO TRÀO KHAI MẠC & MỞ BÀN ĐẶT GIÁ */}
        {phase === 'climax' && (
          <section className="w-full max-w-3xl space-y-6 text-center">
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_60px_rgba(245,158,11,0.55)]">
              <span className="climax-shockwave" />
              <Gavel className="relative z-10 h-10 w-10 animate-bounce" />
            </div>

            {climaxStep === 1 && (
              <div className="climax-title-anim space-y-2">
                <p className="text-xs font-mono uppercase tracking-[0.42em] text-emerald-400">
                  AUTHENTICATION COMPLETE
                </p>
                <h2 className="text-3xl font-black text-white sm:text-5xl">
                  {t('showcase.climaxAuthComplete')}
                </h2>
              </div>
            )}

            {climaxStep === 2 && (
              <div className="climax-title-anim space-y-2">
                <p className="text-xs font-mono uppercase tracking-[0.42em] text-cyan-400">
                  ARE YOU READY TO BID?
                </p>
                <h2 className="bg-gradient-to-r from-cyan-300 via-white to-amber-300 bg-clip-text text-3xl font-black text-transparent sm:text-5xl">
                  {t('showcase.climaxReady')}
                </h2>
              </div>
            )}

            {climaxStep === 3 && (
              <div className="climax-title-anim space-y-4">
                <p className="text-xs font-mono uppercase tracking-[0.38em] text-amber-300">
                  AUCTION ROOM IS NOW OPEN
                </p>
                <div className="text-6xl font-black text-amber-400 drop-shadow-[0_0_40px_rgba(251,191,36,0.85)] sm:text-8xl">
                  {climaxCountdown === 'START' ? t('showcase.climaxStart') : climaxCountdown}
                </div>
                <p className="text-sm text-slate-300">
                  <Trans
                    ns="auction"
                    i18nKey="showcase.climaxOpening"
                    values={{ title: auctionTitle }}
                    components={{ bold: <strong className="text-white" /> }}
                  />
                </p>
              </div>
            )}
          </section>
        )}
      </main>

      {/* BOTTOM BAR: CHỈ ADMIN REPLAY MỚI CÓ NÚT CHỌN LÔ; LIVE CHỈ HIỆN THANH TIẾN TRÌNH */}
      <footer className="relative z-50 border-t border-amber-500/20 bg-slate-950/80 px-4 py-3 backdrop-blur-md sm:px-8">
        <div className="mx-auto max-w-6xl space-y-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-cyan-400 transition-all duration-150"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {isAdminReplay ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAdminJump('hall')}
                  className={`cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    phase === 'hall'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {t('showcase.jumpHall')}
                </button>

                {resolvedLots.map(({ item }, idx) => {
                  const isCurrent = phase === 'lot' && currentLotIdx === idx;
                  return (
                    <button
                      key={item.id || idx}
                      type="button"
                      onClick={() => handleAdminJump('lot', idx)}
                      title={item.title}
                      className={`cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                        isCurrent
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-md'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {t('showcase.jumpLot', { number: item.lotNumber ?? idx + 1 })}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => handleAdminJump('climax')}
                  className={`cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    phase === 'climax'
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {t('showcase.jumpClimax')}
                </button>
              </div>
            ) : (
              <p className="text-[11px] font-mono font-semibold text-amber-200/90">
                {phase === 'hall'
                  ? t('showcase.footerHall')
                  : phase === 'lot'
                    ? t('showcase.footerLot', {
                        current: activeLot.lotNumber ?? currentLotIdx + 1,
                        total: resolvedLots.length,
                      })
                    : t('showcase.footerClimax')}
              </p>
            )}

            <p className="text-[11px] font-mono text-slate-400">{t('showcase.footerRight')}</p>
          </div>
        </div>
      </footer>

      {/* Dải Cinema Letterbox dưới */}
      <div className="cinema-letterbox-bar relative z-50 w-full shrink-0" />
    </div>
  );
};

export default AuctionShowcaseHUD;
