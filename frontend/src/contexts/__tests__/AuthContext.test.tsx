import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Role } from '@nexus/types';
import { AuthProvider, useAuth } from '../AuthContext';

const mockGetMe = vi.fn();
const mockToggleSellerMode = vi.fn();
const mockGetStoredToken = vi.fn();
const mockGetStoredUser = vi.fn();
const mockSaveAuthSession = vi.fn();
const mockClearAuthSession = vi.fn();

vi.mock('../../services/users', () => ({
  getMe: (...args: unknown[]) => mockGetMe(...args),
  toggleSellerMode: (...args: unknown[]) => mockToggleSellerMode(...args),
}));

vi.mock('../../services/auth', () => ({
  getStoredToken: () => mockGetStoredToken(),
  getStoredUser: () => mockGetStoredUser(),
  saveAuthSession: (...args: unknown[]) => mockSaveAuthSession(...args),
  clearAuthSession: () => mockClearAuthSession(),
}));

vi.mock('../../services/cart', () => ({
  mergeGuestCartAfterLogin: vi.fn(async () => {}),
  resetCartSync: vi.fn(),
}));

function TestConsumer() {
  const { isAuthenticated, activeMode, isSeller, switchActiveMode, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-state">{isAuthenticated ? 'auth' : 'guest'}</span>
      <span data-testid="mode-state">{activeMode}</span>
      <span data-testid="seller-state">{isSeller ? 'seller' : 'not-seller'}</span>
      <button type="button" onClick={() => void switchActiveMode('BUYER')}>
        To Buyer
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
    mockGetMe.mockReset();
    mockToggleSellerMode.mockReset();
    mockGetStoredToken.mockReset();
    mockGetStoredUser.mockReset();
    mockSaveAuthSession.mockReset();
    mockClearAuthSession.mockReset();
  });

  it('loads seller profile, supports mode toggle, and clears state on logout', async () => {
    mockGetStoredToken.mockReturnValue('token-123');
    mockGetStoredUser.mockReturnValue({
      id: 'seller-1',
      email: 'seller@nexus.local',
      fullName: 'Seller One',
      role: Role.SELLER,
    });
    mockGetMe.mockResolvedValue({
      id: 'seller-1',
      email: 'seller@nexus.local',
      fullName: 'Seller One',
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
      expect(screen.getByTestId('mode-state')).toHaveTextContent('SELLER');
      expect(screen.getByTestId('seller-state')).toHaveTextContent('seller');
    });

    await act(async () => {
      screen.getByText('To Buyer').click();
    });

    expect(screen.getByTestId('mode-state')).toHaveTextContent('BUYER');

    act(() => {
      mockGetStoredToken.mockReturnValue(null);
      mockGetStoredUser.mockReturnValue(null);
      screen.getByText('Logout').click();
    });

    expect(mockClearAuthSession).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('auth-state')).toHaveTextContent('guest');
  });
});
