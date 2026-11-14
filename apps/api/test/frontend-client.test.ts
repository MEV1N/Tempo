import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  apiRequest,
  ApiError,
  resolveApiUrl,
  getApiBaseUrl,
  isLocalhostUrl,
} from '../../../apps/web/src/api/client';

describe('Frontend API Client (client.ts) Hardening & Error Handling', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('1. resolveApiUrl handles relative URLs and custom VITE_API_URL cleanly', () => {
    expect(resolveApiUrl('http://external.com/api')).toBe('http://external.com/api');
    expect(resolveApiUrl('https://external.com/api')).toBe('https://external.com/api');
  });

  it('1b. isLocalhostUrl accurately detects localhost and loopback addresses', () => {
    expect(isLocalhostUrl('http://localhost:5000')).toBe(true);
    expect(isLocalhostUrl('http://127.0.0.1:5000')).toBe(true);
    expect(isLocalhostUrl('https://localhost:3000')).toBe(true);
    expect(isLocalhostUrl('localhost:5000')).toBe(true);
    expect(isLocalhostUrl('/api')).toBe(false);
    expect(isLocalhostUrl('https://api.tempo.app')).toBe(false);
  });

  it('1c. getApiBaseUrl and resolveApiUrl enforce production defaults and discard stale localhost', () => {
    // Save original env
    const origProd = import.meta.env.PROD;
    const origUrl = import.meta.env.VITE_API_URL;

    try {
      // Simulate Production with stale localhost
      (import.meta.env as any).PROD = true;
      (import.meta.env as any).VITE_API_URL = 'http://localhost:5000';

      expect(getApiBaseUrl()).toBe('/api');
      expect(resolveApiUrl('/api/auth/me')).toBe('/api/auth/me');
      expect(resolveApiUrl('/api/auth/login')).toBe('/api/auth/login');
      expect(resolveApiUrl('/auth/me')).toBe('/api/auth/me');
      expect(resolveApiUrl('/health')).toBe('/health');

      // Simulate Production with custom remote API domain
      (import.meta.env as any).VITE_API_URL = 'https://api.tempo.app';
      expect(getApiBaseUrl()).toBe('https://api.tempo.app/api');
      expect(resolveApiUrl('/api/auth/me')).toBe('https://api.tempo.app/api/auth/me');

      // Simulate Development
      (import.meta.env as any).PROD = false;
      (import.meta.env as any).VITE_API_URL = '';
      expect(getApiBaseUrl()).toBe('http://localhost:5000/api');
      expect(resolveApiUrl('/api/auth/me')).toBe('http://localhost:5000/api/auth/me');
      expect(resolveApiUrl('/api/auth/login')).toBe('http://localhost:5000/api/auth/login');
      expect(resolveApiUrl('/auth/me')).toBe('http://localhost:5000/api/auth/me');
      expect(resolveApiUrl('/health')).toBe('http://localhost:5000/health');
    } finally {
      (import.meta.env as any).PROD = origProd;
      (import.meta.env as any).VITE_API_URL = origUrl;
    }
  });

  it('2. Successfully returns data for 200 OK JSON responses', async () => {
    const mockData = {
      success: true,
      data: {
        user: { id: 'usr-1', email: 'user@tempo.app', name: 'Tempo User' },
        preference: { timezone: 'Asia/Kolkata' },
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@tempo.app', password: 'Password123!' }),
    });

    expect(result).toEqual(mockData.data);
  });

  it('3. Handles HTTP 400 Validation Errors with appropriate message and status', async () => {
    const errorBody = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid email address',
        details: [{ field: 'email', message: 'Invalid email address' }],
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify(errorBody), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(apiRequest('/api/auth/login', { method: 'POST' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid email address',
    });
  });

  it('4. Handles HTTP 401 Invalid Credentials with appropriate message and status', async () => {
    const errorBody = {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify(errorBody), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(apiRequest('/api/auth/login', { method: 'POST' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    });
  });

  it('5. Handles HTTP 403 Forbidden / CSRF error with appropriate message and status', async () => {
    const errorBody = {
      success: false,
      error: {
        code: 'CSRF_INVALID_ORIGIN',
        message: 'Cross-site request forgery protection: Invalid origin',
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify(errorBody), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(apiRequest('/api/tasks', { method: 'POST' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      code: 'CSRF_INVALID_ORIGIN',
      message: 'Cross-site request forgery protection: Invalid origin',
    });
  });

  it('6. Handles HTTP 500 Internal Server Error cleanly', async () => {
    const errorBody = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected authentication error occurred.',
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify(errorBody), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(apiRequest('/api/auth/login', { method: 'POST' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected authentication error occurred.',
    });
  });

  it('7. Handles HTTP 503 Database Unavailable with appropriate message and status', async () => {
    const errorBody = {
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database service is temporarily unavailable. Please try again shortly.',
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify(errorBody), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(apiRequest('/api/auth/login', { method: 'POST' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
      code: 'DATABASE_UNAVAILABLE',
      message: 'Database service is temporarily unavailable. Please try again shortly.',
    });
  });

  it('8. Catches network failures (TypeError: Failed to fetch / offline / unreachable server) and throws distinguishable ApiError', async () => {
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));

    try {
      await apiRequest('/api/auth/login', { method: 'POST' });
      expect.fail('Should have thrown network ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.code).toBe('NETWORK_ERROR');
      expect(err.status).toBe(0);
      expect(err.message).toContain('Unable to connect to Tempo server');
    }
  });

  it('9. Handles non-JSON HTML error responses (e.g. gateway 502/504 / proxy failure) without throwing JSON parse error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response('<html><body>502 Bad Gateway</body></html>', {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      })
    );

    try {
      await apiRequest('/api/auth/login', { method: 'POST' });
      expect.fail('Should have thrown ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(502);
      expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      expect(err.message).toContain('An unexpected server error occurred');
    }
  });

  it('10. Automatically attaches CSRF headers and Content-Type for mutation requests', async () => {
    let capturedHeaders: Headers | null = null;
    let capturedCredentials: RequestCredentials | null = null;

    globalThis.fetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      capturedHeaders = new Headers(init.headers);
      capturedCredentials = init.credentials || null;
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: { ok: true } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@tempo.app', password: 'Password123!' }),
    });

    expect(capturedHeaders).not.toBeNull();
    expect(capturedHeaders!.get('x-tempo-csrf')).toBe('1');
    expect(capturedHeaders!.get('Content-Type')).toBe('application/json');
    expect(capturedCredentials).toBe('include');
  });
});
