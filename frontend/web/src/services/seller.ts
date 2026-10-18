import { API_BASE_URL } from './api';
import { getStoredToken } from './auth';
import type { UserProfile } from './users';

export class SellerSessionError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

// /users/me reads the current role from the database, rather than trusting local storage.
export async function getSellerSession(): Promise<UserProfile> {
  const token = getStoredToken();
  if (!token) throw new SellerSessionError('Vui lòng đăng nhập để vào trang người bán.', 401);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error('Không thể kết nối máy chủ. Vui lòng thử lại.');
  }
  if (response.status === 401) throw new SellerSessionError('Phiên đăng nhập đã hết hạn.', 401);
  if (!response.ok) throw new SellerSessionError('Không thể tải hồ sơ người bán.', response.status);
  const payload = (await response.json()) as { data: UserProfile };
  if (!payload.data || typeof payload.data.id !== 'string')
    throw new Error('Hồ sơ người bán không hợp lệ.');
  if (payload.data.role !== 'SELLER')
    throw new SellerSessionError('Tài khoản không có quyền người bán.', 403);
  return payload.data;
}
