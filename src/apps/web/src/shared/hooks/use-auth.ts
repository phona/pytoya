import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/shared/stores/auth';
import apiClient from '@/api/client';

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

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      return response.data;
    },
    onSuccess: ({ user: nextUser, token: nextToken }) => {
      setAuth(nextUser, nextToken);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await apiClient.post<AuthResponse>('/auth/register', {
        username: data.username,
        password: data.password,
      });
      return response.data;
    },
    onSuccess: ({ user: nextUser, token: nextToken }) => {
      setAuth(nextUser, nextToken);
    },
  });

  const login = async (credentials: LoginCredentials) => {
    const { user: nextUser } = await loginMutation.mutateAsync(credentials);
    return nextUser;
  };

  const register = async (data: RegisterData) => {
    const { user: nextUser } = await registerMutation.mutateAsync(data);
    return nextUser;
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
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
  };
}




