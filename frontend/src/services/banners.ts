import { apiRequest } from './api';

export interface BannerInput {
  title: string;
  imageUrl: string;
  targetUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  priority: number;
}

export interface Banner extends BannerInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export const listBanners = (publicOnly = false) =>
  apiRequest<Banner[]>(publicOnly ? '/catalog/banners' : '/staff/banners', {
    requireAuth: !publicOnly,
  });

export const saveBanner = (body: BannerInput, id?: string) =>
  apiRequest<Banner>(id ? `/staff/banners/${encodeURIComponent(id)}` : '/staff/banners', {
    method: id ? 'PUT' : 'POST',
    body,
    requireAuth: true,
  });

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
