import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Role } from '@nexus/contracts';
import {
  clearAuthSession,
  getStoredToken,
  getStoredUser,
  saveAuthSession,
} from '@/features/auth/services/auth';
import { getMe, toggleSellerMode } from '@/features/account/services/users';
import { mergeGuestCartAfterLogin, resetCartSync } from '@/features/cart/services/cart';
import { syncGuestWishlist } from '@/features/wishlist/services/wishlist.service';
import type { AuthUser, UserProfile } from '@/features/account/types/user.types';
import { useToast } from '../components/ToastNotification';
import { useAuthStore } from '../stores/useAuthStore';

const ACTIVE_MODE_PREFIX = 'nexus:active-mode:';

export function getStoredActiveMode(userId?: string | null): 'SELLER' | 'BUYER' | null {
  if (!userId) return null;
  try {
    const val = localStorage.getItem(`${ACTIVE_MODE_PREFIX}${userId}`);
    if (val === 'SELLER' || val === 'BUYER') return val;
  } catch {
    // Ignore storage error
  }
  return null;
}

export function setStoredActiveMode(
  userId: string | undefined | null,
  mode: 'SELLER' | 'BUYER',
): void {
  if (!userId) return;
  try {
    localStorage.setItem(`${ACTIVE_MODE_PREFIX}${userId}`, mode);
  } catch {
    // Ignore storage error
  }
}

function applyModeOverride(profile: UserProfile): UserProfile {
  if (profile.role !== Role.SELLER) {
    return {
      ...profile,
      isSellerActive: false,
      currentMode: 'BUYER',
    };
  }
  const storedMode = getStoredActiveMode(profile.id);
  const onSellerRoute =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/seller');
  const onBuyerRoute =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/buyer');

  let effectiveMode: 'SELLER' | 'BUYER';
  if (onSellerRoute) {
    effectiveMode = 'SELLER';
  } else if (onBuyerRoute && storedMode === 'BUYER') {
    effectiveMode = 'BUYER';
  } else if (storedMode) {
    effectiveMode = storedMode;
  } else {
    effectiveMode = profile.isSellerActive ? 'SELLER' : 'BUYER';
  }
  setStoredActiveMode(profile.id, effectiveMode);

  const isSellerActive = Boolean(profile.isSellerActive && !profile.isShopSuspended);
  const currentMode = isSellerActive ? effectiveMode : 'BUYER';

  return {
    ...profile,
    isSellerActive,
    currentMode,
  };
}

export interface AuthContextType {
  user: UserProfile | null;
  storedUser: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isSeller: boolean;
  activeMode: 'SELLER' | 'BUYER';
  switchActiveMode: (mode: 'SELLER' | 'BUYER') => Promise<void>;
  login: (user: AuthUser, accessToken?: string, refreshToken?: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<UserProfile | null>;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [storedUser, setStoredUser] = useState<AuthUser | null>(() => getStoredUser());
  const [user, setUserState] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(getStoredToken()));

  // Trigger login toast notification if queued from OAuth login redirect
  useEffect(() => {
    try {
      const pendingToastName = sessionStorage.getItem('nexus:login-toast');
      if (pendingToastName) {
        sessionStorage.removeItem('nexus:login-toast');
        toast.success(`Đăng nhập thành công! Chào mừng ${pendingToastName} quay trở lại.`);
      }
    } catch {
      // Ignore storage errors
    }
  }, [toast]);

  const inFlightPromiseRef = useRef<{ token: string; promise: Promise<UserProfile | null> } | null>(
    null,
  );
  const revision = useRef(0);
  const sessionToken = useRef(token);
  const cartOwner = useRef(token ? getStoredUser()?.id || token : null);
  const cartInitialized = useRef(false);

  const setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>> = useCallback(
    (updater) => {
      setUserState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (!next) return null;
        if (next.role === Role.SELLER) {
          const desiredMode =
            next.currentMode === 'BUYER' || !next.isSellerActive ? 'BUYER' : 'SELLER';
          setStoredActiveMode(next.id, desiredMode);
          return {
            ...next,
            isSellerActive: desiredMode === 'SELLER' && !next.isShopSuspended,
            currentMode: desiredMode,
          };
        }
        return next;
      });
    },
    [],
  );

  const switchActiveMode = useCallback(async (mode: 'SELLER' | 'BUYER'): Promise<void> => {
    const wantSeller = mode === 'SELLER';
    const res = await toggleSellerMode(wantSeller);
    setUserState((prev) => {
      if (!prev) return prev;
      const finalActive = res?.isSellerActive ?? (wantSeller && !prev.isShopSuspended);
      const finalMode = finalActive ? 'SELLER' : 'BUYER';
      setStoredActiveMode(prev.id, finalMode);
      return {
        ...prev,
        isSellerActive: finalActive,
        currentMode: finalMode,
      };
    });
  }, []);

  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      revision.current++;
      inFlightPromiseRef.current = null;
      setUserState(null);
      setIsLoading(false);
      return null;
    }

    if (inFlightPromiseRef.current?.token === currentToken) {
      return inFlightPromiseRef.current.promise;
    }
    const current = ++revision.current;
    const isCurrent = () => current === revision.current && currentToken === getStoredToken();
    const promise = (async () => {
      try {
        const rawProfile = await getMe();
        if (!isCurrent()) return null;
        const profile = applyModeOverride(rawProfile);
        setUserState(profile);
        return profile;
      } catch (error) {
        console.warn('[AuthContext] Không thể lấy thông tin profile người dùng:', error);
        return null;
      } finally {
        if (isCurrent()) setIsLoading(false);
        if (current === revision.current) inFlightPromiseRef.current = null;
      }
    })();

    inFlightPromiseRef.current = { token: currentToken, promise };
    return promise;
  }, []);

  useEffect(() => {
    const handleAuthChange = () => {
      const nextToken = getStoredToken();
      const nextStoredUser = getStoredUser();
      const nextCartOwner = nextToken ? nextStoredUser?.id || nextToken : null;
      const cartOwnerChanged = cartOwner.current !== nextCartOwner;
      if (cartOwnerChanged) {
        cartOwner.current = nextCartOwner;
        resetCartSync();
      }
      if (sessionToken.current !== nextToken) {
        revision.current++;
        inFlightPromiseRef.current = null;
        sessionToken.current = nextToken;
        setUserState(null);
        setIsLoading(Boolean(nextToken));
      }
      setToken(nextToken);
      setStoredUser(nextStoredUser);

      if (nextToken) {
        void refreshProfile();
        if (cartOwnerChanged || !cartInitialized.current) {
          cartInitialized.current = true;
          void mergeGuestCartAfterLogin();
          // A guest's saved products are kept in this browser because they have
          // nowhere else to live; once there is an account they belong to it.
          void syncGuestWishlist().catch((error: unknown) => {
            console.error('Unable to hand the guest wishlist to the account:', error);
          });
        }
      } else {
        cartInitialized.current = false;
        revision.current++;
        inFlightPromiseRef.current = null;
        setUserState(null);
        setIsLoading(false);
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith('nexus:auth-')) handleAuthChange();
    };
    window.addEventListener('nexus:auth-change', handleAuthChange);
    window.addEventListener('storage', handleStorage);
    handleAuthChange();
    return () => {
      window.removeEventListener('nexus:auth-change', handleAuthChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [refreshProfile]);

  const login = useCallback(
    async (authUser: AuthUser, accessToken?: string, refreshToken?: string) => {
      saveAuthSession(authUser, accessToken, refreshToken);
      setToken(accessToken || getStoredToken());
      setStoredUser(authUser);
      await refreshProfile();
      if (authUser.role !== Role.SUPPORT_STAFF && authUser.role !== Role.ADMIN) {
        await mergeGuestCartAfterLogin();
      }
    },
    [refreshProfile],
  );

  const logout = useCallback(() => {
    clearAuthSession();
    setToken(null);
    setStoredUser(null);
    setUserState(null);
    setIsLoading(false);
  }, []);

  const role = user?.role || storedUser?.role;
  const isAdmin = role === Role.ADMIN;
  const isStaff = role === Role.SUPPORT_STAFF || role === Role.ADMIN;
  const isSeller = role === Role.SELLER;
  const activeMode: 'SELLER' | 'BUYER' =
    isSeller && user?.isSellerActive && user?.currentMode === 'SELLER' ? 'SELLER' : 'BUYER';
  const isAuthenticated = Boolean(token && (user || storedUser));

  useEffect(() => {
    useAuthStore.getState().setSession({ user, storedUser, token });
    useAuthStore.getState().setLoading(isLoading);
  }, [user, storedUser, token, isLoading]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      storedUser,
      token,
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
    }),
    [
      user,
      storedUser,
      token,
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
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
