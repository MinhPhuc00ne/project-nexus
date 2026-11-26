import i18n from '@/i18n';
import { apiRequest } from '@/services/api';
import { getStoredToken } from '@/features/auth/services/auth';

const pending = new Map<string, Promise<unknown>>();

/** Share concurrent reads only within the same authenticated session. */
export function getSellerResource<T>(path: string): Promise<T> {
  const token = getStoredToken();
  if (!token) return Promise.reject(new Error(i18n.t('errors:services.loginToContinue')));
  const key = JSON.stringify([token, path]);
  const existing = pending.get(key);
  if (existing) return existing as Promise<T>;
  const request = apiRequest<T>(path, { requireAuth: true }).finally(() => {
    if (pending.get(key) === request) pending.delete(key);
  });
  pending.set(key, request);
  return request;
}
