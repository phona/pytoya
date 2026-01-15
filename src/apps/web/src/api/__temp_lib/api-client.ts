import axios, { AxiosError } from 'axios';
import { useAuthStore } from './auth-store';

// Normalize API URL to ensure it ends with /api
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_BASE_URL = rawApiUrl.endsWith('/api')
  ? rawApiUrl
  : `${rawApiUrl}/api`;

// Derive WebSocket base URL by stripping /api suffix
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL ||
  (rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export { WS_BASE_URL };

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
