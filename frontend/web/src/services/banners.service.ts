import api from './api';

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
    const response = await api.get<{
      statusCode?: number;
      message?: string;
      data?: EventBannerItem[];
    }>('/catalog/banners');

    const payload = response?.data;
    if (Array.isArray(payload)) return payload as EventBannerItem[];
    if (payload && Array.isArray(payload.data)) return payload.data;
    return [];
  } catch {
    return [];
  }
}

