import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api';
import {
  clearAuthSession,
  consumeOAuthCallbackFromUrl,
  getStoredRefreshToken,
  getStoredToken,
  getStoredUser,
  RegistrationError,
  saveAuthSession,
} from '../auth';

describe('auth service session helpers', () => {
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

  it('consumes valid OAuth callback query params and strips them from URL', () => {
    const userParam = encodeURIComponent(
      JSON.stringify({ id: 'u-oauth', email: 'oauth@nexus.test', fullName: 'OAuth User' }),
    );
    window.history.replaceState(
      null,
      '',
      `/login?user=${userParam}&token=tok-oauth&refreshToken=ref-oauth&next=/buyer`,
    );

    const consumed = consumeOAuthCallbackFromUrl();
    expect(consumed?.id).toBe('u-oauth');
    expect(getStoredToken()).toBe('tok-oauth');
    expect(getStoredRefreshToken()).toBe('ref-oauth');
    expect(window.location.search).toBe('?next=%2Fbuyer');
  });

  it('cleans up malformed OAuth callback query params and returns null', () => {
    window.history.replaceState(null, '', '/login?user=not-json&token=tok&refreshToken=ref');
    expect(consumeOAuthCallbackFromUrl()).toBeNull();
    expect(window.location.search).toBe('');
  });

  it('preserves messages array on RegistrationError', () => {
    const err = new RegistrationError(['Email exists', 'Weak password']);
    expect(err.name).toBe('RegistrationError');
    expect(err.message).toBe('Email exists · Weak password');
    expect(err.messages).toEqual(['Email exists', 'Weak password']);
  });
});
