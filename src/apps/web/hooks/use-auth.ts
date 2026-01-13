import { useAuthStore } from '@/lib/auth-store';
import apiClient from '@/lib/api-client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: {
    id: number;
    email: string;
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
      email: data.email,
      password: data.password,
    });
    const { user, token } = response.data;
    setAuth(user, token);
    return user;
  };

  const logout = () => {
    clearAuth();
    window.location.href = '/login';
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
