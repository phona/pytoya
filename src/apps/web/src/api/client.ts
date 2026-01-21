import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/shared/stores/auth';

// Normalize API URL to ensure it ends with /api
const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE_URL = rawApiUrl.endsWith('/api')
  ? rawApiUrl
  : `${rawApiUrl}/api`;

// Derive WebSocket base URL by stripping /api suffix
const normalizeSocketIoBaseUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  // socket.io expects an http(s) base URL even if it upgrades to websocket.
  if (trimmed.startsWith('ws://')) return `http://${trimmed.slice('ws://'.length)}`;
  if (trimmed.startsWith('wss://')) return `https://${trimmed.slice('wss://'.length)}`;
  return trimmed;
};

const WS_BASE_URL = normalizeSocketIoBaseUrl(
  import.meta.env.VITE_WS_URL ||
    (rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl),
);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export { WS_BASE_URL };

export const getApiErrorMessage = (
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string => {
  if (axios.isAxiosError(error)) {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.response?.statusText;
    if (message && typeof message === 'string') {
      return message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      const nextUrl = `${window.location.pathname}${window.location.search}`;
      if (window.location.pathname !== '/login') {
        window.location.href = `/login?next_url=${encodeURIComponent(nextUrl)}`;
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;




