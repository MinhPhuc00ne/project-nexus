import axios from 'axios';
import { getStoredToken } from './auth';

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'
).replace(/\/$/, '');

const api = axios.create({
  // URL gốc trong frontend/web/.env, ví dụ http://localhost:3000/api/v1.
  // Các service sẽ nối thêm đường dẫn như /auth/register vào URL này.
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
    throw new Error('Vui lòng đăng nhập để thực hiện thao tác này.');
  }

  const endpoint = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  let response;
  try {
    response = await api.request({
      url: endpoint,
      method,
      headers,
      data: body,
      timeout: 30000,
      validateStatus: () => true,
    });
  } catch {
    throw new Error(
      'Không thể kết nối tới máy chủ backend. Vui lòng kiểm tra lại dịch vụ backend.',
    );
  }

  interface ApiResponsePayload {
    data?: unknown;
    errors?: unknown[];
    message?: string;
    [key: string]: unknown;
  }

  let payload: ApiResponsePayload | null = null;
  try {
    payload = response.data as ApiResponsePayload;
    if (!payload || typeof payload !== 'object') throw new Error('Invalid response');
  } catch {
    throw new ApiRequestError('Máy chủ phản hồi định dạng dữ liệu không hợp lệ.', response.status);
  }

  if (response.status < 200 || response.status >= 300) {
    const errorMsg = Array.isArray(payload?.errors)
      ? payload.errors.join(' · ')
      : typeof payload?.message === 'string'
        ? payload.message
        : 'Yêu cầu thất bại.';
    throw new ApiRequestError(errorMsg, response.status);
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T;
  }

  return payload as unknown as T;
}

// Export để các service dùng chung cấu hình Axios.
export default api;
