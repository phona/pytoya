import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/shared/stores/auth';

// Normalize API URL to ensure it ends with /api
const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const API_BASE_URL = rawApiUrl.endsWith('/api')
  ? rawApiUrl
  : `${rawApiUrl}/api`;

export const SOCKET_IO_PATH = '/api/socket.io';

const normalizeSocketIoBaseUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  // socket.io expects an http(s) base URL even if it upgrades to websocket.
  if (trimmed.startsWith('ws://')) return `http://${trimmed.slice('ws://'.length)}`;
  if (trimmed.startsWith('wss://')) return `https://${trimmed.slice('wss://'.length)}`;
  return trimmed;
};

const defaultOrigin =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'http://localhost:3001';

const WS_ORIGIN = (() => {
  const candidate = normalizeSocketIoBaseUrl(import.meta.env.VITE_WS_URL || rawApiUrl);
  try {
    return new URL(candidate, defaultOrigin).origin;
  } catch {
    return defaultOrigin;
  }
})();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export { WS_ORIGIN };

export const getApiErrorMessage = (
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string => {
  if (axios.isAxiosError(error)) {
    const message =
      error.response?.data?.error?.message ||
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

type ApiErrorEnvelope = {
  error?: {
    code?: unknown;
    message?: unknown;
    requestId?: unknown;
    params?: unknown;
    details?: unknown;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getApiErrorEnvelope = (value: unknown): ApiErrorEnvelope['error'] | null => {
  if (!isRecord(value)) {
    return null;
  }
  const error = value.error;
  if (!isRecord(error)) {
    return null;
  }
  return error;
};

export const getApiErrorInfo = (
  error: unknown,
): {
  code?: string;
  message?: string;
  requestId?: string;
  params?: Record<string, unknown>;
  details?: unknown;
} => {
  if (!axios.isAxiosError(error)) {
    return {};
  }

  const envelope = getApiErrorEnvelope(error.response?.data);
  if (!envelope) {
    return {};
  }

  return {
    code: typeof envelope.code === 'string' ? envelope.code : undefined,
    message: typeof envelope.message === 'string' ? envelope.message : undefined,
    requestId: typeof envelope.requestId === 'string' ? envelope.requestId : undefined,
    params: isRecord(envelope.params) ? envelope.params : undefined,
    details: envelope.details,
  };
};

export const getApiErrorText = (
  error: unknown,
  t: (key: string, vars?: Record<string, unknown>) => string,
  options?: { fallbackKey?: string },
): string => {
  const fallbackKey = options?.fallbackKey ?? 'errors.generic';
  const info = getApiErrorInfo(error);

  const withRequestId = (message: string) => {
    if (!info.requestId) {
      return message;
    }
    const formatted = t('errors.withRequestId', {
      message,
      requestId: info.requestId,
    });
    if (formatted.startsWith('__MISSING:')) {
      return `${message} (Request ID: ${info.requestId})`;
    }
    return formatted;
  };

  if (info.code) {
    const key = `errors.${info.code}`;
    const translated = t(key, info.params);
    if (!translated.startsWith('__MISSING:')) {
      return withRequestId(translated);
    }
  }

  if (info.message) {
    return withRequestId(info.message);
  }

  return withRequestId(t(fallbackKey));
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
      const code = isRecord(error.response?.data)
        ? (error.response?.data as { error?: { code?: unknown } }).error?.code
        : undefined;
      const shouldLogout = code === 'AUTH_MISSING_TOKEN' || code === 'AUTH_INVALID_TOKEN';

      if (shouldLogout) {
        useAuthStore.getState().clearAuth();
        const nextUrl = `${window.location.pathname}${window.location.search}`;
        const loginPath = '/login';
        if (window.location.pathname !== loginPath) {
          // Avoid hard navigation in tests; unit tests should not depend on jsdom navigation.
          if (import.meta.env.MODE !== 'test') {
            window.location.href = `${loginPath}?next_url=${encodeURIComponent(nextUrl)}`;
          }
        }
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;




