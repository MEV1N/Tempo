import { ApiResponse, APP_CONFIG } from '@tempo/shared';

export class ApiError extends Error {
  code: string;
  status: number;
  details?: any;

  constructor(message: string, code = 'API_ERROR', status = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isLocalhostUrl(url: string): boolean {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)(:\d+)?/i.test(url.trim());
}

export function isProductionEnvironment(): boolean {
  return Boolean(import.meta.env.PROD);
}

export function getApiBaseUrl(): string {
  if (import.meta.env.PROD) {
    const rawEnv = (import.meta.env.VITE_API_URL as string)?.trim() || '';
    // In production, default to relative '/api'.
    // If VITE_API_URL is set to a stale localhost/loopback address, safely discard it.
    if (!rawEnv || isLocalhostUrl(rawEnv)) {
      return '/api';
    }

    const clean = rawEnv.replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  // Local development
  const rawEnv = (import.meta.env.VITE_API_URL as string)?.trim() || '';
  if (rawEnv) {
    const clean = rawEnv.replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }

  const port = 5000;
  const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  const proto = typeof window !== 'undefined' && window.location.protocol ? window.location.protocol : 'http:';
  return `${proto}//${host}:${port}/api`;
}

export function resolveApiUrl(endpoint: string): string {
  if (!endpoint) {
    return getApiBaseUrl();
  }

  // Preserve external/absolute URLs
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }

  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // If endpoint is already prefixed with `/api`
  if (cleanEndpoint === '/api' || cleanEndpoint.startsWith('/api/')) {
    if (baseUrl === '/api') {
      return cleanEndpoint;
    }
    if (baseUrl.endsWith('/api')) {
      const origin = baseUrl.slice(0, -4);
      return `${origin}${cleanEndpoint}`;
    }
    return `${baseUrl.replace(/\/api$/, '')}${cleanEndpoint}`;
  }

  // Special-case root health check
  if (cleanEndpoint === '/health') {
    if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
      try {
        const parsed = new URL(baseUrl);
        return `${parsed.origin}/health`;
      } catch {
        // Fallback
      }
    }
    return '/health';
  }

  // Endpoint without `/api/` prefix
  const cleanBase = baseUrl.replace(/\/+$/, '');
  return `${cleanBase}${cleanEndpoint}`;
}

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = resolveApiUrl(endpoint);
  const headers = new Headers(options.headers || {});

  // Always send CSRF header for state-changing requests
  if (options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method.toUpperCase())) {
    headers.set(APP_CONFIG.CSRF_HEADER_NAME, '1');
    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json');
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Essential for secure HTTP-only cookies
    });
  } catch (networkError: any) {
    // Network failure, connection refused, offline, or CORS network drop
    throw new ApiError(
      'Unable to connect to Tempo server. Please verify the API server is running or check your connection.',
      'NETWORK_ERROR',
      0,
      networkError
    );
  }

  const contentType = response.headers.get('content-type') || '';
  let data: ApiResponse<T> | null = null;

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok || !data || !data.success) {
    let code = data?.error?.code || 'REQUEST_FAILED';
    let message = data?.error?.message;

    if (!message) {
      if (response.status === 400) {
        code = 'VALIDATION_ERROR';
        message = 'Invalid request data. Please check your inputs.';
      } else if (response.status === 401) {
        code = 'UNAUTHORIZED';
        message = 'Invalid email or password.';
      } else if (response.status === 403) {
        code = 'FORBIDDEN';
        message = 'Access forbidden or CSRF validation failed.';
      } else if (response.status === 404) {
        code = 'NOT_FOUND';
        message = 'The requested resource was not found.';
      } else if (response.status === 429) {
        code = 'RATE_LIMIT_EXCEEDED';
        message = 'Too many requests. Please wait a few moments and try again.';
      } else if (response.status === 503) {
        code = 'DATABASE_UNAVAILABLE';
        message = 'Service temporarily unavailable. Please try again shortly.';
      } else if (response.status >= 500) {
        code = 'INTERNAL_SERVER_ERROR';
        message = 'An unexpected server error occurred. Please try again.';
      } else {
        message = `Request failed with status ${response.status}`;
      }
    }

    throw new ApiError(message, code, response.status, data?.error?.details);
  }

  return data.data as T;
}

// Google Auth & Calendar Client Endpoints (Phase 7)
export const googleApi = {
  getAuthUrl: (action: 'login' | 'link' = 'login') =>
    apiRequest<{ url: string; state: string }>(`/api/auth/google?action=${action}`),

  setPassword: (password: string) =>
    apiRequest<{ message: string }>('/api/auth/google/set-password', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  unlinkGoogle: () =>
    apiRequest<{ message: string }>('/api/auth/google/unlink', {
      method: 'DELETE',
    }),

  getCalendarConnectUrl: () =>
    apiRequest<{ url: string; state: string }>('/api/google-calendar/connect'),

  getCalendarStatus: () =>
    apiRequest<import('@tempo/shared').GoogleCalendarStatusDTO>('/api/google-calendar/status'),

  syncCalendar: (forceFullSync = false) =>
    apiRequest<{ message: string; importedCount: number; deletedCount: number }>(
      '/api/google-calendar/sync',
      {
        method: 'POST',
        body: JSON.stringify({ forceFullSync }),
      }
    ),

  disconnectCalendar: () =>
    apiRequest<{ message: string }>('/api/google-calendar/disconnect', {
      method: 'POST',
    }),
};
