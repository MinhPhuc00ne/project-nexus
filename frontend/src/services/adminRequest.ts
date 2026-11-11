import axios, { type AxiosRequestConfig } from 'axios';
import api, { ApiRequestError } from './api';
import { getStoredToken } from './auth';

export async function adminRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const token = getStoredToken();
  if (!token) throw new Error('Vui lòng đăng nhập để thực hiện thao tác này.');

  try {
    const response = await api.request<T | { data: T }>({
      ...config,
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = response.data;
    return payload && typeof payload === 'object' && 'data' in payload
      ? payload.data
      : (payload as T);
  } catch (error) {
    if (axios.isAxiosError<{ errors?: string[]; message?: string }>(error)) {
      if (!error.response) {
        throw new Error('Không thể kết nối tới máy chủ backend. Vui lòng thử lại.');
      }
      const payload = error.response.data;
      throw new ApiRequestError(
        payload?.errors?.join(' · ') || payload?.message || 'Yêu cầu thất bại.',
        error.response.status,
      );
    }
    throw error;
  }
}
