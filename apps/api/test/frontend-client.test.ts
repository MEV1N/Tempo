import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest, ApiError, resolveApiUrl } from '../../../apps/web/src/api/client';

describe('Frontend API Client (client.ts) Hardening & Error Handling', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('1. resolveApiUrl handles relative URLs and custom VITE_API_URL cleanly', () => {
    // When VITE_API_URL is configured
    const currentBase = import.meta.env?.VITE_API_URL;
    if (currentBase) {
      expect(resolveApiUrl('/api/auth/login')).toBe(
        `${currentBase.replace(/\/+$/, '')}/api/auth/login`
      );
    } else {
      expect(resolveApiUrl('/api/auth/login')).toBe('/api/auth/login');
    }
    expect(resolveApiUrl('http://external.com/api')).toBe('http://external.com/api');
    expect(resolveApiUrl('https://external.com/api')).toBe('https://external.com/api');
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
