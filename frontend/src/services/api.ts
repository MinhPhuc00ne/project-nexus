import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import i18n from '../i18n';
import { normalizeLanguage } from '../i18n/config';
import { getApiErrorMessage, getApiErrorMessages } from '../lib/apiErrors';
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

/**
 * A failed call to the API.
 *
 * The status is kept so callers can tell a lost session (401) from a refusal
 * (403) from a server fault, and `0` means the request never reached the
 * server — there is no HTTP status for "the network is down", and callers that
 * retry need to know the difference.
 *
 * `messages` is the backend's list as it sent it. Most callers want one line
 * and read `message`; the few that render a field-by-field list (registration)
 * need them apart.
 */
export class ApiRequestError extends Error {
  readonly messages: string[];

  constructor(
    message: string,
    public readonly status: number,
    messages?: string[],
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.messages = messages?.length ? messages : [message];
  }
}

/** Options for how a response is unwrapped. */
export interface UnwrapOptions {
  /**
   * The response is `{ data: { data: T } }` rather than `{ data: T }`.
   *
   * Some endpoints answer with a page object that itself carries `data`.
   */
  nested?: boolean;
  /** Shown when the backend sends no message of its own. */
  fallbackMessage?: string;
}

/**
 * Calls the API, returns the payload, and throws `ApiRequestError` on failure.
 *
 * Six services each had their own version of this — unwrap the envelope, then
 * pick a message out of the error body — and the six disagreed: two threw a
 * plain `Error` for a network failure where the others threw `ApiRequestError`
 * with a status of 0, one reported `errors` joined and another preferred
 * `message`, and only some of them left a cancelled request alone. A component
 * therefore could not tell from a caught error what it was holding.
 *
 * A cancelled request is rethrown untouched: it is not a failure, and turning
 * it into one makes every aborted navigation look like an error to the user.
 *
 * @param config - The request, as Axios describes it.
 * @param options - How to unwrap the response and what to say on failure.
 * @returns The payload inside the response envelope.
 */
export async function request<T>(
  config: AxiosRequestConfig,
  options: UnwrapOptions = {},
): Promise<T> {
  try {
    const response = await api.request<unknown>(config);
    return unwrapEnvelope<T>(response.data, options.nested);
  } catch (error) {
    throw toApiRequestError(error, options.fallbackMessage);
  }
}

/**
 * Takes the payload out of the backend's response envelope.
 *
 * Every endpoint answers `{ statusCode, message, data, ... }`, but a few
 * handlers return the payload bare, so a response without `data` is passed
 * through rather than turned into undefined.
 *
 * @param body - The parsed response body.
 * @param nested - Whether the payload is one level deeper.
 * @returns The payload.
 */
export function unwrapEnvelope<T>(body: unknown, nested = false): T {
  if (!body || typeof body !== 'object' || !('data' in body)) return body as T;
  const inner = (body as { data: unknown }).data;
  if (!nested) return inner as T;
  if (inner && typeof inner === 'object' && 'data' in inner) {
    return (inner as { data: unknown }).data as T;
  }
  return inner as T;
}

/**
 * Turns whatever Axios threw into one error type.
 *
 * @param error - The caught value.
 * @param fallbackMessage - Shown when the backend sends no message.
 * @returns An `ApiRequestError`, or the original value when it is not from Axios.
 */
export function toApiRequestError(error: unknown, fallbackMessage?: string): unknown {
  if (!axios.isAxiosError(error)) return error;
  // An aborted request is not a failure; it is a navigation the user made.
  if (error.code === 'ERR_CANCELED') return error;
  if (!error.response) {
    return new ApiRequestError(i18n.t('errors:network'), 0);
  }
  const payload = error.response.data;
  const list = getApiErrorMessages(payload);
  return new ApiRequestError(
    getApiErrorMessage(payload, fallbackMessage),
    error.response.status,
    list,
  );
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

/**
 * Calls the API by path, for callers that want the common case.
 *
 * @param path - The endpoint, with or without a leading slash.
 * @param options - Method, body, and whether a token is required up front.
 * @returns The payload inside the response envelope.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, isFormData = false, requireAuth = false } = options;
  const headers: Record<string, string> = {};

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  // The interceptor attaches the token; this only decides whether to try at all.
  if (requireAuth && !getStoredToken()) {
    throw new Error(i18n.t('errors:authRequired'));
  }

  return request<T>({
    url: path.startsWith('/') ? path : `/${path}`,
    method,
    headers,
    data: body,
    timeout: 30000,
  });
}

// Export để các service dùng chung cấu hình Axios.
export default api;
