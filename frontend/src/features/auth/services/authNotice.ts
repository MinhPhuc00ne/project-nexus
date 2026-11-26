const PASSWORD_CHANGED_KEY = 'nexus:password-changed';
let passwordChanged = false;

export function markPasswordChanged(): void {
  passwordChanged = true;
  try {
    sessionStorage.setItem(PASSWORD_CHANGED_KEY, '1');
  } catch {
    /* Keep the in-memory notice when storage is disabled. */
  }
}

export function hasPasswordChangedNotice(): boolean {
  if (passwordChanged) return true;
  try {
    return sessionStorage.getItem(PASSWORD_CHANGED_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearPasswordChangedNotice(): void {
  passwordChanged = false;
  try {
    sessionStorage.removeItem(PASSWORD_CHANGED_KEY);
  } catch {
    /* Storage may be disabled. */
  }
}
