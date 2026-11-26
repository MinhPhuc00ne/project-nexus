import { AxiosError, type AxiosAdapter } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/services/api';
import {
  clearAuthSession,
  consumeOAuthCallbackFromUrl,
  getStoredRefreshToken,
  getStoredToken,
  getStoredUser,
  RegistrationError,
  saveAuthSession,
} from '@/features/auth/services/auth';

describe('auth service session helpers', () => {
  const originalAdapter = api.defaults.adapter;

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
  });

  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
  });

  it('saves, reads, and clears auth session and dispatches change events', () => {
    const authEvents: Event[] = [];
    const cartEvents: Event[] = [];
    window.addEventListener('nexus:auth-change', (e) => authEvents.push(e));
    window.addEventListener('nexus:cart-change', (e) => cartEvents.push(e));
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: {} });

    saveAuthSession(
      { id: 'u-1', email: 'buyer@nexus.test', fullName: 'Buyer One', role: 'BUYER' },
      'access-1',
      'refresh-1',
    );

    expect(getStoredUser()).toEqual({
      id: 'u-1',
      email: 'buyer@nexus.test',
      fullName: 'Buyer One',
      role: 'BUYER',
      avatarUrl: null,
    });
    expect(getStoredToken()).toBe('access-1');
    expect(getStoredRefreshToken()).toBe('refresh-1');
    expect(authEvents).toHaveLength(1);

    clearAuthSession();

    expect(getStoredUser()).toBeNull();
    expect(getStoredToken()).toBeNull();
    expect(getStoredRefreshToken()).toBeNull();
    expect(authEvents).toHaveLength(2);
    expect(cartEvents).toHaveLength(1);
    expect(postSpy).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'refresh-1' });
  });

  it('returns null when stored user JSON is malformed or missing required fields', () => {
    localStorage.setItem('nexus:auth-user', '{bad-json');
    expect(getStoredUser()).toBeNull();

    localStorage.setItem('nexus:auth-user', JSON.stringify({ id: 'u-1' }));
    expect(getStoredUser()).toBeNull();
  });

  it('exchanges the one-time code for a session and strips it from the URL', async () => {
    // The callback used to redirect with the session in the query string:
    // `?user={...}&token=...&refreshToken=...`. A URL is the least private
    // place for a credential — browser history, proxy logs, the Referer header
    // handed to the next site clicked — and a refresh token sent that way
    // outlives the session it belongs to. The backend answers an exchange
    // endpoint instead, and the redirect carries a code good once.
    const sent: Array<{ url?: string; data?: unknown }> = [];
    api.defaults.adapter = (async (config) => {
      sent.push({ url: config.url, data: config.data });
      return {
        data: {
          data: {
            accessToken: 'tok-oauth',
            refreshToken: 'ref-oauth',
            user: { id: 'u-oauth', email: 'oauth@nexus.test', fullName: 'OAuth User' },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }) as AxiosAdapter;

    window.history.replaceState(null, '', '/login?code=one-time-code&next=/buyer');

    const consumed = await consumeOAuthCallbackFromUrl();

    expect(consumed?.id).toBe('u-oauth');
    expect(getStoredToken()).toBe('tok-oauth');
    expect(getStoredRefreshToken()).toBe('ref-oauth');
    expect(sent[0].url).toBe('/auth/oauth/exchange');
    expect(JSON.parse(String(sent[0].data))).toEqual({ code: 'one-time-code' });
    // The code is spent, so it must not survive a reload.
    expect(window.location.search).toBe('?next=%2Fbuyer');
  });

  it('signs nobody in when the code was already spent, and still strips it', async () => {
    api.defaults.adapter = (async (config) => {
      throw new AxiosError('Unauthorized', '401', config, undefined, {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
        data: { message: 'Mã đăng nhập không hợp lệ hoặc đã hết hạn.' },
      });
    }) as AxiosAdapter;

    window.history.replaceState(null, '', '/login?code=already-used');

    expect(await consumeOAuthCallbackFromUrl()).toBeNull();
    expect(getStoredToken()).toBeNull();
    expect(window.location.search).toBe('');
  });

  it('asks the server nothing when the address carries no code', async () => {
    let called = false;
    api.defaults.adapter = (async (config) => {
      called = true;
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    }) as AxiosAdapter;

    window.history.replaceState(null, '', '/login?next=/buyer');

    expect(await consumeOAuthCallbackFromUrl()).toBeNull();
    expect(called).toBe(false);
    // An address with no code is left exactly as it was.
    expect(window.location.search).toBe('?next=/buyer');
  });

  it('preserves messages array on RegistrationError', () => {
    const err = new RegistrationError(['Email exists', 'Weak password'], 400);
    expect(err.name).toBe('RegistrationError');
    expect(err.status).toBe(400);
    expect(err.message).toBe('Email exists · Weak password');
    expect(err.messages).toEqual(['Email exists', 'Weak password']);
  });
});
