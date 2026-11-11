import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db';
import { setMockGoogleOAuthHandler } from '../src/services/google-auth.service';
import { setMockGoogleCalendarHandler } from '../src/services/google-calendar.service';
import { createSignedOAuthState } from '../src/services/crypto.service';

describe(
  'Tempo Phase 7 — Google Authentication & Google Calendar Integration Tests',
  { timeout: 45000 },
  () => {
    const app = createApp();

    const timestamp = Date.now();
    const googleSubUser1 = `google-sub-1-${timestamp}`;
    const googleEmailUser1 = `google_user1_${timestamp}@example.com`;

    const collisionEmail = `collision_${timestamp}@example.com`;
    const collisionPassword = 'Password123!';
    const googleSubCollision = `google-sub-collision-${timestamp}`;

    const userCEmail = `userC_${timestamp}@example.com`;
    const userCPassword = 'Password123!';

    let user1Id: string;
    let user1Cookie: string;

    let collisionUserId: string;
    let collisionUserCookie: string;

    let userCId: string;
    let userCCookie: string;

    beforeAll(async () => {
      // Register User with email/password (to test collision prevention and linking)
      const regRes = await request(app).post('/api/auth/register').send({
        name: 'Collision Target User',
        email: collisionEmail,
        password: collisionPassword,
      });
      collisionUserId = regRes.body.data.user.id;
      collisionUserCookie = regRes.headers['set-cookie'][0];

      // Register User C
      const regC = await request(app).post('/api/auth/register').send({
        name: 'User C',
        email: userCEmail,
        password: userCPassword,
      });
      userCId = regC.body.data.user.id;
      userCCookie = regC.headers['set-cookie'][0];

      // Configure mock Google OAuth handler
      setMockGoogleOAuthHandler(async (code: string) => {
        if (code === 'code_user1') {
          return {
            access_token: 'mock-access-token-user1',
            id_token: 'mock-id-token-user1',
            refresh_token: 'mock-refresh-token-user1',
            user_info: {
              sub: googleSubUser1,
              email: googleEmailUser1,
              name: 'Google Student 1',
              picture: 'https://lh3.googleusercontent.com/photo1.jpg',
              email_verified: true,
            },
          };
        }

        if (code === 'code_collision') {
          return {
            access_token: 'mock-access-token-collision',
            id_token: 'mock-id-token-collision',
            user_info: {
              sub: googleSubCollision,
              email: collisionEmail, // Matching email address!
              name: 'Google Impersonator',
              email_verified: true,
            },
          };
        }

        if (code === 'code_different_sub') {
          return {
            access_token: 'mock-access-token-diff',
            id_token: 'mock-id-token-diff',
            user_info: {
              sub: `different-google-sub-${Date.now()}`,
              email: `different_${Date.now()}@example.com`,
              email_verified: true,
            },
          };
        }

        throw new Error(`Unknown mock code: ${code}`);
      });
    });

    afterAll(async () => {
      // Reset mock handlers
      setMockGoogleOAuthHandler(null);
      setMockGoogleCalendarHandler(null, null);

      // Clean up created test accounts
      const allEmails = [googleEmailUser1, collisionEmail, userCEmail];
      const users = await prisma.user.findMany({
        where: { email: { in: allEmails } },
        select: { id: true },
      });
      const ids = users.map((u) => u.id);

      if (ids.length > 0) {
        await prisma.calendarEvent.deleteMany({ where: { userId: { in: ids } } });
        await prisma.oAuthConnection.deleteMany({ where: { userId: { in: ids } } });
        await prisma.session.deleteMany({ where: { userId: { in: ids } } });
        await prisma.userPreference.deleteMany({ where: { userId: { in: ids } } });
        await prisma.user.deleteMany({ where: { id: { in: ids } } });
      }
    }, 35000);

    describe('1. Google OAuth Initiation & State Protection', () => {
      it('returns an authorization URL with PKCE and signed state', async () => {
        const res = await request(app).get('/api/auth/google').set('Accept', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
        expect(res.body.data.url).toContain('scope=openid+email+profile');
        expect(res.body.data.url).toContain('code_challenge_method=S256');
        expect(typeof res.body.data.state).toBe('string');
      });

      it('rejects callback with tampered state parameter', async () => {
        const res = await request(app).get(
          '/api/auth/google/callback?code=code_user1&state=tampered.signature'
        );
        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('error=INVALID_OAUTH_STATE');
      });
    });

    describe('2. New User Registration via Google OAuth', () => {
      it('registers a new Tempo account and creates a session on first Google login', async () => {
        const validState = createSignedOAuthState({
          action: 'login',
          codeVerifier: 'mock-code-verifier-12345',
          nonce: 'mock-nonce',
          redirectUri: 'http://localhost:5000/api/auth/google/callback',
        });

        const res = await request(app).get(
          `/api/auth/google/callback?code=code_user1&state=${validState}`
        );

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('/onboarding');
        expect(res.headers['set-cookie']).toBeDefined();

        user1Cookie = res.headers['set-cookie'][0];

        // Verify user and OAuthConnection in database
        const dbUser = await prisma.user.findUnique({
          where: { email: googleEmailUser1 },
          include: { oauthConnections: true, preference: true },
        });

        expect(dbUser).not.toBeNull();
        user1Id = dbUser!.id;
        expect(dbUser?.passwordHash).toBeNull(); // No password set initially
        expect(dbUser?.oauthConnections.length).toBe(1);
        expect(dbUser?.oauthConnections[0].provider).toBe('google');
        expect(dbUser?.oauthConnections[0].providerId).toBe(googleSubUser1);
      });

      it('authenticates existing linked Google user into dashboard', async () => {
        const validState = createSignedOAuthState({
          action: 'login',
          codeVerifier: 'mock-code-verifier-12345',
          nonce: 'mock-nonce',
          redirectUri: 'http://localhost:5000/api/auth/google/callback',
        });

        const res = await request(app).get(
          `/api/auth/google/callback?code=code_user1&state=${validState}`
        );

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('/dashboard');
      });
    });

    describe('3. Account Collision Prevention & Safe Linking', () => {
      it('refuses to automatically link accounts when email matches an unlinked password account', async () => {
        const validState = createSignedOAuthState({
          action: 'login',
          codeVerifier: 'mock-code-verifier-collision',
          nonce: 'mock-nonce',
          redirectUri: 'http://localhost:5000/api/auth/google/callback',
        });

        // Google returns collisionEmail, but it is not linked to googleSubCollision yet
        const res = await request(app).get(
          `/api/auth/google/callback?code=code_collision&state=${validState}`
        );

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('error=ACCOUNT_EXISTS_LINK_REQUIRED');

        // Verify account was NOT modified or linked
        const conn = await prisma.oAuthConnection.findUnique({
          where: {
            provider_providerId: {
              provider: 'google',
              providerId: googleSubCollision,
            },
          },
        });
        expect(conn).toBeNull();
      });

      it('allows authenticated user to explicitly link their Google account', async () => {
        const linkState = createSignedOAuthState({
          action: 'link',
          userId: collisionUserId,
          codeVerifier: 'mock-code-verifier-collision',
          nonce: 'mock-nonce',
          redirectUri: 'http://localhost:5000/api/auth/google/callback',
        });

        const res = await request(app)
          .get(`/api/auth/google/callback?code=code_collision&state=${linkState}`)
          .set('Cookie', collisionUserCookie);

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('google_linked=success');

        // Verify connection created
        const conn = await prisma.oAuthConnection.findUnique({
          where: {
            provider_providerId: {
              provider: 'google',
              providerId: googleSubCollision,
            },
          },
        });
        expect(conn).not.toBeNull();
        expect(conn?.userId).toBe(collisionUserId);
      });

      it('rejects another user from linking the already-claimed Google identity', async () => {
        const linkStateForUserC = createSignedOAuthState({
          action: 'link',
          userId: userCId,
          codeVerifier: 'mock-code-verifier-collision',
          nonce: 'mock-nonce',
          redirectUri: 'http://localhost:5000/api/auth/google/callback',
        });

        const res = await request(app)
          .get(`/api/auth/google/callback?code=code_collision&state=${linkStateForUserC}`)
          .set('Cookie', userCCookie);

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('error=GOOGLE_ACCOUNT_ALREADY_LINKED');
      });
    });

    describe('4. Google Calendar Authorization & Identity Matching', () => {
      it('returns Calendar connect URL with narrow read-only scope', async () => {
        const res = await request(app)
          .get('/api/google-calendar/connect')
          .set('Cookie', user1Cookie)
          .set('Accept', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(decodeURIComponent(res.body.data.url)).toContain(
          'https://www.googleapis.com/auth/calendar.readonly'
        );
        expect(res.body.data.url).toContain('access_type=offline');
      });

      it('rejects Calendar connection when authorized Google account differs from login identity', async () => {
        setMockGoogleCalendarHandler(
          async () => ({
            access_token: 'mock-cal-access',
            refresh_token: 'mock-cal-refresh',
            user_info: {
              sub: 'mismatched-google-sub',
              email: 'wrong_account@example.com',
            },
          }),
          null
        );

        const calState = createSignedOAuthState({
          action: 'calendar_connect',
          userId: user1Id,
          codeVerifier: 'mock-cal-verifier',
          redirectUri: 'http://localhost:5000/api/google-calendar/callback',
        });

        const res = await request(app)
          .get(`/api/google-calendar/callback?code=code_different_sub&state=${calState}`)
          .set('Cookie', user1Cookie);

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('error=GOOGLE_IDENTITY_MISMATCH');
      });

      it('authorizes Calendar and stores encrypted refresh token when identities match', async () => {
        setMockGoogleCalendarHandler(
          async () => ({
            access_token: 'mock-cal-access',
            refresh_token: 'mock-cal-refresh-user1',
            user_info: {
              sub: googleSubUser1, // Matches User 1 login identity!
              email: googleEmailUser1,
            },
          }),
          async () => ({
            items: [
              {
                id: 'cal-event-1',
                summary: 'CS401 Lecture',
                description: 'Distributed Consensus',
                start: { dateTime: new Date(Date.now() + 3600000).toISOString() },
                end: { dateTime: new Date(Date.now() + 7200000).toISOString() },
              },
            ],
            nextSyncToken: 'sync-token-1',
          })
        );

        const calState = createSignedOAuthState({
          action: 'calendar_connect',
          userId: user1Id,
          codeVerifier: 'mock-cal-verifier',
          redirectUri: 'http://localhost:5000/api/google-calendar/callback',
        });

        const res = await request(app)
          .get(`/api/google-calendar/callback?code=code_user1&state=${calState}`)
          .set('Cookie', user1Cookie);

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('calendar_connected=success');

        // Verify connection in database
        const conn = await prisma.oAuthConnection.findUnique({
          where: {
            userId_provider: {
              userId: user1Id,
              provider: 'google',
            },
          },
        });

        expect(conn?.calendarConnected).toBe(true);
        expect(conn?.encryptedRefreshToken).toBeDefined();
        expect(conn?.encryptedRefreshToken).toContain(':'); // Formatted iv:tag:cipher

        // Verify event imported into CalendarEvent table
        const event = await prisma.calendarEvent.findFirst({
          where: { userId: user1Id, googleEventId: 'cal-event-1' },
        });
        expect(event).not.toBeNull();
        expect(event?.title).toBe('CS401 Lecture');
        expect(event?.eventType).toBe('COMMITMENT');
        expect(event?.isGoogleEvent).toBe(true);
      });

      it('fetches calendar status correctly', async () => {
        const res = await request(app)
          .get('/api/google-calendar/status')
          .set('Cookie', user1Cookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.googleAccountConnected).toBe(true);
        expect(res.body.data.calendarConnected).toBe(true);
        expect(res.body.data.googleEmail).toBe(googleEmailUser1);
        expect(res.body.data.hasPasswordAuth).toBe(false);
      });
    });

    describe('5. Calendar Synchronization & Cancellation', () => {
      it('processes incremental synchronization and handles event cancellation', async () => {
        setMockGoogleCalendarHandler(null, async () => ({
          items: [
            {
              id: 'cal-event-1',
              status: 'cancelled', // Event cancelled in Google Calendar
            },
            {
              id: 'cal-event-2',
              summary: 'Lab Exam Review',
              start: { date: '2026-11-20' }, // All day
              end: { date: '2026-11-20' },
            },
          ],
          nextSyncToken: 'sync-token-2',
        }));

        const res = await request(app)
          .post('/api/google-calendar/sync')
          .set('Cookie', user1Cookie)
          .send({});

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.deletedCount).toBe(1);
        expect(res.body.data.importedCount).toBe(1);

        // Verify event 1 deleted
        const event1 = await prisma.calendarEvent.findFirst({
          where: { userId: user1Id, googleEventId: 'cal-event-1' },
        });
        expect(event1).toBeNull();

        // Verify all-day event 2 created
        const event2 = await prisma.calendarEvent.findFirst({
          where: { userId: user1Id, googleEventId: 'cal-event-2' },
        });
        expect(event2).not.toBeNull();
        expect(event2?.isAllDay).toBe(true);
      });

      it('disconnects Google Calendar without deleting user account', async () => {
        const res = await request(app)
          .post('/api/google-calendar/disconnect')
          .set('Cookie', user1Cookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const statusRes = await request(app)
          .get('/api/google-calendar/status')
          .set('Cookie', user1Cookie);

        expect(statusRes.body.data.calendarConnected).toBe(false);
        expect(statusRes.body.data.googleAccountConnected).toBe(true); // Login still connected!
      });
    });

    describe('6. Safe Google Unlinking & Password Requirement', () => {
      it('prevents Google-only user from unlinking without a password', async () => {
        const res = await request(app).delete('/api/auth/google/unlink').set('Cookie', user1Cookie);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('PASSWORD_REQUIRED_BEFORE_UNLINK');
      });

      it('allows setting a password for the Google account', async () => {
        const res = await request(app)
          .post('/api/auth/google/set-password')
          .set('Cookie', user1Cookie)
          .send({ password: 'NewSecurePassword123!' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const dbUser = await prisma.user.findUnique({ where: { id: user1Id } });
        expect(dbUser?.passwordHash).not.toBeNull();
      });

      it('allows unlinking Google identity once a password is set', async () => {
        const res = await request(app).delete('/api/auth/google/unlink').set('Cookie', user1Cookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const conn = await prisma.oAuthConnection.findUnique({
          where: {
            userId_provider: {
              userId: user1Id,
              provider: 'google',
            },
          },
        });
        expect(conn).toBeNull();
      });

      it('allows logging in with the newly set password', async () => {
        const res = await request(app).post('/api/auth/login').send({
          email: googleEmailUser1,
          password: 'NewSecurePassword123!',
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.email).toBe(googleEmailUser1);
      });
    });
  }
);
