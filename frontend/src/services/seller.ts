import { Role } from '@nexus/types';
import i18n from '../i18n';
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
    throw new SellerSessionError(i18n.t('errors:services.sellerAuthRequired'), 401);
  }

  try {
    const profile = await getMe();
    if (!profile || typeof profile.id !== 'string') {
      throw new Error(i18n.t('errors:services.invalidSellerProfile'));
    }
    if (profile.role !== Role.SELLER) {
      throw new SellerSessionError(i18n.t('errors:services.sellerForbidden'), 403);
    }
    return profile;
  } catch (error) {
    if (error instanceof SellerSessionError) {
      throw error;
    }
    if (error instanceof ApiRequestError) {
      if (error.status === 401) {
        throw new SellerSessionError(i18n.t('errors:sessionExpired'), 401);
      }
      throw new SellerSessionError(
        error.message || i18n.t('errors:services.sellerProfileLoadFailed'),
        error.status,
      );
    }
    throw new Error(error instanceof Error ? error.message : i18n.t('errors:network'));
  }
}
