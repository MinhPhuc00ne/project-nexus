import { create } from 'zustand';
import type { AuthUser, UserProfile } from '../types/user.types';

export interface AuthStoreState {
  user: UserProfile | null;
  storedUser: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  setSession: (payload: {
    user?: UserProfile | null;
    storedUser?: AuthUser | null;
    token?: string | null;
  }) => void;
  setProfile: (user: UserProfile | null) => void;
  setLoading: (isLoading: boolean) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: null,
  storedUser: null,
  token: null,
  isLoading: false,
  setSession: ({ user, storedUser, token }) =>
    set((state) => ({
      user: user !== undefined ? user : state.user,
      storedUser: storedUser !== undefined ? storedUser : state.storedUser,
      token: token !== undefined ? token : state.token,
    })),
  setProfile: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  clearSession: () => set({ user: null, storedUser: null, token: null, isLoading: false }),
}));
