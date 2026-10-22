import { Role } from '@nexus/types';
import { apiRequest } from './api';
import { getStoredToken, login } from './auth';
import { getMe } from './users';

export interface ProfileChanges {
  fullName: string;
  phoneNumber: string;
  avatarUrl: string;
}

export function validateAvatarFile(file: File): void {
  const extensions: Record<string, RegExp> = {
    'image/jpeg': /\.jpe?g$/i,
    'image/png': /\.png$/i,
    'image/webp': /\.webp$/i,
  };
  if (!extensions[file.type]?.test(file.name))
    throw new Error('Chọn ảnh đại diện định dạng JPG, PNG hoặc WEBP.');
  if (file.size <= 0 || file.size > 25 * 1024 * 1024)
    throw new Error('Ảnh đại diện phải lớn hơn 0 và không quá 25 MB.');
}

const uploadedAvatars = new WeakMap<File, string>();

// The existing profile endpoint accepts these three fields; email and role stay read-only.
export async function updateMyProfile(
  changes: ProfileChanges,
  password: string,
  avatarFile?: File | null,
): Promise<ProfileChanges> {
  if (avatarFile) validateAvatarFile(avatarFile);
  const checkedToken = getStoredToken();
  const assertSession = () => {
    if (!checkedToken || checkedToken !== getStoredToken())
      throw new Error('Phiên đăng nhập đã thay đổi. Vui lòng thử lại.');
  };
  assertSession();
  const current = await getMe();
  assertSession();
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
    assertSession();
    const savedChanges = { ...changes };
    if (avatarFile) {
      let url = uploadedAvatars.get(avatarFile);
      if (!url) {
        const body = new FormData();
        body.append('file', avatarFile);
        const result = await apiRequest<{ url: string }>('/media/upload', {
          method: 'POST',
          body,
          isFormData: true,
          requireAuth: true,
        });
        if (!result?.url || !/^https?:\/\/\S+$/i.test(result.url))
          throw new Error('Máy chủ chưa trả về đường dẫn ảnh hợp lệ. Vui lòng thử lại.');
        url = result.url;
        uploadedAvatars.set(avatarFile, url);
      }
      savedChanges.avatarUrl = url;
    }
    assertSession();
    await apiRequest('/buyer/profile', { method: 'PATCH', body: savedChanges, requireAuth: true });
    assertSession();
    window.dispatchEvent(new Event('nexus:profile-change'));
    return savedChanges;
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
