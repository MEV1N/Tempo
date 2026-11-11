import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db';

describe(
  'Tempo Phase 6 — PWA, Background Planning & Push Notifications Integration Tests',
  { timeout: 35000 },
  () => {
    const app = createApp();

    const userAEmail = `phase6_userA_${Date.now()}@example.com`;
    const userBEmail = `phase6_userB_${Date.now()}@example.com`;
    const password = 'Password123!';

    let userAId: string;
    let userBId: string;
    let userACookie: string;
    let userBCookie: string;

    const testEndpoint = `https://fcm.googleapis.com/fcm/send/test-sub-${Date.now()}`;
    let createdNotificationId: string;

    beforeAll(async () => {
      // 1. Register User A
      const regA = await request(app).post('/api/auth/register').send({
        name: 'Phase 6 User A',
        email: userAEmail,
        password,
      });
      userAId = regA.body.data.user.id;
      userACookie = regA.headers['set-cookie'][0];

      // Configure Preferences for User A
      await request(app).put('/api/preferences').set('Cookie', userACookie).send({
        timezone: 'Asia/Kolkata',
        wakeTime: '07:00',
        sleepTime: '23:00',
        preferredWorkStart: '09:00',
        preferredWorkEnd: '18:00',
      });

      // 2. Register User B
      const regB = await request(app).post('/api/auth/register').send({
        name: 'Phase 6 User B',
        email: userBEmail,
        password,
      });
      userBId = regB.body.data.user.id;
      userBCookie = regB.headers['set-cookie'][0];

      // 3. Create active task for User A
      await request(app).post('/api/tasks').set('Cookie', userACookie).send({
        title: 'Operating Systems Preparation',
        estimatedMinutes: 60,
        priority: 'HIGH',
      });
    }, 35000);

    afterAll(async () => {
      const userIds = [userAId, userBId].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.pushSubscription.deleteMany({
          where: { userId: { in: userIds } },
        });
        await prisma.notification.deleteMany({
          where: { userId: { in: userIds } },
        });
        await prisma.scheduleBlock.deleteMany({
          where: { userId: { in: userIds } },
        });
        await prisma.schedule.deleteMany({
          where: { userId: { in: userIds } },
        });
        await prisma.task.deleteMany({
          where: { userId: { in: userIds } },
        });
        await prisma.session.deleteMany({
          where: { userId: { in: userIds } },
        });
        await prisma.userPreference.deleteMany({
          where: { userId: { in: userIds } },
        });
        await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        });
      }
    }, 35000);

    describe('1. VAPID Configuration Endpoint', () => {
      it('returns the public VAPID key without requiring authentication', async () => {
        const res = await request(app).get('/api/notifications/vapid-public-key');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(typeof res.body.data.publicKey).toBe('string');
        expect(res.body.data.publicKey.length).toBeGreaterThan(20);
      });
    });

    describe('2. Web Push Subscriptions', () => {
      it('registers a push subscription for the user', async () => {
        const res = await request(app)
          .post('/api/notifications/subscribe')
          .set('Cookie', userACookie)
          .send({
            endpoint: testEndpoint,
            keys: {
              p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYcAO03nx954v_BGfCgTXBCScZZlq9nzRox--YZhnn',
              auth: 'tBHItJI5svbpez7KI4CCXg',
            },
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.endpoint).toBe(testEndpoint);
        expect(res.body.data.userId).toBe(userAId);
      });

      it('lists active subscriptions for the user', async () => {
        const res = await request(app)
          .get('/api/notifications/subscriptions')
          .set('Cookie', userACookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].endpoint).toBe(testEndpoint);
      });

      it('does not expose User A subscriptions to User B', async () => {
        const res = await request(app)
          .get('/api/notifications/subscriptions')
          .set('Cookie', userBCookie);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(0);
      });
    });

    describe('3. Notification Preferences & User Controls', () => {
      it('retrieves default notification preferences', async () => {
        const res = await request(app)
          .get('/api/notifications/preferences')
          .set('Cookie', userACookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.pushNotificationsEnabled).toBe(true);
        expect(res.body.data.autoNightlyPlanningEnabled).toBe(true);
        expect(res.body.data.preferredPlanningTime).toBe('21:00');
      });

      it('updates user notification preferences', async () => {
        const res = await request(app)
          .put('/api/notifications/preferences')
          .set('Cookie', userACookie)
          .send({
            notifyTaskReminders: false,
            preferredPlanningTime: '21:30',
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.notifyTaskReminders).toBe(false);
        expect(res.body.data.preferredPlanningTime).toBe('21:30');
      });
    });

    describe('4. Automatic Nightly Planning & Safe Schedule Lifecycle', () => {
      it('retrieves current planning status', async () => {
        const res = await request(app).get('/api/planning/status').set('Cookie', userACookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(typeof res.body.data.tomorrowDate).toBe('string');
        expect(res.body.data.autoPlanningEnabled).toBe(true);
      });

      it('manually triggers planning and generates proposed schedule for tomorrow', async () => {
        const res = await request(app)
          .post('/api/planning/trigger')
          .set('Cookie', userACookie)
          .send({});

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('READY');
        expect(typeof res.body.data.scheduleId).toBe('string');

        // Verify schedule was saved as PROPOSED in database
        const schedule = await prisma.schedule.findUnique({
          where: { id: res.body.data.scheduleId },
        });
        expect(schedule).toBeDefined();
        expect(schedule?.status).toBe('PROPOSED');
      });

      it('creates a TOMORROW_PLAN_READY notification upon schedule preparation', async () => {
        const res = await request(app).get('/api/notifications').set('Cookie', userACookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.notifications.length).toBeGreaterThanOrEqual(1);

        const notif = res.body.data.notifications.find(
          (n: any) => n.type === 'TOMORROW_PLAN_READY'
        );
        expect(notif).toBeDefined();
        expect(notif.title).toContain("Tomorrow's Plan");
        expect(notif.readAt).toBeNull();

        createdNotificationId = notif.id;
      });

      it('NEVER overwrites an existing confirmed schedule during planning', async () => {
        const statusRes = await request(app).get('/api/planning/status').set('Cookie', userACookie);
        const scheduleId = statusRes.body.data.scheduleId;

        // 1. User confirms tomorrow's schedule
        await request(app).post(`/api/schedule/${scheduleId}/confirm`).set('Cookie', userACookie);

        // 2. Nightly planning runs again for the same date
        const res = await request(app)
          .post('/api/planning/trigger')
          .set('Cookie', userACookie)
          .send({ forceRegenerate: false });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('CONFIRMED');
        expect(res.body.data.scheduleId).toBe(scheduleId);

        // Verify schedule remains CONFIRMED
        const schedule = await prisma.schedule.findUnique({
          where: { id: scheduleId },
        });
        expect(schedule?.status).toBe('CONFIRMED');
      });

      it('returns NO_TASKS gracefully when user has no active tasks or sessions', async () => {
        // User B has no tasks, timetables, or events
        const res = await request(app)
          .post('/api/planning/trigger')
          .set('Cookie', userBCookie)
          .send({});

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('NO_TASKS');
      });
    });

    describe('5. Notification Center Operations & Isolation', () => {
      it('marks a notification as read', async () => {
        const res = await request(app)
          .patch(`/api/notifications/${createdNotificationId}/read`)
          .set('Cookie', userACookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.readAt).not.toBeNull();
      });

      it('marks all notifications as read', async () => {
        const res = await request(app)
          .post('/api/notifications/read-all')
          .set('Cookie', userACookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const check = await request(app)
          .get('/api/notifications?unreadOnly=true')
          .set('Cookie', userACookie);
        expect(check.body.data.notifications.length).toBe(0);
        expect(check.body.data.unreadCount).toBe(0);
      });

      it('prevents User B from accessing or modifying User A notification', async () => {
        const res = await request(app)
          .patch(`/api/notifications/${createdNotificationId}/read`)
          .set('Cookie', userBCookie);

        expect(res.status).toBe(404);
      });

      it('allows User A to delete their notification', async () => {
        const res = await request(app)
          .delete(`/api/notifications/${createdNotificationId}`)
          .set('Cookie', userACookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('unsubscribes push subscription on request', async () => {
        const res = await request(app)
          .delete('/api/notifications/subscribe')
          .set('Cookie', userACookie)
          .send({ endpoint: testEndpoint });

        expect(res.status).toBe(200);

        const check = await request(app)
          .get('/api/notifications/subscriptions')
          .set('Cookie', userACookie);
        expect(check.body.data.length).toBe(0);
      });
    });
  }
);
