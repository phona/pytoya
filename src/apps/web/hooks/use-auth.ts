import { useAuthStore } from '@/lib/auth-store';
import apiClient from '@/lib/api-client';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: {
    id: number;
    username: string;
    role: 'admin' | 'user';
  };
  token: string;
}

export function useAuth() {
  const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore();

  const login = async (credentials: LoginCredentials) => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    const { user, token } = response.data;
    setAuth(user, token);
    return user;
  };

  const register = async (data: RegisterData) => {
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      username: data.username,
      password: data.password,
    });
    const { user, token } = response.data;
    setAuth(user, token);
    return user;
  };

  const logout = () => {
    clearAuth();
    const nextUrl = `${window.location.pathname}${window.location.search}`;
    if (window.location.pathname !== '/login') {
      window.location.href = `/login?next_url=${encodeURIComponent(nextUrl)}`;
    }
  };

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    logout,
  };
}
