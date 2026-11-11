import { Role } from '@nexus/types';
import { apiRequest } from './api';
import { getStoredToken } from './auth';
import { getMe } from './users';

export interface ProfileChanges {
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
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

/**
 * Updates user profile details, using the dedicated reauthentication endpoint for seller mode.
 *
 * @param changes Profile fields to update.
 * @param password Current password for seller profile reauthentication.
 * @param avatarFile Optional uploaded image file.
 * @returns Updated profile changes.
 */
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
  if (current.role === Role.SELLER) {
    if (!password) throw new Error('Nhập mật khẩu hiện tại để xác minh người bán.');
    const reauth = await apiRequest<{ verificationToken: string }>('/auth/profile/reauthenticate', {
      method: 'POST',
      body: { password },
      requireAuth: true,
    });
    verificationToken = reauth.verificationToken;
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
  await apiRequest('/buyer/profile', {
    method: 'PATCH',
    body: {
      ...savedChanges,
      ...(verificationToken ? { verificationToken } : password ? { password } : {}),
    },
    requireAuth: true,
  });
  assertSession();
  window.dispatchEvent(new Event('nexus:profile-change'));
  return savedChanges;
}
