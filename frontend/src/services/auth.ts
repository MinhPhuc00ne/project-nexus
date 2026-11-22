import axios from 'axios';
import type { ApiResponse } from '@nexus/types';
import i18n from '../i18n';
import api, { API_BASE_URL } from './api';
import type { AuthMessage, AuthUser, LoginResponse } from '../types/user.types';
import { getApiErrorMessage, getApiErrorMessages } from '../lib/apiErrors';

export type { AuthMessage, AuthUser, LoginResponse };

const AUTH_USER_KEY = 'nexus:auth-user';
const AUTH_TOKEN_KEY = 'nexus:auth-token';
const AUTH_REFRESH_TOKEN_KEY = 'nexus:auth-refresh-token';

export function saveAuthSession(user: AuthUser, accessToken?: string, refreshToken?: string): void {
  try {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    if (accessToken) {
      localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
    }
    if (refreshToken) {
      localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
    }
    window.dispatchEvent(new Event('nexus:auth-change'));
  } catch {
    /* Storage may be disabled */
  }
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (parsed && typeof parsed.id === 'string' && typeof parsed.email === 'string') {
      return {
        id: parsed.id,
        email: parsed.email,
        fullName: parsed.fullName || parsed.email,
        role: parsed.role,
        avatarUrl: parsed.avatarUrl ?? null,
      };
    }
  } catch {
    /* Ignore invalid storage data */
  }
  return null;
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearAuthSession(): void {
  try {
    const storedRefreshToken = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    localStorage.removeItem('nexus:auth-cart-cache');
    localStorage.removeItem('nexus:auth-cart-owner');
    localStorage.removeItem('nexus:cart-selected-ids');
    window.dispatchEvent(new Event('nexus:auth-change'));
    window.dispatchEvent(new CustomEvent('nexus:cart-change'));
    if (storedRefreshToken) {
      void api.post('/auth/logout', { refreshToken: storedRefreshToken }).catch(() => {});
    }
  } catch {
    /* Storage may be disabled */
  }
}

export function consumeOAuthCallbackFromUrl(): AuthUser | null {
  const params = new URLSearchParams(window.location.search);
  const rawUser = params.get('user');
  const token = params.get('token');
  const refreshToken = params.get('refreshToken');
  if (!params.has('user') && !params.has('token') && !params.has('refreshToken')) return null;

  try {
    if (!rawUser || !token?.trim() || !refreshToken?.trim()) return null;
    const parsed = JSON.parse(rawUser) as Partial<AuthUser>;
    if (parsed && typeof parsed.id === 'string' && typeof parsed.email === 'string') {
      const user: AuthUser = {
        id: parsed.id,
        email: parsed.email,
        fullName: parsed.fullName || parsed.email,
        role: parsed.role,
        avatarUrl: parsed.avatarUrl ?? null,
      };
      saveAuthSession(user, token, refreshToken);
      return user;
    }
  } catch {
    /* Ignore malformed query parameter */
  } finally {
    params.delete('user');
    params.delete('token');
    params.delete('refreshToken');
    const remainingQuery = params.toString();
    const nextUrl = `${window.location.pathname}${remainingQuery ? `?${remainingQuery}` : ''}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  }
  return null;
}

export class RegistrationError extends Error {
  constructor(
    public readonly messages: string[],
    public readonly status: number,
  ) {
    super(messages.join(' · '));
    this.name = 'RegistrationError';
  }
}

async function post<T>(path: string, body: object): Promise<T> {
  let response;
  try {
    response = await api.post<ApiResponse<T>>(`/auth/${path}`, body);
  } catch (error) {
    if (axios.isAxiosError<ApiResponse<T> & { errors?: unknown }>(error)) {
      const payload = error.response?.data;
      // Chỉ xử lý thêm lỗi validation cho luồng đăng ký và xác thực tài khoản.
      if (path === 'register' || path === 'verify-email') {
        if (!error.response) {
          throw new Error(i18n.t('errors:network'));
        }
        const messages = getApiErrorMessages(payload);
        throw new RegistrationError(
          messages.length ? messages : [i18n.t('errors:default')],
          error.response.status,
        );
      }
      throw new Error(
        getApiErrorMessage(
          payload,
          error.response ? i18n.t('errors:default') : i18n.t('errors:network'),
        ),
      );
    }
    throw new Error(i18n.t('errors:network'));
  }

  const payload = response.data;
  if (!payload || typeof payload !== 'object' || !('data' in payload) || !payload.data) {
    throw new Error(i18n.t('errors:services.invalidAuctionLotData'));
  }
  return payload.data;
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return post('login', { email, password });
}

export function register(email: string, password: string, fullName: string): Promise<AuthMessage> {
  return post('register', { email, password, fullName });
}

export function verifyEmail(email: string, code: string): Promise<AuthMessage> {
  return post('verify-email', { email, code });
}

export function forgotPassword(
  email: string,
): Promise<{ message: string; email: string; devOtpCode?: string }> {
  return post('forgot-password', { email });
}

export function resetPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<{ message: string }> {
  return post('reset-password', { email, code, newPassword });
}

export function refreshToken(): Promise<{ accessToken: string; refreshToken: string }> {
  const currentRefreshToken = getStoredRefreshToken();
  if (!currentRefreshToken) {
    throw new Error('Không tìm thấy refresh token.');
  }
  return post('refresh', { refreshToken: currentRefreshToken });
}

export function startGoogleLogin(): void {
  window.location.assign(`${API_BASE_URL}/auth/google`);
}
