import api from './api';
import { isAxiosError } from 'axios';
import { getApiErrorMessage } from '../lib/apiErrors';

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

type BannerResponse<T> = T | { data: T };

// Shared Axios instance supplies the base URL, Bearer token and refresh-token handling.
async function bannerRequest<T>(request: () => Promise<{ data: BannerResponse<T> }>): Promise<T> {
  try {
    const { data: payload } = await request();
    if (payload && typeof payload === 'object' && 'data' in payload) return payload.data;
    return payload as T;
  } catch (error) {
    if (isAxiosError(error)) {
      throw new Error(
        error.response
          ? getApiErrorMessage(error.response.data)
          : 'Không thể kết nối tới máy chủ backend. Vui lòng kiểm tra lại dịch vụ backend.',
      );
    }
    throw error;
  }
}

export async function listBanners(publicOnly = false): Promise<Banner[]> {
  const banners = await bannerRequest(() =>
    api.get<BannerResponse<Banner[]>>(publicOnly ? '/catalog/banners' : '/staff/banners'),
  );
  // Legacy priorities of zero or less follow the numbered positions.
  const position = (priority: number) => (priority >= 1 ? priority : Number.MAX_SAFE_INTEGER);
  return [...banners].sort((a, b) => position(a.priority) - position(b.priority));
}

function normalizeBannerImageUrl(value: string): string {
  const url = new URL(value.trim());
  // The upload API's local fallback uses localhost, which banner validation rejects.
  if (url.hostname === 'localhost' && url.protocol === 'http:') {
    url.hostname = '127.0.0.1';
    return url.href;
  }
  return value.trim();
}

export function saveBanner(body: BannerInput, id?: string): Promise<Banner> {
  const payload = { ...body, imageUrl: normalizeBannerImageUrl(body.imageUrl) };
  return bannerRequest(() =>
    id
      ? api.put<BannerResponse<Banner>>(`/staff/banners/${encodeURIComponent(id)}`, payload)
      : api.post<BannerResponse<Banner>>('/staff/banners', payload),
  );
}

export async function saveBannerOrder(ordered: Banner[]): Promise<Banner[]> {
  const result: Banner[] = [];
  for (const [index, banner] of ordered.entries()) {
    const priority = index + 1;
    if (priority !== banner.priority) {
      await saveBanner(
        {
          title: banner.title,
          imageUrl: banner.imageUrl,
          targetUrl: banner.targetUrl,
          startsAt: banner.startsAt,
          endsAt: banner.endsAt,
          isActive: banner.isActive,
          priority,
        },
        banner.id,
      );
    }
    result.push({ ...banner, priority });
  }
  return result;
}

export async function uploadBannerImage(file: File): Promise<string> {
  if (!/\.(jpe?g|png|webp|gif|svg)$/i.test(file.name)) {
    throw new Error('Vui lòng chọn ảnh JPG, PNG, WEBP, GIF hoặc SVG.');
  }
  if (file.size > 25 * 1024 * 1024) {
    throw new Error('Ảnh không được vượt quá 25MB.');
  }
  const body = new FormData();
  body.append('file', file);
  const result = await bannerRequest(() =>
    api.post<BannerResponse<{ url: string }>>('/media/upload', body),
  );
  if (!result?.url) throw new Error('Máy chủ chưa trả về đường dẫn ảnh banner hợp lệ.');
  return normalizeBannerImageUrl(result.url);
}

export interface EventBannerItem {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
  priority: number;
}

export async function getEventBannersApi(): Promise<EventBannerItem[]> {
  try {
    return await listBanners(true);
  } catch {
    return [];
  }
}
