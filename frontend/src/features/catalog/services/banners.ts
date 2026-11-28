import type { BannerInput } from '@/features/catalog/services/banners.service';

export {
  listBanners,
  saveBanner,
  type Banner,
  type BannerInput,
} from '@/features/catalog/services/banners.service';

export type BannerStatusKey = 'active' | 'scheduled' | 'disabled' | 'expired';

export function bannerStatus(banner: BannerInput, now = Date.now()): BannerStatusKey {
  if (!banner.isActive) return 'disabled';
  if (banner.endsAt && Date.parse(banner.endsAt) <= now) return 'expired';
  if (banner.startsAt && Date.parse(banner.startsAt) > now) return 'scheduled';
  return 'active';
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
