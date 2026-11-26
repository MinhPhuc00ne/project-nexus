import { type AxiosRequestConfig } from 'axios';
import i18n from '@/i18n';
import { request } from '@/services/api';
import { getStoredToken } from '@/features/auth/services/auth';

/**
 * Calls a back-office endpoint, refusing early when nobody is signed in.
 *
 * The check is not security — the server decides that — it is so a staff page
 * opened after the session expired says so instead of showing a 401 from every
 * panel on it at once.
 *
 * Unwrapping the response and turning a failure into `ApiRequestError` is the
 * shared client's job; this used to do both itself, slightly differently.
 *
 * @param config - The request, as Axios describes it.
 * @returns The payload inside the response envelope.
 */
export async function adminRequest<T>(config: AxiosRequestConfig): Promise<T> {
  if (!getStoredToken()) throw new Error(i18n.t('errors:authRequired'));
  return request<T>(config);
}
