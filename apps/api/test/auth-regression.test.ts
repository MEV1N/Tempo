import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import {
  toUserDTO,
  toUserPreferenceDTO,
  DatabaseConnectionError,
  isDatabaseConnectionError,
} from '../src/services/auth.service';
import { requireAuth, optionalAuth } from '../src/middleware/auth';
import { AUTH_COOKIE_NAME } from '../src/config';
import { prisma } from '../src/db';

// Mock DB for isolated failure scenarios
vi.mock('../src/db', () => ({
  prisma: {
    session: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

function createMockReqRes(
  options: {
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
  } = {}
) {
  const req: Partial<Request> = {
    cookies: options.cookies || {},
    headers: options.headers || {},
  };

  let statusCode = 200;
  let jsonResponse: any = null;
  const clearedCookies: string[] = [];

  const res: Partial<Response> = {
    status: vi.fn((code: number) => {
      statusCode = code;
      return res as Response;
    }),
    json: vi.fn((data: any) => {
      jsonResponse = data;
      return res as Response;
    }),
    clearCookie: vi.fn((name: string) => {
      clearedCookies.push(name);
      return res as Response;
    }),
  };

  const next = vi.fn();

  return {
    req: req as Request,
    res: res as Response,
    next,
    getStatusCode: () => statusCode,
    getJsonResponse: () => jsonResponse,
    getClearedCookies: () => clearedCookies,
  };
}

describe('Authentication Error Classification & Regression Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------
  // Requirement 1 & Regression 1: Valid Session Returns User
  // -------------------------------------------------------------
  it('1. Valid session returns the expected authenticated user and calls next()', async () => {
    const validSession = {
      id: 'sess-123',
      userId: 'user-123',
      tokenHash: 'mock-hash',
      expiresAt: new Date(Date.now() + 86400000), // 1 day in future
      revokedAt: null,
      user: {
        id: 'user-123',
        email: 'authenticated@tempo.app',
        name: 'Tempo User',
        passwordHash: 'hashed-pw',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        preference: {
          id: 'pref-123',
          userId: 'user-123',
          timezone: 'Asia/Kolkata',
          onboardingCompleted: true,
          pushNotificationsEnabled: true,
          autoNightlyPlanningEnabled: true,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
        },
        oauthConnections: [],
      },
    };

    (prisma.session.findUnique as any).mockResolvedValueOnce(validSession);

    const { req, res, next, getClearedCookies } = createMockReqRes({
      cookies: { [AUTH_COOKIE_NAME]: 'valid-raw-token' },
    });

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(req.user?.id).toBe('user-123');
    expect(req.user?.email).toBe('authenticated@tempo.app');
    expect(req.user?.onboardingCompleted).toBe(true);
    expect(req.preference?.timezone).toBe('Asia/Kolkata');
    expect(getClearedCookies()).toHaveLength(0);
  });

  // -------------------------------------------------------------
  // Requirement 1 & Regression 2: Missing Session Returns 401
  // -------------------------------------------------------------
  it('2. Missing session returns 401 UNAUTHENTICATED without clearing cookies', async () => {
    const { req, res, next, getStatusCode, getJsonResponse, getClearedCookies } = createMockReqRes({
      cookies: {},
    });

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(getStatusCode()).toBe(401);
    expect(getJsonResponse().success).toBe(false);
    expect(getJsonResponse().error.code).toBe('UNAUTHENTICATED');
    expect(getClearedCookies()).toHaveLength(0);
  });

  // -------------------------------------------------------------
  // Requirement 1 & Regression 3: Expired / Revoked Session Returns 401 and Clears Cookie
  // -------------------------------------------------------------
  it('3a. Expired session returns 401 INVALID_SESSION and clears cookie', async () => {
    const expiredSession = {
      id: 'sess-expired',
      userId: 'user-123',
      tokenHash: 'mock-hash',
      expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      revokedAt: null,
      user: {
        id: 'user-123',
        email: 'expired@tempo.app',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    (prisma.session.findUnique as any).mockResolvedValueOnce(expiredSession);

    const { req, res, next, getStatusCode, getJsonResponse, getClearedCookies } = createMockReqRes({
      cookies: { [AUTH_COOKIE_NAME]: 'expired-token' },
    });

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(getStatusCode()).toBe(401);
    expect(getJsonResponse().error.code).toBe('INVALID_SESSION');
    expect(getClearedCookies()).toContain(AUTH_COOKIE_NAME);
  });

  it('3b. Revoked session returns 401 INVALID_SESSION and clears cookie', async () => {
    const revokedSession = {
      id: 'sess-revoked',
      userId: 'user-123',
      tokenHash: 'mock-hash',
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: new Date(Date.now() - 60000), // Revoked 1 min ago
      user: {
        id: 'user-123',
        email: 'revoked@tempo.app',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    (prisma.session.findUnique as any).mockResolvedValueOnce(revokedSession);

    const { req, res, next, getStatusCode, getJsonResponse, getClearedCookies } = createMockReqRes({
      cookies: { [AUTH_COOKIE_NAME]: 'revoked-token' },
    });

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(getStatusCode()).toBe(401);
    expect(getJsonResponse().error.code).toBe('INVALID_SESSION');
    expect(getClearedCookies()).toContain(AUTH_COOKIE_NAME);
  });

  it('3c. Non-existent session returns 401 INVALID_SESSION and clears cookie', async () => {
    (prisma.session.findUnique as any).mockResolvedValueOnce(null);

    const { req, res, next, getStatusCode, getJsonResponse, getClearedCookies } = createMockReqRes({
      cookies: { [AUTH_COOKIE_NAME]: 'non-existent-token' },
    });

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(getStatusCode()).toBe(401);
    expect(getJsonResponse().error.code).toBe('INVALID_SESSION');
    expect(getClearedCookies()).toContain(AUTH_COOKIE_NAME);
  });

  // -------------------------------------------------------------
  // Requirement 1 & Regression 4: Database Failure Returns 503 and Preserves Cookie
  // -------------------------------------------------------------
  it('4. Database connection failure returns 503 DATABASE_UNAVAILABLE and DOES NOT clear cookie', async () => {
    const dbError = new Error(
      "Can't reach database server at `ep-raspy-tooth-bds72nyv-pooler.c-8.us-east-2.aws.neon.tech:5432`"
    );
    dbError.name = 'PrismaClientInitializationError';

    (prisma.session.findUnique as any).mockRejectedValueOnce(dbError);

    const { req, res, next, getStatusCode, getJsonResponse, getClearedCookies } = createMockReqRes({
      cookies: { [AUTH_COOKIE_NAME]: 'user-valid-token' },
    });

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(getStatusCode()).toBe(503);
    expect(getJsonResponse().success).toBe(false);
    expect(getJsonResponse().error.code).toBe('DATABASE_UNAVAILABLE');
    // CRITICAL: Cookie must NOT be cleared during database outages
    expect(getClearedCookies()).toHaveLength(0);
  });

  it('4b. optionalAuth propagates 503 on database failure without clearing cookie', async () => {
    const dbError = new DatabaseConnectionError('Database pool timeout');
    (prisma.session.findUnique as any).mockRejectedValueOnce(dbError);

    const { req, res, next, getStatusCode, getJsonResponse, getClearedCookies } = createMockReqRes({
      cookies: { [AUTH_COOKIE_NAME]: 'user-valid-token' },
    });

    await optionalAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(getStatusCode()).toBe(503);
    expect(getJsonResponse().error.code).toBe('DATABASE_UNAVAILABLE');
    expect(getClearedCookies()).toHaveLength(0);
  });

  // -------------------------------------------------------------
  // Requirement 1 & Regression 5: Unexpected Internal Errors Return 500
  // -------------------------------------------------------------
  it('5. Unexpected internal errors return 500 without clearing cookie', async () => {
    const unexpectedError = new TypeError('Simulated unexpected memory error');
    (prisma.session.findUnique as any).mockRejectedValueOnce(unexpectedError);

    const { req, res, next, getStatusCode, getJsonResponse, getClearedCookies } = createMockReqRes({
      cookies: { [AUTH_COOKIE_NAME]: 'user-token' },
    });

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(getStatusCode()).toBe(500);
    expect(getJsonResponse().error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(getClearedCookies()).toHaveLength(0);
  });

  // -------------------------------------------------------------
  // Requirement 3 & Regression 6: Google-linked users receive googleConnected: true
  // -------------------------------------------------------------
  it('6. Google-linked users receive googleConnected: true', () => {
    const userWithGoogle: any = {
      id: 'usr-google',
      email: 'alex@gmail.com',
      name: 'Alex Google',
      passwordHash: null,
      createdAt: new Date('2026-02-01T00:00:00Z'),
      updatedAt: new Date('2026-02-01T00:00:00Z'),
      oauthConnections: [
        {
          id: 'conn-1',
          provider: 'google',
          providerId: 'google-sub-12345',
          email: 'alex@gmail.com',
        },
      ],
    };

    const dto = toUserDTO(userWithGoogle);
    expect(dto.id).toBe('usr-google');
    expect(dto.googleConnected).toBe(true);
    expect(dto.hasPassword).toBe(false);
  });

  // -------------------------------------------------------------
  // Requirement 3 & Regression 7: Users without Google connections
  // -------------------------------------------------------------
  it('7a. Users with empty oauthConnections receive googleConnected: false', () => {
    const userWithoutGoogle: any = {
      id: 'usr-native',
      email: 'native@tempo.app',
      name: 'Native User',
      passwordHash: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
      oauthConnections: [],
    };

    const dto = toUserDTO(userWithoutGoogle);
    expect(dto.googleConnected).toBe(false);
    expect(dto.hasPassword).toBe(true);
  });

  it('7b. Users without oauthConnections field receive googleConnected: false', () => {
    const userWithoutOauthField: any = {
      id: 'usr-native-2',
      email: 'native2@tempo.app',
      name: 'Native User 2',
      passwordHash: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const dto = toUserDTO(userWithoutOauthField);
    expect(dto.googleConnected).toBe(false);
  });

  // -------------------------------------------------------------
  // Requirement 3 & Regression 8: Preference Serialization for Valid Records
  // -------------------------------------------------------------
  it('8. Preference serialization accurately serializes valid records', () => {
    const fullPref: any = {
      id: 'pref-valid',
      userId: 'usr-1',
      timezone: 'Europe/London',
      wakeTime: '06:30',
      sleepTime: '22:30',
      preferredWorkStart: '08:30',
      preferredWorkEnd: '17:30',
      breakfastTime: '07:30',
      lunchTime: '12:30',
      dinnerTime: '19:30',
      preferredBreakDuration: 20,
      maxContinuousWorkDuration: 80,
      dailyLeisureTarget: 150,
      onboardingCompleted: true,
      pushNotificationsEnabled: true,
      autoNightlyPlanningEnabled: false,
      notifyTomorrowPlanReady: true,
      notifyTaskReminders: false,
      notifyScheduleReminders: true,
      notifyScheduleChanges: false,
      preferredPlanningTime: '20:00',
      createdAt: new Date('2026-03-01T10:00:00.000Z'),
      updatedAt: new Date('2026-03-01T12:00:00.000Z'),
    };

    const dto = toUserPreferenceDTO(fullPref);
    expect(dto.id).toBe('pref-valid');
    expect(dto.timezone).toBe('Europe/London');
    expect(dto.wakeTime).toBe('06:30');
    expect(dto.autoNightlyPlanningEnabled).toBe(false);
    expect(dto.notifyTaskReminders).toBe(false);
    expect(dto.preferredPlanningTime).toBe('20:00');
    expect(dto.createdAt).toBe('2026-03-01T10:00:00.000Z');
    expect(dto.updatedAt).toBe('2026-03-01T12:00:00.000Z');
  });

  // -------------------------------------------------------------
  // Requirement 3 & Regression 9: Nullable / Missing Preference Fields
  // -------------------------------------------------------------
  it('9. Missing or nullable optional preference fields do not crash serialization', () => {
    const partialPref: any = {
      id: 'pref-partial',
      userId: 'usr-partial',
      // All other fields omitted or null
      timezone: null,
      wakeTime: null,
      pushNotificationsEnabled: null,
      autoNightlyPlanningEnabled: undefined,
      preferredPlanningTime: null,
      createdAt: null,
      updatedAt: undefined,
    };

    expect(() => toUserPreferenceDTO(partialPref)).not.toThrow();

    const dto = toUserPreferenceDTO(partialPref);
    expect(dto.id).toBe('pref-partial');
    expect(dto.userId).toBe('usr-partial');
    expect(dto.timezone).toBe('Asia/Kolkata'); // Fallback default
    expect(dto.wakeTime).toBe('07:00'); // Fallback default
    expect(dto.pushNotificationsEnabled).toBe(true); // Fallback default
    expect(dto.autoNightlyPlanningEnabled).toBe(true); // Fallback default
    expect(dto.preferredPlanningTime).toBe('21:00'); // Fallback default
    expect(typeof dto.createdAt).toBe('string');
    expect(typeof dto.updatedAt).toBe('string');
  });

  // -------------------------------------------------------------
  // Helper test: isDatabaseConnectionError classification
  // -------------------------------------------------------------
  it('correctly classifies database connection errors and distinguishes from other errors', () => {
    // 1. PrismaClientInitializationError
    const initErr = new Error("Can't reach database server");
    initErr.name = 'PrismaClientInitializationError';
    expect(isDatabaseConnectionError(initErr)).toBe(true);

    // 2. PrismaClientKnownRequestError connection codes
    const p1001Err: any = new Error('Database unreachable');
    p1001Err.name = 'PrismaClientKnownRequestError';
    p1001Err.code = 'P1001';
    expect(isDatabaseConnectionError(p1001Err)).toBe(true);

    // 3. Network connection refused code
    const connRefused: any = new Error('Connection refused');
    connRefused.code = 'ECONNREFUSED';
    expect(isDatabaseConnectionError(connRefused)).toBe(true);

    // 4. DatabaseConnectionError instance
    expect(isDatabaseConnectionError(new DatabaseConnectionError())).toBe(true);

    // 5. Standard non-database errors must return false
    expect(isDatabaseConnectionError(new TypeError('Invalid property'))).toBe(false);
    expect(isDatabaseConnectionError(new Error('Invalid password'))).toBe(false);
    expect(isDatabaseConnectionError(null)).toBe(false);
    expect(isDatabaseConnectionError(undefined)).toBe(false);
  });
});
