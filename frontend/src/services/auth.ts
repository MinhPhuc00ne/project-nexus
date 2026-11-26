import i18n from '../i18n';
import api, { API_BASE_URL, ApiRequestError, request } from './api';
import type { AuthMessage, AuthUser, LoginResponse } from '../types/user.types';

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

/**
 * Finishes a Google sign-in from the `?code=` the callback redirected with.
 *
 * The callback used to redirect with the session itself in the query string —
 * `?user={...}&token=...&refreshToken=...` — and this read it from there. A URL
 * is the least private place to put a credential: it is kept in browser
 * history, written to any proxy or server log along the way, and handed to the
 * next site the visitor clicks through to in the `Referer` header. A refresh
 * token travelling that way outlives the session it belongs to.
 *
 * The backend has answered `POST /auth/oauth/exchange` all along: the redirect
 * carries an opaque code, good once and for sixty seconds, and the tokens come
 * back in the response body. This asks for them, and strips the code from the
 * address bar either way so a reload cannot try to spend it twice.
 *
 * @returns The signed-in account, or null when there was no code or it failed.
 */
export async function consumeOAuthCallbackFromUrl(): Promise<AuthUser | null> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code')?.trim();
  if (!code) return null;

  try {
    const handoff = await request<{
      accessToken: string;
      refreshToken: string;
      user: Partial<AuthUser> | null;
    }>({ url: '/auth/oauth/exchange', method: 'POST', data: { code } });

    const account = handoff.user;
    if (
      !handoff.accessToken ||
      !account ||
      typeof account.id !== 'string' ||
      typeof account.email !== 'string'
    ) {
      return null;
    }

    const user: AuthUser = {
      id: account.id,
      email: account.email,
      fullName: account.fullName || account.email,
      role: account.role,
      avatarUrl: account.avatarUrl ?? null,
    };
    saveAuthSession(user, handoff.accessToken, handoff.refreshToken);
    return user;
  } catch (error) {
    // A code that was already spent, or expired, is not worth interrupting the
    // page for: the visitor simply is not signed in.
    console.warn('Could not complete the Google sign-in:', error);
    return null;
  } finally {
    params.delete('code');
    const remainingQuery = params.toString();
    const nextUrl = `${window.location.pathname}${remainingQuery ? `?${remainingQuery}` : ''}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  }
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

/**
 * Posts to an auth endpoint.
 *
 * Registration and email verification are the two flows whose errors are shown
 * field by field, so they keep the backend's list of messages apart in a
 * `RegistrationError`; everywhere else one line is what the screen shows.
 *
 * @param path - The endpoint under `/auth`.
 * @param body - What to send.
 * @returns The payload inside the response envelope.
 */
async function post<T>(path: string, body: object): Promise<T> {
  const needsFieldErrors = path === 'register' || path === 'verify-email';
  try {
    const payload = await request<T>({ url: `/auth/${path}`, method: 'POST', data: body });
    if (payload === undefined || payload === null) {
      throw new Error(
        i18n.t('errors:services.unexpectedEmptyResponse', {
          defaultValue: 'Unexpected empty response from server.',
        }),
      );
    }
    return payload;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      if (needsFieldErrors && error.status > 0) {
        throw new RegistrationError(error.messages, error.status);
      }
      throw new Error(error.message);
    }
    throw error;
  }
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
    throw new Error(i18n.t('errors:services.missingRefreshToken'));
  }
  return post('refresh', { refreshToken: currentRefreshToken });
}

export function startGoogleLogin(): void {
  window.location.assign(`${API_BASE_URL}/auth/google`);
}
