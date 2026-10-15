const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');

interface ApiResponse<T> {
  data: T;
  message: string;
  errors?: string[];
}

export interface AuthMessage {
  message: string;
  email?: string;
  devOtpCode?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role?: string;
  avatarUrl?: string | null;
}

export interface LoginResponse extends AuthMessage {
  accessToken?: string;
  refreshToken?: string;
  user: AuthUser;
}

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
    window.dispatchEvent(new Event('nexus:auth-change'));
    if (storedRefreshToken) {
      void fetch(`${apiUrl}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      }).catch(() => {});
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
  if (!rawUser) return null;

  try {
    const parsed = JSON.parse(rawUser) as Partial<AuthUser>;
    if (parsed && typeof parsed.id === 'string' && typeof parsed.email === 'string') {
      const user: AuthUser = {
        id: parsed.id,
        email: parsed.email,
        fullName: parsed.fullName || parsed.email,
        role: parsed.role,
        avatarUrl: parsed.avatarUrl ?? null,
      };
      saveAuthSession(user, token || undefined, refreshToken || undefined);

      params.delete('user');
      params.delete('token');
      params.delete('refreshToken');
      const remainingQuery = params.toString();
      const nextUrl = `${window.location.pathname}${remainingQuery ? `?${remainingQuery}` : ''}${window.location.hash}`;
      window.history.replaceState(null, '', nextUrl);
      return user;
    }
  } catch {
    /* Ignore malformed query parameter */
  }
  return null;
}

async function post<T>(path: string, body: object): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error('Không thể kết nối máy chủ. Vui lòng thử lại.');
  }
  let payload: ApiResponse<T>;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new Error('Máy chủ trả về dữ liệu không hợp lệ.');
  }
  if (!payload || typeof payload !== 'object') {
    throw new Error('Máy chủ trả về dữ liệu không hợp lệ.');
  }
  if (!response.ok) {
    const errors = Array.isArray(payload.errors)
      ? payload.errors.filter((error): error is string => typeof error === 'string').join(' · ')
      : '';
    throw new Error(
      errors || (typeof payload.message === 'string' && payload.message) || 'Yêu cầu thất bại.',
    );
  }
  if (!('data' in payload) || !payload.data || typeof payload.data !== 'object') {
    throw new Error('Máy chủ trả về dữ liệu không hợp lệ.');
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
  window.location.assign(`${apiUrl}/auth/google`);
}
