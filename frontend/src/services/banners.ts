import type { BannerInput } from './banners.service';

export { listBanners, saveBanner, type Banner, type BannerInput } from './banners.service';

export function bannerStatus(banner: BannerInput, now = Date.now()) {
  if (!banner.isActive) return 'Đã tắt';
  if (banner.endsAt && Date.parse(banner.endsAt) <= now) return 'Đã hết hạn';
  if (banner.startsAt && Date.parse(banner.startsAt) > now) return 'Đã lên lịch';
  return 'Đang hiển thị';
}

// Only HTTP(S) destinations may become clickable links, including server-provided data.
export function bannerLink(value: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
