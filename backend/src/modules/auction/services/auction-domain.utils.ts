import { AuctionStatus } from '@prisma/client';

export const ANTI_SNIPING_WINDOW_MS = 120_000;
export const ANTI_SNIPING_EXTENSION_MS = 120_000;
export const MIN_AUCTION_DURATION_MS = 30 * 60 * 1000;

export const INTRO_HALL_DURATION_MS = 3800;
export const INTRO_LOT_DURATION_MS = 4800;
export const INTRO_CLIMAX_DURATION_MS = 3500;

export const BUYER_VISIBLE_AWARD_STATUSES = [
  'AWAITING_ACCEPTANCE',
  'AWAITING_DEPOSIT',
  'AWAITING_CHECKOUT',
  'PAID',
];

export function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')} ₫`;
}

export function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

export function lotDisplayTitle(lotNumber: number | null | undefined, title: string): string {
  return lotNumber ? `Lot #${lotNumber}: ${title}` : title;
}

export function getIntroDurationMs(lotCount: number): number {
  return (
    INTRO_HALL_DURATION_MS +
    Math.max(1, lotCount) * INTRO_LOT_DURATION_MS +
    INTRO_CLIMAX_DURATION_MS
  );
}

export function computeIntroState(
  status: AuctionStatus,
  startTime: Date,
  lotCount: number,
): { introDurationMs: number; isIntroActive: boolean; elapsedMs: number } {
  const introDurationMs = getIntroDurationMs(lotCount);
  const isLive = status === AuctionStatus.ACTIVE || status === AuctionStatus.EXTENDED;
  if (!isLive) {
    return { introDurationMs, isIntroActive: false, elapsedMs: 0 };
  }
  const rawElapsed = Date.now() - startTime.getTime();
  const elapsedMs = Math.max(0, Math.min(introDurationMs, rawElapsed));
  return {
    introDurationMs,
    isIntroActive: rawElapsed < introDurationMs,
    elapsedMs,
  };
}
