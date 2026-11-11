import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User, UserPreference } from '@tempo/database';
import { prisma } from '../db';
import { RegisterInput, LoginInput, UserDTO, UserPreferenceDTO, APP_CONFIG } from '@tempo/shared';

const BCRYPT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateSessionToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  return { rawToken, tokenHash };
}

export class DatabaseConnectionError extends Error {
  readonly statusCode = 503;
  readonly code = 'DATABASE_UNAVAILABLE';

  constructor(
    message = 'Database service is temporarily unavailable. Please try again shortly.',
    cause?: unknown
  ) {
    super(message);
    this.name = 'DatabaseConnectionError';
    this.cause = cause;
  }
}

export function isDatabaseConnectionError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof DatabaseConnectionError) return true;

  const err = error as any;
  const name = String(err.name || '');
  const message = String(err.message || '');
  const code = String(err.code || '');

  // Prisma connection / initialization error classes
  if (
    name === 'PrismaClientInitializationError' ||
    name === 'PrismaClientRustPanicError' ||
    name === 'PrismaClientUnknownRequestError'
  ) {
    return true;
  }

  // Prisma known request error connection codes (P1000..P1017)
  if (name === 'PrismaClientKnownRequestError' && code.startsWith('P1')) {
    return true;
  }

  // Common network / database connection failure error codes
  const connectionCodes = [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'ECONNRESET',
    'EAI_AGAIN',
    'UND_ERR_CONNECT_TIMEOUT',
    'EACCES',
  ];
  if (connectionCodes.includes(code)) {
    return true;
  }

  // Error message heuristics for poolers / Postgres / Neon
  const lowerMsg = message.toLowerCase();
  if (
    lowerMsg.includes("can't reach database server") ||
    lowerMsg.includes('cant reach database server') ||
    lowerMsg.includes('connection timed out') ||
    lowerMsg.includes('connection closed') ||
    lowerMsg.includes('server closed the connection') ||
    lowerMsg.includes('connection terminated') ||
    lowerMsg.includes('failed to connect') ||
    lowerMsg.includes('neon.tech:5432')
  ) {
    return true;
  }

  return false;
}

export function toUserDTO(
  user: User & { preference?: UserPreference | null; oauthConnections?: any[] }
): UserDTO {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt:
      typeof user.createdAt === 'string'
        ? user.createdAt
        : (user.createdAt?.toISOString?.() ?? new Date().toISOString()),
    updatedAt:
      typeof user.updatedAt === 'string'
        ? user.updatedAt
        : (user.updatedAt?.toISOString?.() ?? new Date().toISOString()),
    onboardingCompleted: user.preference?.onboardingCompleted ?? false,
    hasPassword: !!user.passwordHash,
    googleConnected: user.oauthConnections
      ? user.oauthConnections.some((c) => c.provider === 'google')
      : false,
  };
}

export function toUserPreferenceDTO(pref: Partial<UserPreference>): UserPreferenceDTO {
  return {
    id: pref.id ?? '',
    userId: pref.userId ?? '',
    timezone: pref.timezone || 'Asia/Kolkata',
    wakeTime: pref.wakeTime || '07:00',
    sleepTime: pref.sleepTime || '23:00',
    preferredWorkStart: pref.preferredWorkStart || '09:00',
    preferredWorkEnd: pref.preferredWorkEnd || '18:00',
    breakfastTime: pref.breakfastTime || '08:30',
    lunchTime: pref.lunchTime || '13:00',
    dinnerTime: pref.dinnerTime || '20:30',
    preferredBreakDuration: pref.preferredBreakDuration ?? 15,
    maxContinuousWorkDuration: pref.maxContinuousWorkDuration ?? 90,
    dailyLeisureTarget: pref.dailyLeisureTarget ?? 120,
    onboardingCompleted: pref.onboardingCompleted ?? false,
    pushNotificationsEnabled: pref.pushNotificationsEnabled ?? true,
    autoNightlyPlanningEnabled: pref.autoNightlyPlanningEnabled ?? true,
    notifyTomorrowPlanReady: pref.notifyTomorrowPlanReady ?? true,
    notifyTaskReminders: pref.notifyTaskReminders ?? true,
    notifyScheduleReminders: pref.notifyScheduleReminders ?? true,
    notifyScheduleChanges: pref.notifyScheduleChanges ?? true,
    preferredPlanningTime: pref.preferredPlanningTime || '21:00',
    createdAt:
      typeof pref.createdAt === 'string'
        ? pref.createdAt
        : (pref.createdAt?.toISOString?.() ?? new Date().toISOString()),
    updatedAt:
      typeof pref.updatedAt === 'string'
        ? pref.updatedAt
        : (pref.updatedAt?.toISOString?.() ?? new Date().toISOString()),
  };
}

export interface SessionResult {
  user: UserDTO;
  preference: UserPreferenceDTO | null;
  rawToken: string;
}

export async function register(
  input: RegisterInput,
  meta: { userAgent?: string; ipAddress?: string }
): Promise<SessionResult> {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    const error: any = new Error('A user with this email address already exists');
    error.code = 'EMAIL_ALREADY_EXISTS';
    error.status = 409;
    throw error;
  }

  const passwordHash = await hashPassword(input.password);
  const { rawToken, tokenHash } = generateSessionToken();
  const expiresAt = new Date(Date.now() + APP_CONFIG.SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      preference: {
        create: {
          timezone: 'Asia/Kolkata',
          onboardingCompleted: false,
        },
      },
      sessions: {
        create: {
          tokenHash,
          expiresAt,
          userAgent: meta.userAgent,
          ipAddress: meta.ipAddress,
        },
      },
    },
    include: {
      preference: true,
    },
  });

  return {
    user: toUserDTO(user),
    preference: user.preference ? toUserPreferenceDTO(user.preference) : null,
    rawToken,
  };
}

export async function login(
  input: LoginInput,
  meta: { userAgent?: string; ipAddress?: string }
): Promise<SessionResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { preference: true },
  });

  if (!user) {
    const error: any = new Error('Invalid email or password');
    error.code = 'INVALID_CREDENTIALS';
    error.status = 401;
    throw error;
  }

  if (!user.passwordHash) {
    const error: any = new Error(
      'This account was created with Google. Please use Continue with Google or set a password in settings.'
    );
    error.code = 'USE_GOOGLE_LOGIN';
    error.status = 401;
    throw error;
  }

  const isPasswordValid = await verifyPassword(input.password, user.passwordHash);
  if (!isPasswordValid) {
    const error: any = new Error('Invalid email or password');
    error.code = 'INVALID_CREDENTIALS';
    error.status = 401;
    throw error;
  }

  const { rawToken, tokenHash } = generateSessionToken();
  const expiresAt = new Date(Date.now() + APP_CONFIG.SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    },
  });

  return {
    user: toUserDTO(user),
    preference: user.preference ? toUserPreferenceDTO(user.preference) : null,
    rawToken,
  };
}

export async function validateSession(rawToken: string): Promise<{
  user: UserDTO;
  preference: UserPreferenceDTO | null;
  sessionId: string;
} | null> {
  if (!rawToken || typeof rawToken !== 'string') {
    return null;
  }

  const tokenHash = hashSessionToken(rawToken);

  try {
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            preference: true,
            oauthConnections: true,
          },
        },
      },
    });

    if (!session || !session.user) {
      // eslint-disable-next-line no-console
      console.log(
        `[AUTH_DIAGNOSTIC] validateSession: No active session record for tokenHash prefix ${tokenHash.slice(0, 8)}...`
      );
      return null;
    }

    // Check revocation or expiration
    if (session.revokedAt !== null || session.expiresAt <= new Date()) {
      // eslint-disable-next-line no-console
      console.log(
        `[AUTH_DIAGNOSTIC] validateSession: Session expired or revoked (revokedAt: ${session.revokedAt?.toISOString?.() ?? session.revokedAt}, expiresAt: ${session.expiresAt?.toISOString?.() ?? session.expiresAt})`
      );
      return null;
    }

    return {
      user: toUserDTO(session.user),
      preference: session.user.preference ? toUserPreferenceDTO(session.user.preference) : null,
      sessionId: session.id,
    };
  } catch (error: any) {
    if (isDatabaseConnectionError(error)) {
      // eslint-disable-next-line no-console
      console.error(
        `[AUTH_DIAGNOSTIC] validateSession: Database connection error encountered (hash: ${tokenHash.slice(0, 8)}...): ${error.message || error}`
      );
      throw new DatabaseConnectionError('Database connection failure during session lookup', error);
    }

    // eslint-disable-next-line no-console
    console.error(
      `[AUTH_DIAGNOSTIC] validateSession: Unexpected internal error: ${error.message || error}`
    );
    throw error;
  }
}

export async function logout(rawToken: string): Promise<boolean> {
  if (!rawToken) return false;
  const tokenHash = hashSessionToken(rawToken);
  try {
    await prisma.session.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
    return true;
  } catch {
    return false;
  }
}
