import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import api, { apiRequest, ApiRequestError } from '../api';
import { getStoredToken, saveAuthSession } from '../auth';

function makeAxiosError(
  status: number,
  config: InternalAxiosRequestConfig,
  data: unknown = { message: 'Error' },
): AxiosError {
  return new AxiosError('Request failed', String(status), config, undefined, {
    status,
    statusText: 'Error',
    headers: {},
    config,
    data,
  });
}

describe('api client & interceptors', () => {
  const originalAdapter = api.defaults.adapter;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
  });

  it('throws when requireAuth is true and no token exists', async () => {
    await expect(apiRequest('/commerce/cart', { requireAuth: true })).rejects.toThrow();
  });

  it('attaches Bearer token, Accept-Language, Content-Type and unwraps data envelope', async () => {
    saveAuthSession({ id: 'u-1', email: 'u@nexus.test', fullName: 'User' }, 'tok-123', 'ref-123');
    await i18n.changeLanguage('en');

    let capturedConfig: InternalAxiosRequestConfig | undefined;
    const adapter: AxiosAdapter = async (config) => {
      capturedConfig = config;
      return {
        data: { data: { ok: true } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };
    api.defaults.adapter = adapter;

    const result = await apiRequest<{ ok: boolean }>('orders/123', {
      method: 'POST',
      body: { a: 1 },
    });

    expect(result).toEqual({ ok: true });
    expect(capturedConfig?.url).toBe('/orders/123');
    expect(capturedConfig?.headers.Authorization).toBe('Bearer tok-123');
    expect(capturedConfig?.headers['Accept-Language']).toBe('en');
    expect(capturedConfig?.headers['Content-Type']).toBe('application/json');
  });

  it('omits Content-Type when isFormData is true and maps HTTP errors to ApiRequestError', async () => {
    let capturedHeaders: Record<string, unknown> | undefined;
    api.defaults.adapter = async (config) => {
      capturedHeaders = config.headers as Record<string, unknown>;
      throw makeAxiosError(422, config, { message: 'Invalid payload' });
    };

    await expect(
      apiRequest('/media/upload', { method: 'POST', body: new FormData(), isFormData: true }),
    ).rejects.toBeInstanceOf(ApiRequestError);

    expect(capturedHeaders?.['Content-Type']).not.toBe('application/json');
  });

  it('throws network error message when AxiosError has no response', async () => {
    api.defaults.adapter = async (config) => {
      throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    };

    await expect(apiRequest('/health')).rejects.toThrow(i18n.t('errors:network'));
  });

  it('refreshes token on 401 and deduplicates concurrent queued requests', async () => {
    saveAuthSession(
      { id: 'u-1', email: 'u@nexus.test', fullName: 'User' },
      'expired-tok',
      'valid-refresh',
    );

    let callCount = 0;
    api.defaults.adapter = async (config) => {
      callCount += 1;
      if (config.headers.Authorization === 'Bearer expired-tok') {
        throw makeAxiosError(401, config, { message: 'Unauthorized' });
      }
      return {
        data: { data: { callCount, auth: config.headers.Authorization } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { data: { accessToken: 'fresh-tok', refreshToken: 'fresh-ref' } },
    });

    const [res1, res2] = await Promise.all([
      apiRequest<{ auth: string }>('/users/me'),
      apiRequest<{ auth: string }>('/commerce/cart'),
    ]);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(res1.auth).toBe('Bearer fresh-tok');
    expect(res2.auth).toBe('Bearer fresh-tok');
    expect(getStoredToken()).toBe('fresh-tok');
  });

  it('clears auth session and rejects queued requests when refresh fails', async () => {
    saveAuthSession(
      { id: 'u-1', email: 'u@nexus.test', fullName: 'User' },
      'expired-tok',
      'bad-refresh',
    );

    api.defaults.adapter = async (config) => {
      if (config.url === '/auth/logout') {
        return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
      }
      throw makeAxiosError(401, config, { message: 'Unauthorized' });
    };

    vi.spyOn(axios, 'post').mockRejectedValue(new Error('Refresh failed'));

    await expect(apiRequest('/users/me')).rejects.toThrow('Refresh failed');
    expect(getStoredToken()).toBeNull();
  });
});
