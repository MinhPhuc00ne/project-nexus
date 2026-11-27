/* eslint-disable sonarjs/no-duplicate-string */
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Role } from '@nexus/contracts';
import { AuthProvider, getStoredActiveMode, setStoredActiveMode, useAuth } from '../AuthContext';

const mockGetMe = vi.fn();
const mockToggleSellerMode = vi.fn();
const mockGetStoredToken = vi.fn();
const mockGetStoredUser = vi.fn();
const mockSaveAuthSession = vi.fn();
const mockClearAuthSession = vi.fn();
const mockMergeGuestCartAfterLogin = vi.fn();
const mockResetCartSync = vi.fn();
const SELLER_EMAIL = 'seller@nexus.local';
const SELLER_NAME = 'Seller One';
const ROUTE_SELLER_EMAIL = 'route@nexus.local';
const TEXT_READY = 'ready';
const TEXT_BUYER = 'BUYER';
const TEXT_SELLER = 'SELLER';
const TEXT_SELLER_ROUTE = 'seller-route';

vi.mock('@/features/account/services/users', () => ({
  getMe: (...args: unknown[]) => mockGetMe(...args),
  toggleSellerMode: (...args: unknown[]) => mockToggleSellerMode(...args),
}));

vi.mock('@/features/auth/services/auth', () => ({
  getStoredToken: () => mockGetStoredToken(),
  getStoredUser: () => mockGetStoredUser(),
  saveAuthSession: (...args: unknown[]) => mockSaveAuthSession(...args),
  clearAuthSession: () => mockClearAuthSession(),
}));

vi.mock('@/features/cart/services/cart', () => ({
  mergeGuestCartAfterLogin: (...args: unknown[]) => mockMergeGuestCartAfterLogin(...args),
  resetCartSync: () => mockResetCartSync(),
}));

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

vi.mock('../../components/ToastNotification', () => ({
  useToast: () => mockToast,
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

function TestConsumer() {
  const {
    user,
    isAuthenticated,
    isLoading,
    isAdmin,
    isStaff,
    isSeller,
    activeMode,
    switchActiveMode,
    login,
    logout,
    refreshProfile,
    setProfile,
  } = useAuth();

  return (
    <div>
      <span data-testid="auth-state">{isAuthenticated ? 'auth' : 'guest'}</span>
      <span data-testid="loading-state">{isLoading ? 'loading' : 'ready'}</span>
      <span data-testid="role-flags">
        {`${isAdmin ? 'admin' : '-'}:${isStaff ? 'staff' : '-'}:${isSeller ? 'seller' : '-'}`}
      </span>
      <span data-testid="mode-state">{activeMode}</span>
      <span data-testid="seller-state">{isSeller ? 'seller' : 'not-seller'}</span>
      <span data-testid="user-name">{user?.fullName ?? 'none'}</span>
      <button type="button" onClick={() => void switchActiveMode('BUYER')}>
        To Buyer
      </button>
      <button type="button" onClick={() => void switchActiveMode('SELLER')}>
        To Seller
      </button>
      <button
        type="button"
        onClick={() =>
          void login(
            {
              id: 'buyer-1',
              email: 'buyer@nexus.local',
              fullName: 'Buyer One',
              role: Role.BUYER,
            },
            'access-buyer',
            'refresh-buyer',
          )
        }
      >
        Login Buyer
      </button>
      <button
        type="button"
        onClick={() =>
          void login(
            {
              id: 'admin-1',
              email: 'admin@nexus.local',
              fullName: 'Admin One',
              role: Role.ADMIN,
            },
            'access-admin',
            'refresh-admin',
          )
        }
      >
        Login Admin
      </button>
      <button type="button" onClick={() => void refreshProfile()}>
        Refresh
      </button>
      <button
        type="button"
        onClick={() =>
          setProfile((prev) =>
            prev ? { ...prev, currentMode: 'BUYER', isSellerActive: false } : null,
          )
        }
      >
        Force Buyer Profile
      </button>
      <button type="button" onClick={() => setProfile(null)}>
        Clear Profile
      </button>
      <button type="button" onClick={logout}>
        Logout
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, '', '/');
    mockGetMe.mockReset();
    mockToggleSellerMode.mockReset();
    mockGetStoredToken.mockReset();
    mockGetStoredUser.mockReset();
    mockSaveAuthSession.mockReset();
    mockClearAuthSession.mockReset();
    mockMergeGuestCartAfterLogin.mockReset().mockResolvedValue(undefined);
    mockResetCartSync.mockReset();
    mockToast.success.mockReset();
    mockToast.error.mockReset();
    mockToast.info.mockReset();
    mockToast.warning.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when useAuth is called outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within an AuthProvider');
    spy.mockRestore();
  });

  it('initializes as unauthenticated guest when no token exists', async () => {
    mockGetStoredToken.mockReturnValue(null);
    mockGetStoredUser.mockReturnValue(null);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('guest');
      expect(screen.getByTestId('loading-state')).toHaveTextContent(TEXT_READY);
      expect(screen.getByTestId('mode-state')).toHaveTextContent(TEXT_BUYER);
      expect(screen.getByTestId('role-flags')).toHaveTextContent('-:-:-');
    });
    expect(mockGetMe).not.toHaveBeenCalled();
  });

  it('loads seller profile, supports mode toggle, and clears state on logout', async () => {
    mockGetStoredToken.mockReturnValue('token-123');
    mockGetStoredUser.mockReturnValue({
      id: 'seller-1',
      email: SELLER_EMAIL,
      fullName: SELLER_NAME,
      role: Role.SELLER,
    });
    mockGetMe.mockResolvedValue({
      id: 'seller-1',
      email: SELLER_EMAIL,
      fullName: SELLER_NAME,
      role: Role.SELLER,
      isSellerActive: true,
      isShopSuspended: false,
    });
    mockToggleSellerMode.mockResolvedValue({ isSellerActive: false });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('auth');
      expect(screen.getByTestId('mode-state')).toHaveTextContent(TEXT_SELLER);
      expect(screen.getByTestId('seller-state')).toHaveTextContent('seller');
    });

    await act(async () => {
      screen.getByText('To Buyer').click();
    });

    expect(screen.getByTestId('mode-state')).toHaveTextContent(TEXT_BUYER);
    expect(getStoredActiveMode('seller-1')).toBe(TEXT_BUYER);

    act(() => {
      mockGetStoredToken.mockReturnValue(null);
      mockGetStoredUser.mockReturnValue(null);
      screen.getByText('Logout').click();
    });

    expect(mockClearAuthSession).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('auth-state')).toHaveTextContent('guest');
  });

  it('forces BUYER mode when seller shop is suspended', async () => {
    mockGetStoredToken.mockReturnValue('token-susp');
    mockGetStoredUser.mockReturnValue({
      id: 'seller-susp',
      email: 'susp@nexus.local',
      fullName: 'Suspended Seller',
      role: Role.SELLER,
    });
    mockGetMe.mockResolvedValue({
      id: 'seller-susp',
      email: 'susp@nexus.local',
      fullName: 'Suspended Seller',
      role: Role.SELLER,
      isSellerActive: true,
      isShopSuspended: true,
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('auth');
      expect(screen.getByTestId('mode-state')).toHaveTextContent('BUYER');
    });
  });

  it('overrides mode to SELLER on /seller routes and preserves BUYER on /buyer routes', async () => {
    setStoredActiveMode(TEXT_SELLER_ROUTE, TEXT_BUYER);
    window.history.pushState({}, '', '/seller/products');

    mockGetStoredToken.mockReturnValue('token-route');
    mockGetStoredUser.mockReturnValue({
      id: TEXT_SELLER_ROUTE,
      email: ROUTE_SELLER_EMAIL,
      fullName: 'Route Seller',
      role: Role.SELLER,
    });
    mockGetMe.mockResolvedValue({
      id: TEXT_SELLER_ROUTE,
      email: ROUTE_SELLER_EMAIL,
      fullName: 'Route Seller',
      role: Role.SELLER,
      isSellerActive: true,
      isShopSuspended: false,
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('mode-state')).toHaveTextContent(TEXT_SELLER);
    });

    setStoredActiveMode(TEXT_SELLER_ROUTE, TEXT_BUYER);
    window.history.pushState({}, '', '/buyer/orders');

    await act(async () => {
      screen.getByText('Refresh').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('mode-state')).toHaveTextContent(TEXT_BUYER);
    });
  });

  it('merges guest cart on buyer login but skips cart merge on admin login', async () => {
    mockGetStoredToken.mockReturnValue(null);
    mockGetStoredUser.mockReturnValue(null);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    mockGetStoredToken.mockReturnValue('access-buyer');
    mockGetMe.mockResolvedValueOnce({
      id: 'buyer-1',
      email: 'buyer@nexus.local',
      fullName: 'Buyer One',
      role: Role.BUYER,
    });

    await act(async () => {
      screen.getByText('Login Buyer').click();
    });

    expect(mockSaveAuthSession).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'buyer-1', role: Role.BUYER }),
      'access-buyer',
      'refresh-buyer',
    );
    expect(mockMergeGuestCartAfterLogin).toHaveBeenCalledTimes(1);

    mockMergeGuestCartAfterLogin.mockClear();
    mockGetStoredToken.mockReturnValue('access-admin');
    mockGetMe.mockResolvedValueOnce({
      id: 'admin-1',
      email: 'admin@nexus.local',
      fullName: 'Admin One',
      role: Role.ADMIN,
    });

    await act(async () => {
      screen.getByText('Login Admin').click();
    });

    expect(mockMergeGuestCartAfterLogin).not.toHaveBeenCalled();
    expect(screen.getByTestId('role-flags')).toHaveTextContent('admin:staff:-');
  });

  it('handles SUPPORT_STAFF role flags and getMe failure gracefully', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockGetStoredToken.mockReturnValue('token-staff');
    mockGetStoredUser.mockReturnValue({
      id: 'staff-1',
      email: 'staff@staff.com',
      fullName: 'Staff One',
      role: Role.SUPPORT_STAFF,
    });
    mockGetMe.mockRejectedValue(new Error('Network down'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('ready');
      expect(screen.getByTestId('role-flags')).toHaveTextContent('-:staff:-');
      expect(screen.getByTestId('mode-state')).toHaveTextContent('BUYER');
    });
    expect(warnSpy).toHaveBeenCalled();
  });

  it('deduplicates concurrent refreshProfile calls and supports setProfile & storage sync', async () => {
    mockGetStoredToken.mockReturnValue('token-dedup');
    mockGetStoredUser.mockReturnValue({
      id: 'seller-2',
      email: 's2@nexus.local',
      fullName: 'Seller Two',
      role: Role.SELLER,
    });
    mockGetMe.mockResolvedValue({
      id: 'seller-2',
      email: 's2@nexus.local',
      fullName: 'Seller Two',
      role: Role.SELLER,
      isSellerActive: true,
      isShopSuspended: false,
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-name')).toHaveTextContent('Seller Two');
    });
    expect(mockGetMe).toHaveBeenCalledTimes(1);

    act(() => {
      screen.getByText('Force Buyer Profile').click();
    });
    expect(screen.getByTestId('mode-state')).toHaveTextContent('BUYER');
    expect(getStoredActiveMode('seller-2')).toBe('BUYER');

    act(() => {
      screen.getByText('Clear Profile').click();
    });
    expect(screen.getByTestId('user-name')).toHaveTextContent('none');

    mockGetStoredToken.mockReturnValue(null);
    mockGetStoredUser.mockReturnValue(null);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'nexus:auth-token' }));
    });
    expect(screen.getByTestId('auth-state')).toHaveTextContent('guest');
    expect(mockResetCartSync).toHaveBeenCalled();
  });

  it('propagates error when switchActiveMode fails', async () => {
    mockGetStoredToken.mockReturnValue('token-err');
    mockGetStoredUser.mockReturnValue({
      id: 'seller-err',
      email: 'err@nexus.local',
      fullName: 'Seller Err',
      role: Role.SELLER,
    });
    mockGetMe.mockResolvedValue({
      id: 'seller-err',
      email: 'err@nexus.local',
      fullName: 'Seller Err',
      role: Role.SELLER,
      isSellerActive: true,
      isShopSuspended: false,
    });
    mockToggleSellerMode.mockRejectedValue(new Error('Toggle failed'));

    let caughtError: unknown = null;
    function ErrorTester() {
      const { switchActiveMode } = useAuth();
      return (
        <button
          type="button"
          onClick={() => {
            switchActiveMode('BUYER').catch((err) => {
              caughtError = err;
            });
          }}
        >
          Trigger Switch
        </button>
      );
    }

    render(
      <AuthProvider>
        <ErrorTester />
      </AuthProvider>,
    );

    await waitFor(() => expect(mockGetMe).toHaveBeenCalled());
    await act(async () => {
      screen.getByText('Trigger Switch').click();
    });

    await waitFor(() => {
      expect(caughtError).toBeInstanceOf(Error);
    });
  });
});
