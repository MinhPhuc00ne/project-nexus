import { Role } from '@nexus/types';
import { apiRequest } from './api';
import { getStoredToken, login } from './auth';
import { getMe } from './users';

export interface ProfileChanges {
  fullName: string;
  phoneNumber: string;
  avatarUrl: string;
}

// The existing profile endpoint accepts these three fields; email and role stay read-only.
export async function updateMyProfile(changes: ProfileChanges, password: string): Promise<void> {
  const current = await getMe();
  const checkedToken = getStoredToken();
  if (current.role !== Role.BUYER && current.role !== Role.SELLER) {
    throw new Error('Chỉ Buyer và Seller được sửa hồ sơ cá nhân.');
  }
  let verificationToken: string | undefined;
  try {
    if (current.role === Role.SELLER) {
      if (!password) throw new Error('Nhập mật khẩu hiện tại để xác minh người bán.');
      const verified = await login(current.email, password);
      verificationToken = verified.refreshToken;
      if (verified.user.id !== current.id || verified.user.role !== Role.SELLER) {
        throw new Error('Tài khoản xác minh không khớp với người bán hiện tại.');
      }
    }
    if (!checkedToken || checkedToken !== getStoredToken())
      throw new Error('Phiên đăng nhập đã thay đổi. Vui lòng thử lại.');
    await apiRequest('/buyer/profile', { method: 'PATCH', body: changes, requireAuth: true });
    window.dispatchEvent(new Event('nexus:profile-change'));
  } finally {
    // Reauthentication must not replace the current session or leave an extra session active.
    if (verificationToken) {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: { refreshToken: verificationToken },
      }).catch(() => undefined);
    }
  }
}
