import { Role } from '@nexus/types';
import i18n from '../i18n';
import { apiRequest } from './api';
import { getStoredToken } from './auth';
import { getMe } from './users';

export interface ProfileChanges {
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
}

export interface BankProfileChanges {
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
}

export function validateAvatarFile(file: File): void {
  const extensions: Record<string, RegExp> = {
    'image/jpeg': /\.jpe?g$/i,
    'image/png': /\.png$/i,
    'image/webp': /\.webp$/i,
  };
  if (!extensions[file.type]?.test(file.name))
    throw new Error(i18n.t('errors:services.avatarInvalidFormat'));
  if (file.size <= 0 || file.size > 25 * 1024 * 1024)
    throw new Error(i18n.t('errors:services.avatarTooLarge25'));
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
export async function updateMyProfile<T extends ProfileChanges & BankProfileChanges>(
  changes: T,
  password: string,
  avatarFile?: File | null,
): Promise<T> {
  if (avatarFile) validateAvatarFile(avatarFile);
  const checkedToken = getStoredToken();
  const assertSession = () => {
    if (!checkedToken || checkedToken !== getStoredToken())
      throw new Error(i18n.t('errors:services.sessionChanged'));
  };
  assertSession();
  const current = await getMe();
  assertSession();
  if (current.role !== Role.BUYER && current.role !== Role.SELLER) {
    throw new Error(i18n.t('errors:services.profileRoleRestricted'));
  }

  let verificationToken: string | undefined;
  if (current.role === Role.SELLER) {
    if (!password) throw new Error(i18n.t('errors:services.sellerPasswordRequired'));
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
        throw new Error(i18n.t('errors:services.invalidImageUrl'));
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
