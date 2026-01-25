import { useAuthStore, type User } from '@/shared/stores/auth';

type PersistedAuthState = {
  state: {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    hasHydrated: boolean;
  };
  version: number;
};

const AUTH_STORAGE_KEY = 'pytoya-auth';

export const clearAuthSession = async () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  useAuthStore.getState().clearAuth();
  await useAuthStore.persist.rehydrate();
};

export const setAuthSession = async (user: User, token: string) => {
  const payload: PersistedAuthState = {
    state: {
      user,
      token,
      isAuthenticated: true,
      hasHydrated: true,
    },
    version: 0,
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
  await useAuthStore.persist.rehydrate();
};

