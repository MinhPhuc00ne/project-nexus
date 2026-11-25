import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearPasswordChangedNotice,
  hasPasswordChangedNotice,
  markPasswordChanged,
} from '../authNotice';

describe('authNotice', () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearPasswordChangedNotice();
  });

  it('tracks password changed state in memory and sessionStorage', () => {
    expect(hasPasswordChangedNotice()).toBe(false);

    markPasswordChanged();
    expect(hasPasswordChangedNotice()).toBe(true);
    expect(sessionStorage.getItem('nexus:password-changed')).toBe('1');

    clearPasswordChangedNotice();
    expect(hasPasswordChangedNotice()).toBe(false);
    expect(sessionStorage.getItem('nexus:password-changed')).toBeNull();
  });

  it('reads notice from sessionStorage when already persisted', () => {
    sessionStorage.setItem('nexus:password-changed', '1');
    expect(hasPasswordChangedNotice()).toBe(true);
  });
});
