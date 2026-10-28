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
import { Role } from '@nexus/types';
import { clearAuthSession, getStoredToken, getStoredUser, saveAuthSession } from '../services/auth';
import { getMe } from '../services/users';
import { mergeGuestCartAfterLogin, resetCartSync } from '../services/cart';
import type { AuthUser, UserProfile } from '../types/user.types';

export interface AuthContextType {
  user: UserProfile | null;
  storedUser: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isSeller: boolean;
  login: (user: AuthUser, accessToken?: string, refreshToken?: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<UserProfile | null>;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [storedUser, setStoredUser] = useState<AuthUser | null>(() => getStoredUser());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(getStoredToken()));

  const inFlightPromiseRef = useRef<{ token: string; promise: Promise<UserProfile | null> } | null>(
    null,
  );
  const revision = useRef(0);
  const sessionToken = useRef(token);
  const cartOwner = useRef(token ? getStoredUser()?.id || token : null);
  const cartInitialized = useRef(false);

  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      revision.current++;
      inFlightPromiseRef.current = null;
      setUser(null);
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
        const profile = await getMe();
        if (!isCurrent()) return null;
        setUser(profile);
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
        setUser(null);
        setIsLoading(Boolean(nextToken));
      }
      setToken(nextToken);
      setStoredUser(nextStoredUser);

      if (nextToken) {
        void refreshProfile();
        if (cartOwnerChanged || !cartInitialized.current) {
          cartInitialized.current = true;
          void mergeGuestCartAfterLogin();
        }
      } else {
        cartInitialized.current = false;
        revision.current++;
        inFlightPromiseRef.current = null;
        setUser(null);
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
      await mergeGuestCartAfterLogin();
    },
    [refreshProfile],
  );

  const logout = useCallback(() => {
    clearAuthSession();
    setToken(null);
    setStoredUser(null);
    setUser(null);
    setIsLoading(false);
  }, []);

  const role = user?.role || storedUser?.role;
  const isAdmin = role === Role.ADMIN;
  const isStaff = role === Role.SUPPORT_STAFF || role === Role.ADMIN;
  const isSeller = role === Role.SELLER;
  const isAuthenticated = Boolean(token && (user || storedUser));

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
      login,
      logout,
      refreshProfile,
      setProfile: setUser,
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
      login,
      logout,
      refreshProfile,
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
