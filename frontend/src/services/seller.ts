import { Role } from '@nexus/types';
import { ApiRequestError } from './api';
import { getStoredToken } from './auth';
import { getMe, type UserProfile } from './users';

export class SellerSessionError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'SellerSessionError';
  }
}

// /users/me reads the current role from the database, rather than trusting local storage.
export async function getSellerSession(): Promise<UserProfile> {
  const token = getStoredToken();
  if (!token) {
    throw new SellerSessionError('Vui lòng đăng nhập để vào trang người bán.', 401);
  }

  try {
    const profile = await getMe();
    if (!profile || typeof profile.id !== 'string') {
      throw new Error('Hồ sơ người bán không hợp lệ.');
    }
    if (profile.role !== Role.SELLER) {
      throw new SellerSessionError('Tài khoản không có quyền người bán.', 403);
    }
    return profile;
  } catch (error) {
    if (error instanceof SellerSessionError) {
      throw error;
    }
    if (error instanceof ApiRequestError) {
      if (error.status === 401) {
        throw new SellerSessionError('Phiên đăng nhập đã hết hạn.', 401);
      }
      throw new SellerSessionError(error.message || 'Không thể tải hồ sơ người bán.', error.status);
    }
    throw new Error(
      error instanceof Error ? error.message : 'Không thể kết nối máy chủ. Vui lòng thử lại.',
    );
  }
}
