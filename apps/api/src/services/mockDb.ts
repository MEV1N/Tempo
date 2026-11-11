export interface MockUser {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  preference?: MockPreference | null;
}

export interface MockPreference {
  id: string;
  userId: string;
  timezone: string;
  wakeTime: string;
  sleepTime: string;
  preferredWorkStart: string;
  preferredWorkEnd: string;
  breakfastTime: string;
  lunchTime: string;
  dinnerTime: string;
  preferredBreakDuration: number;
  maxContinuousWorkDuration: number;
  dailyLeisureTarget: number;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: MockUser;
}

export function createMockDatabase() {
  const users: MockUser[] = [];
  const preferences: MockPreference[] = [];
  const sessions: MockSession[] = [];

  const reset = () => {
    users.length = 0;
    preferences.length = 0;
    sessions.length = 0;
  };

  const userModel = {
    findUnique: async ({ where }: { where: { email?: string; id?: string } }) => {
      const user = users.find(
        (u) => (where.email && u.email === where.email) || (where.id && u.id === where.id)
      );
      if (!user) return null;
      const pref = preferences.find((p) => p.userId === user.id) || null;
      return { ...user, preference: pref };
    },
    create: async ({ data, include }: any) => {
      const id = data.id || `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date();
      const user: MockUser = {
        id,
        email: data.email,
        name: data.name ?? null,
        passwordHash: data.passwordHash,
        createdAt: now,
        updatedAt: now,
      };
      users.push(user);

      if (data.preference?.create) {
        const pref: MockPreference = {
          id: `pref-${Date.now()}`,
          userId: id,
          timezone: data.preference.create.timezone || 'Asia/Kolkata',
          wakeTime: '07:00',
          sleepTime: '23:00',
          preferredWorkStart: '09:00',
          preferredWorkEnd: '18:00',
          breakfastTime: '08:30',
          lunchTime: '13:00',
          dinnerTime: '20:30',
          preferredBreakDuration: 15,
          maxContinuousWorkDuration: 90,
          dailyLeisureTarget: 120,
          onboardingCompleted: data.preference.create.onboardingCompleted ?? false,
          createdAt: now,
          updatedAt: now,
        };
        preferences.push(pref);
        user.preference = pref;
      }

      if (data.sessions?.create) {
        const sess: MockSession = {
          id: `sess-${Date.now()}`,
          userId: id,
          tokenHash: data.sessions.create.tokenHash,
          expiresAt: data.sessions.create.expiresAt,
          revokedAt: null,
          userAgent: data.sessions.create.userAgent ?? null,
          ipAddress: data.sessions.create.ipAddress ?? null,
          createdAt: now,
          updatedAt: now,
        };
        sessions.push(sess);
      }

      const pref = preferences.find((p) => p.userId === user.id) || null;
      return include?.preference ? { ...user, preference: pref } : user;
    },
    update: async ({ where, data, include }: any) => {
      const idx = users.findIndex((u) => u.id === where.id);
      if (idx === -1) throw new Error('User not found');
      if (data.name !== undefined) users[idx].name = data.name;
      users[idx].updatedAt = new Date();
      const pref = preferences.find((p) => p.userId === users[idx].id) || null;
      return include?.preference ? { ...users[idx], preference: pref } : users[idx];
    },
  };

  const preferenceModel = {
    findUnique: async ({ where }: { where: { userId?: string; id?: string } }) => {
      const pref = preferences.find(
        (p) => (where.userId && p.userId === where.userId) || (where.id && p.id === where.id)
      );
      return pref ? { ...pref } : null;
    },
    create: async ({ data }: any) => {
      const now = new Date();
      const pref: MockPreference = {
        id: `pref-${Date.now()}`,
        userId: data.userId,
        timezone: data.timezone || 'Asia/Kolkata',
        wakeTime: data.wakeTime || '07:00',
        sleepTime: data.sleepTime || '23:00',
        preferredWorkStart: data.preferredWorkStart || '09:00',
        preferredWorkEnd: data.preferredWorkEnd || '18:00',
        breakfastTime: data.breakfastTime || '08:30',
        lunchTime: data.lunchTime || '13:00',
        dinnerTime: data.dinnerTime || '20:30',
        preferredBreakDuration: data.preferredBreakDuration ?? 15,
        maxContinuousWorkDuration: data.maxContinuousWorkDuration ?? 90,
        dailyLeisureTarget: data.dailyLeisureTarget ?? 120,
        onboardingCompleted: data.onboardingCompleted ?? false,
        createdAt: now,
        updatedAt: now,
      };
      preferences.push(pref);
      return { ...pref };
    },
    upsert: async ({ where, create, update }: any) => {
      const idx = preferences.findIndex((p) => p.userId === where.userId);
      const now = new Date();
      if (idx === -1) {
        const pref: MockPreference = {
          id: `pref-${Date.now()}`,
          userId: where.userId,
          timezone: create.timezone || 'Asia/Kolkata',
          wakeTime: create.wakeTime || '07:00',
          sleepTime: create.sleepTime || '23:00',
          preferredWorkStart: create.preferredWorkStart || '09:00',
          preferredWorkEnd: create.preferredWorkEnd || '18:00',
          breakfastTime: create.breakfastTime || '08:30',
          lunchTime: create.lunchTime || '13:00',
          dinnerTime: create.dinnerTime || '20:30',
          preferredBreakDuration: create.preferredBreakDuration ?? 15,
          maxContinuousWorkDuration: create.maxContinuousWorkDuration ?? 90,
          dailyLeisureTarget: create.dailyLeisureTarget ?? 120,
          onboardingCompleted: create.onboardingCompleted ?? false,
          createdAt: now,
          updatedAt: now,
        };
        preferences.push(pref);
        return { ...pref };
      } else {
        preferences[idx] = {
          ...preferences[idx],
          ...update,
          updatedAt: now,
        };
        return { ...preferences[idx] };
      }
    },
  };

  const sessionModel = {
    findUnique: async ({ where, include }: any) => {
      const sess = sessions.find((s) => s.tokenHash === where.tokenHash);
      if (!sess) return null;
      if (include?.user) {
        const user = users.find((u) => u.id === sess.userId);
        if (!user) return null;
        const pref = preferences.find((p) => p.userId === user.id) || null;
        return {
          ...sess,
          user: {
            ...user,
            preference: pref,
          },
        };
      }
      return { ...sess };
    },
    create: async ({ data }: any) => {
      const now = new Date();
      const sess: MockSession = {
        id: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        revokedAt: null,
        userAgent: data.userAgent ?? null,
        ipAddress: data.ipAddress ?? null,
        createdAt: now,
        updatedAt: now,
      };
      sessions.push(sess);
      return { ...sess };
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      sessions.forEach((s) => {
        if (
          s.tokenHash === where.tokenHash &&
          (where.revokedAt === null ? s.revokedAt === null : true)
        ) {
          if (data.revokedAt !== undefined) s.revokedAt = data.revokedAt;
          count++;
        }
      });
      return { count };
    },
  };

  return {
    users,
    preferences,
    sessions,
    reset,
    prismaMock: {
      user: userModel,
      userPreference: preferenceModel,
      session: sessionModel,
    },
  };
}

export const mockDb = createMockDatabase();
