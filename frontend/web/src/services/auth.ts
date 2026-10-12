const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');

interface ApiResponse<T> {
  data: T;
  message: string;
  errors?: string[];
}

export interface AuthMessage {
  message: string;
  email?: string;
}

export interface LoginResponse extends AuthMessage {
  user: { id: string; email: string; fullName: string; role: string };
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
    payload = await response.json() as ApiResponse<T>;
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
    throw new Error(errors || (typeof payload.message === 'string' && payload.message) || 'Yêu cầu thất bại.');
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

export function startGoogleLogin(): void {
  window.location.assign(`${apiUrl}/auth/google`);
}
