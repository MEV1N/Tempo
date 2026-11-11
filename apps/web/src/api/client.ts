import { ApiResponse, APP_CONFIG } from '@tempo/shared';

export class ApiError extends Error {
  code: string;
  details?: any;

  constructor(message: string, code = 'API_ERROR', details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});

  // Always send CSRF header for state-changing requests
  if (options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method.toUpperCase())) {
    headers.set(APP_CONFIG.CSRF_HEADER_NAME, '1');
    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include', // Essential for secure HTTP-only cookies
  });

  const contentType = response.headers.get('content-type');
  let data: ApiResponse<T>;

  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    if (!response.ok) {
      throw new ApiError(`Request failed with status ${response.status}`, 'HTTP_ERROR');
    }
    return {} as T;
  }

  if (!response.ok || !data.success) {
    const error = data.error || {
      code: 'REQUEST_FAILED',
      message: `Request failed with status ${response.status}`,
    };
    throw new ApiError(error.message, error.code, error.details);
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
