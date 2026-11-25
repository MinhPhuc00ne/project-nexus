import axios, { type AxiosError } from 'axios';
import i18n from '../i18n';
import { normalizeLanguage } from '../i18n/config';
import { getApiErrorMessage } from '../lib/apiErrors';
import {
  clearAuthSession,
  getStoredRefreshToken,
  getStoredToken,
  getStoredUser,
  saveAuthSession,
} from './auth';

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'
).replace(/\/$/, '');

const api = axios.create({
  // Base API endpoint configured via frontend/.env (defaults to http://localhost:3000/api/v1).
  baseURL: API_BASE_URL,
  // Chờ tối đa 20 giây; đây không phải thời hạn của mã OTP.
  timeout: 20000,
});

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  isFormData?: boolean;
  requireAuth?: boolean;
}

// Giữ mã HTTP để nơi gọi phân biệt hết phiên (401), cấm truy cập (403) và lỗi máy chủ.
export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

// Request Interceptor: Tự động đính kèm Bearer token từ getStoredToken() nếu chưa có
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['Accept-Language'] = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  return config;
});

// Response Interceptor: Tự động refresh token khi nhận HTTP 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      (typeof error.config & { _retry?: boolean }) | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      const storedRefreshToken = getStoredRefreshToken();
      if (!storedRefreshToken) {
        clearAuthSession();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post<{
          data: { accessToken: string; refreshToken?: string };
        }>(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken: storedRefreshToken },
          { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
        );

        const newTokens = refreshResponse.data?.data;
        if (!newTokens?.accessToken) {
          throw new Error('Refresh token invalid');
        }

        const currentUser = getStoredUser();
        if (currentUser) {
          saveAuthSession(currentUser, newTokens.accessToken, newTokens.refreshToken);
        } else {
          try {
            localStorage.setItem('nexus:auth-token', newTokens.accessToken);
            if (newTokens.refreshToken) {
              localStorage.setItem('nexus:auth-refresh-token', newTokens.refreshToken);
            }
          } catch {
            /* Storage disabled */
          }
        }

        processQueue(null, newTokens.accessToken);
        originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearAuthSession();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, isFormData = false, requireAuth = false } = options;
  const headers: Record<string, string> = {};

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (requireAuth) {
    throw new Error(i18n.t('errors:authRequired'));
  }

  const endpoint = path.startsWith('/') ? path : `/${path}`;

  interface ApiResponsePayload {
    data?: unknown;
    errors?: unknown[];
    message?: unknown;
    [key: string]: unknown;
  }

  try {
    const response = await api.request<ApiResponsePayload>({
      url: endpoint,
      method,
      headers,
      data: body,
      timeout: 30000,
    });

    const payload = response.data;
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return payload.data as T;
    }

    return payload as unknown as T;
  } catch (error) {
    if (axios.isAxiosError<ApiResponsePayload>(error)) {
      if (!error.response) {
        throw new Error(i18n.t('errors:network'));
      }
      const payload = error.response.data;
      const errorMsg = getApiErrorMessage(payload);
      throw new ApiRequestError(errorMsg, error.response.status);
    }
    throw error;
  }
}

// Export để các service dùng chung cấu hình Axios.
export default api;
