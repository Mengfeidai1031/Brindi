import { create } from 'zustand';

/** Espejo en cliente del usuario público que devuelve la API (sin datos sensibles). */
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  locale: string;
  paymentLink: string | null;
  createdAt: string;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: PublicUser | null;
  /** Access token en memoria únicamente (nunca en localStorage): se rehidrata
   *  al cargar la app vía /auth/refresh usando la cookie httpOnly. */
  accessToken: string | null;
  status: AuthStatus;
  setSession: (user: PublicUser, accessToken: string) => void;
  setUser: (user: PublicUser) => void;
  setUnauthenticated: () => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  status: 'loading',
  setSession: (user, accessToken) => set({ user, accessToken, status: 'authenticated' }),
  setUser: (user) => set({ user }),
  setUnauthenticated: () => set({ user: null, accessToken: null, status: 'unauthenticated' }),
  clear: () => set({ user: null, accessToken: null, status: 'unauthenticated' }),
}));
