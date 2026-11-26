import React, { useState, useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { formatCurrency } from '../../i18n/formatters';
import { getIntlLocale } from '../../i18n/config';
import {
  Gavel,
  Truck,
  ShieldCheck,
  X,
  AlertTriangle,
  Clock,
  Award,
  CheckCircle2,
  Lock,
  Bell,
  AlertCircle,
} from 'lucide-react';
import type {
  AuctionEntity,
  AuctionConsignmentItem,
} from '@/features/auction/services/auction.service';

interface AuctionBidTerminalProps {
  auction?: AuctionEntity | null;
  selectedItem?: AuctionConsignmentItem | null;
  timeLeft: number;
  currentPrice: number;
  leadingBidder: string;
  onBidSuccess: (amount: number) => void;
  isEligible?: boolean;
  eligibilityReason?: string;
  isFlaggedViewOnly?: boolean;
  totalBidsCount?: number;
  buyerReputationScore?: number;
  requiredReputationScore?: number;
  hasItems?: boolean;
}

export const AuctionBidTerminal: React.FC<AuctionBidTerminalProps> = ({
  auction,
  selectedItem,
  timeLeft,
  currentPrice,
  leadingBidder,
  onBidSuccess,
  isEligible: _isEligible = true,
  eligibilityReason,
  isFlaggedViewOnly = false,
  totalBidsCount,
  buyerReputationScore,
  requiredReputationScore,
  hasItems: _hasItems,
}) => {
  const { t, i18n } = useTranslation('auction');
  const rawIncrement =
    selectedItem?.bidIncrement !== undefined &&
    selectedItem?.bidIncrement !== null &&
    Number(selectedItem.bidIncrement) > 0
      ? Number(selectedItem.bidIncrement)
      : selectedItem?.proposedBidIncrement !== undefined &&
          selectedItem?.proposedBidIncrement !== null &&
          Number(selectedItem.proposedBidIncrement) > 0
        ? Number(selectedItem.proposedBidIncrement)
        : auction?.bidIncrement
          ? Number(auction.bidIncrement)
          : 1000;
  const minIncrement = rawIncrement > 0 ? rawIncrement : 1000;

  const rawStartPrice =
    selectedItem?.startingPrice !== undefined &&
    selectedItem?.startingPrice !== null &&
    Number(selectedItem.startingPrice) > 0
      ? Number(selectedItem.startingPrice)
      : selectedItem?.proposedStartingPrice !== undefined &&
          selectedItem?.proposedStartingPrice !== null &&
          Number(selectedItem.proposedStartingPrice) > 0
        ? Number(selectedItem.proposedStartingPrice)
        : auction?.startingPrice
          ? Number(auction.startingPrice)
          : auction?.product?.basePrice
            ? Number(auction.product.basePrice)
            : 0;
  const startPriceVal = Number(rawStartPrice) || 0;

  const bidsCount = totalBidsCount ?? auction?.totalBidsCount ?? (auction?.bids?.length || 0);
  const isFirstBid = bidsCount === 0 || Number(currentPrice) === 0;

  const minValidBid = isFirstBid
    ? startPriceVal > 0
      ? startPriceVal
      : minIncrement
    : (currentPrice > 0 ? currentPrice : startPriceVal) + minIncrement;

  const basePrice = currentPrice > 0 ? currentPrice : startPriceVal;

  const [customBidAmount, setCustomBidAmount] = useState(
    isFirstBid
      ? startPriceVal > 0
        ? startPriceVal
        : minIncrement
      : (currentPrice > 0 ? currentPrice : startPriceVal) + minIncrement,
  );
  const [showBidModal, setShowBidModal] = useState(false);
  const [isReminderSet, setIsReminderSet] = useState(false);

  useEffect(() => {
    if (!isFirstBid && currentPrice > 0) {
      setCustomBidAmount(currentPrice + minIncrement);
    } else if (startPriceVal > 0) {
      setCustomBidAmount(startPriceVal);
    } else {
      setCustomBidAmount(minIncrement);
    }
  }, [currentPrice, minIncrement, startPriceVal, isFirstBid]);

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatVND = (amount: number) => {
    const val = Number(amount) || 0;
    return formatCurrency(val, i18n.language);
  };

  const formatUSD = (vnd: number) => {
    const val = Number(vnd) || 0;
    if (val <= 0) return '(≈ $0 USD)';
    const rawUsd = val / 24000;
    const formatted =
      rawUsd < 10
        ? new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(rawUsd)
        : rawUsd < 1000
          ? new Intl.NumberFormat('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            }).format(rawUsd)
          : new Intl.NumberFormat('en-US', {
              maximumFractionDigits: 0,
            }).format(Math.round(rawUsd));

    return `(≈ $${formatted} USD)`;
  };

  const quickButtons = isFirstBid
    ? [
        {
          label: t('terminal.quickStart'),
          targetAmount: startPriceVal > 0 ? startPriceVal : minIncrement,
        },
        {
          label: `+${formatVND(minIncrement)}`,
          targetAmount: (startPriceVal > 0 ? startPriceVal : 0) + minIncrement,
        },
        {
          label: `+${formatVND(minIncrement * 2)}`,
          targetAmount: (startPriceVal > 0 ? startPriceVal : 0) + minIncrement * 2,
        },
        {
          label: `+${formatVND(minIncrement * 5)}`,
          targetAmount: (startPriceVal > 0 ? startPriceVal : 0) + minIncrement * 5,
        },
      ]
    : [
        { label: `+${formatVND(minIncrement)}`, targetAmount: basePrice + minIncrement },
        { label: `+${formatVND(minIncrement * 2)}`, targetAmount: basePrice + minIncrement * 2 },
        { label: `+${formatVND(minIncrement * 5)}`, targetAmount: basePrice + minIncrement * 5 },
        { label: `+${formatVND(minIncrement * 10)}`, targetAmount: basePrice + minIncrement * 10 },
      ];

  const handleQuickIncrement = (targetAmount: number) => {
    setCustomBidAmount(targetAmount);
  };

  const handleConfirmBid = () => {
    onBidSuccess(customBidAmount);
    setShowBidModal(false);
  };

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

  const hasItems =
    _hasItems ??
    Boolean(selectedItem || auction?.product || (auction?.items && auction.items.length > 0));

  const displayTitle =
    selectedItem?.title || auction?.product?.title || auction?.title || t('terminal.defaultTitle');

  const lotNumber = selectedItem?.lotNumber
    ? t('terminal.lotPrefix', { number: selectedItem.lotNumber })
    : auction?.id
      ? t('terminal.batchPrefix', { code: auction.id.slice(0, 8).toUpperCase() })
      : t('terminal.awaitingListing');

  return (
    <div className="flex flex-col gap-5">
      {/* Title & Reference */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-semibold tracking-wider text-blue-600 uppercase">
            {auction?.product?.id ? t('terminal.verifiedCollection') : t('terminal.officialRoom')}
          </span>
          <span className="text-[11px] font-mono font-semibold text-muted bg-slate-100 px-2 py-0.5 rounded">
            {lotNumber}
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-ink leading-snug m-0">{displayTitle}</h1>
        {auction?.description && (
          <p className="text-[13px] text-muted line-clamp-2 m-0">{auction.description}</p>
        )}
      </div>

      {/* Countdown Banner */}
      <div
        className={`rounded-xl p-4 sm:p-5 flex items-center justify-between shadow-lg text-white ${
          isEnded
            ? 'bg-slate-900 border border-slate-800'
            : isScheduled
              ? 'bg-gradient-to-br from-amber-950 via-slate-900 to-amber-900 border border-amber-600/30'
              : 'bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800'
        }`}
      >
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            {isScheduled ? t('terminal.startsIn') : t('terminal.timeLeft')}
          </span>
          <span
            className={`font-mono text-2xl sm:text-3xl font-semibold tracking-wider ${
              isEnded ? 'text-slate-400' : isScheduled ? 'text-blue-200' : 'text-white'
            }`}
          >
            {timeLeft > 0
              ? formatTimer(timeLeft)
              : isScheduled
                ? t('terminal.preparing')
                : t('terminal.ended')}
          </span>
        </div>
        <div className="text-right flex flex-col gap-1">
          <span className="text-sm font-semibold text-white">
            {isScheduled ? t('terminal.notOpenYet') : t('terminal.bidsCount', { count: bidsCount })}
          </span>
          <span
            className={`text-[11px] flex items-center gap-1.5 justify-end ${
              isEnded ? 'text-slate-400' : isScheduled ? 'text-amber-400' : 'text-blue-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isEnded ? 'bg-slate-500' : isScheduled ? 'bg-amber-400' : 'bg-blue-400 animate-ping'
              }`}
            />
            {isEnded
              ? t('terminal.statusEnded')
              : isScheduled
                ? t('terminal.statusUpcoming')
                : t('terminal.statusLive')}
          </span>
        </div>
      </div>

      {/* Price & Terminal Box */}
      {!hasItems ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold text-slate-600">
              {t('terminal.sessionStatus')}
            </span>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              {t('terminal.awaitingListingTag')}
            </span>
          </div>

          <div className="mb-3">
            <span className="text-2xl sm:text-3xl font-semibold text-slate-700 leading-none">
              {t('terminal.noProductTitle')}
            </span>
            <p className="text-xs text-muted mt-2 m-0">
              {startPriceVal > 0 ? (
                <>
                  {t('terminal.expectedStartPrice')}{' '}
                  <strong className="text-ink">{formatVND(startPriceVal)}</strong>
                </>
              ) : (
                <>{t('terminal.pendingStartPriceNote')}</>
              )}
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 flex items-center gap-2 mb-4 border border-slate-200/80">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{t('terminal.biddingDisabledNote')}</span>
          </div>

          <div className="flex flex-col gap-2.5 mt-4">
            <button
              type="button"
              disabled
              className="w-full py-3 px-5 bg-slate-200 text-muted font-semibold text-sm rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>{t('terminal.noProductButton')}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsReminderSet(!isReminderSet)}
              className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer border ${
                isReminderSet
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Bell
                className={`w-4 h-4 ${
                  isReminderSet ? 'fill-emerald-600 text-emerald-600' : 'text-muted'
                }`}
              />
              <span>
                {isReminderSet ? t('terminal.reminderActive') : t('terminal.reminderSet')}
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold text-slate-600">
              {t('terminal.currentBidLabel')}
            </span>
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              {t('terminal.liveFx')}
            </span>
          </div>

          <div className="flex items-baseline gap-3 flex-wrap mb-3">
            <span className="text-3xl sm:text-4xl font-semibold text-primary leading-none">
              {formatVND(currentPrice)}
            </span>
            <span className="text-[15px] font-semibold text-blue-600">
              {formatUSD(currentPrice)}
            </span>
          </div>

          <div className="text-xs text-muted mb-4">
            {t('terminal.startingPriceLabel')} <strong>{formatVND(startPriceVal)}</strong> •{' '}
            {t('terminal.minIncrementLabel')} <strong>+{formatVND(minIncrement)}</strong>
          </div>

          {/* Leading Bidder */}
          <div className="bg-slate-50 rounded-lg p-2.5 text-xs text-slate-600 flex items-center justify-between mb-4 border-l-3 border-blue-500">
            <span>{t('terminal.leadingBidderLabel')}</span>
            <span className="font-semibold text-ink">{leadingBidder} 👑</span>
          </div>

          {/* Buyer Reputation & Eligibility Badge */}
          {buyerReputationScore !== undefined && (
            <div className="flex items-center justify-between bg-slate-50/90 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs mb-4">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <span className="text-slate-600">{t('terminal.yourReputation')} </span>
                  <strong className="text-ink font-semibold">
                    {t('terminal.pointsUnit', { score: buyerReputationScore })}
                  </strong>
                  <span className="text-[11px] text-slate-400 font-mono ml-1.5">
                    {t('terminal.requiredScore', { score: requiredReputationScore ?? 40 })}
                  </span>
                </div>
              </div>
              {buyerReputationScore >= (requiredReputationScore ?? 40) && !isFlaggedViewOnly ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {t('terminal.eligible')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3 text-amber-600" /> {t('terminal.viewOnlyBadge')}
                </span>
              )}
            </div>
          )}

          {/* View-only eligibility warning */}
          {isFlaggedViewOnly && (
            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{t('terminal.viewOnlyTitle')}</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  {eligibilityReason || t('terminal.viewOnlyFallback')}
                </p>
              </div>
            </div>
          )}

          {/* Scheduled notice for upcoming auctions */}
          {isScheduled && (
            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 text-xs flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{t('terminal.scheduledTitle')}</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  <Trans
                    ns="auction"
                    i18nKey="terminal.scheduledDesc"
                    values={{
                      time: auction?.startTime
                        ? new Date(auction.startTime).toLocaleString(getIntlLocale(i18n.language))
                        : t('terminal.upcomingTimeFallback'),
                    }}
                    components={{ bold: <strong /> }}
                  />
                </p>
              </div>
            </div>
          )}

          {/* Quick Bid Increment Buttons */}
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {quickButtons.map((btn, idx) => {
                const isSelected = customBidAmount === btn.targetAmount;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isScheduled || isEnded || isFlaggedViewOnly || timeLeft <= 0}
                    className={`p-2.5 rounded-xl cursor-pointer transition text-center flex flex-col items-center justify-center gap-0.5 border ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-slate-50 text-ink border-slate-200 hover:bg-blue-50 hover:border-blue-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    onClick={() => handleQuickIncrement(btn.targetAmount)}
                  >
                    <span className="font-semibold text-xs">{btn.label}</span>
                    <span
                      className={`text-[10px] font-medium ${
                        isSelected ? 'text-white/80' : 'text-slate-400'
                      }`}
                    >
                      = {formatVND(btn.targetAmount)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Bid Input & Action */}
            <div className="flex items-center gap-2 mt-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  disabled={isScheduled || isEnded || isFlaggedViewOnly || timeLeft <= 0}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-base font-semibold text-ink bg-slate-50 focus:bg-white focus:border-rose-500 focus:outline-none disabled:opacity-50"
                  value={formatVND(customBidAmount)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setCustomBidAmount(Number(raw) || 0);
                  }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  {t('terminal.currencyUnit')}
                </span>
              </div>

              <button
                type="button"
                disabled={
                  isScheduled ||
                  isEnded ||
                  isFlaggedViewOnly ||
                  timeLeft <= 0 ||
                  customBidAmount < minValidBid
                }
                className="py-2.5 px-5 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-semibold text-sm rounded-xl shadow-md transition hover:opacity-95 active:scale-95 whitespace-nowrap cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                onClick={() => setShowBidModal(true)}
              >
                <Gavel className="w-4 h-4" />
                <span>
                  {isScheduled
                    ? t('terminal.btnScheduled')
                    : isEnded
                      ? t('terminal.btnEnded')
                      : isFlaggedViewOnly
                        ? t('terminal.btnViewOnly')
                        : t('terminal.btnPlaceBid')}
                </span>
              </button>
            </div>

            <p className="text-[11px] text-muted m-0 text-center">{t('terminal.escrowLockNote')}</p>
          </div>
        </div>
      )}

      {/* Shipping & Policies */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3.5 p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-rose-50 text-rose-500">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[13px] font-semibold text-ink m-0">
              {t('terminal.shippingTitle')}
            </h4>
            <p className="text-xs text-muted leading-relaxed m-0 mt-0.5">
              {t('terminal.shippingDesc')}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[13px] font-semibold text-ink m-0">{t('terminal.escrowTitle')}</h4>
            <p className="text-xs text-muted leading-relaxed m-0 mt-0.5">
              {t('terminal.escrowDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {showBidModal && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[2000] flex items-center justify-center p-4"
          onClick={() => setShowBidModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-ink m-0">{t('terminal.modalTitle')}</h3>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                onClick={() => setShowBidModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl mb-4 text-xs text-slate-700">
              <p className="font-semibold text-ink mb-1">{displayTitle}</p>
              <p className="m-0 text-muted">{lotNumber}</p>
            </div>

            <div className="space-y-3 mb-5 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">{t('terminal.modalBidAmount')}</span>
                <span className="font-semibold text-primary text-base">
                  {formatVND(customBidAmount)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">{t('terminal.modalDepositLock')}</span>
                <span className="font-semibold text-blue-600">
                  {formatVND(Math.round(customBidAmount * 0.1))}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">{t('terminal.modalEscrowProvider')}</span>
                <span className="font-semibold text-emerald-600">
                  {t('terminal.modalEscrowName')}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-muted mb-5 leading-relaxed bg-slate-50 p-2.5 rounded-lg">
              {t('terminal.modalFootnote')}
            </p>

            <div className="flex gap-2.5">
              <button
                type="button"
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
                onClick={() => setShowBidModal(false)}
              >
                {t('terminal.modalCancel')}
              </button>
              <button
                type="button"
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 text-white font-semibold text-xs shadow-md hover:opacity-95 cursor-pointer"
                onClick={handleConfirmBid}
              >
                {t('terminal.modalConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuctionBidTerminal;
