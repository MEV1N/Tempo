import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db';

describe(
  'Tempo Phase 5 — Activity Tracking & Productivity Analytics Integration Tests',
  { timeout: 35000 },
  () => {
    const app = createApp();

    const userAEmail = `phase5_userA_${Date.now()}@example.com`;
    const userBEmail = `phase5_userB_${Date.now()}@example.com`;
    const password = 'Password123!';

    let userAId: string;
    let userBId: string;
    let userACookie: string;
    let userBCookie: string;

    const testDate = new Date().toISOString().substring(0, 10);
    let createdActivityId: string;
    let taskId: string;

    beforeAll(async () => {
      // 1. Register User A
      const regA = await request(app).post('/api/auth/register').send({
        name: 'Phase 5 User A',
        email: userAEmail,
        password,
      });
      userAId = regA.body.data.user.id;
      userACookie = regA.headers['set-cookie'][0];

      // Configure Preferences for User A
      await request(app).put('/api/preferences').set('Cookie', userACookie).send({
        wakeTime: '07:00',
        sleepTime: '23:00',
        preferredWorkStart: '09:00',
        preferredWorkEnd: '18:00',
        breakfastTime: '08:00',
        lunchTime: '13:00',
        dinnerTime: '20:00',
        preferredBreakDuration: 15,
        maxContinuousWorkDuration: 90,
        dailyLeisureTarget: 60,
      });

      // 2. Register User B
      const regB = await request(app).post('/api/auth/register').send({
        name: 'Phase 5 User B',
        email: userBEmail,
        password,
      });
      userBId = regB.body.data.user.id;
      userBCookie = regB.headers['set-cookie'][0];

      // 3. Create a task for User A
      const taskRes = await request(app).post('/api/tasks').set('Cookie', userACookie).send({
        title: 'Operating Systems Revision',
        estimatedMinutes: 60,
        priority: 'HIGH',
        energyRequirement: 'HIGH',
      });
      taskId = taskRes.body.data.id;
    }, 35000);

    afterAll(async () => {
      // Clean up test data
      const userIds = [userAId, userBId].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.activitySession.deleteMany({
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

    describe('1. Activity Tracking CRUD', () => {
      it('creates a valid activity session', async () => {
        const startTime = `${testDate}T10:00:00.000Z`;
        const endTime = `${testDate}T11:00:00.000Z`;

        const res = await request(app).post('/api/activities').set('Cookie', userACookie).send({
          title: 'Deep Work on OS Virtual Memory',
          category: 'STUDY',
          taskId,
          startTime,
          endTime,
          durationMinutes: 60,
          date: testDate,
          notes: 'Completed paging and segmentation review',
          completedAsPlanned: true,
        });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.title).toBe('Deep Work on OS Virtual Memory');
        expect(res.body.data.category).toBe('STUDY');
        expect(res.body.data.durationMinutes).toBe(60);
        expect(res.body.data.taskId).toBe(taskId);
        expect(res.body.data.taskTitle).toBe('Operating Systems Revision');
        expect(res.body.data.completedAsPlanned).toBe(true);

        createdActivityId = res.body.data.id;
      });

      it('rejects an activity session when start time >= end time', async () => {
        const res = await request(app)
          .post('/api/activities')
          .set('Cookie', userACookie)
          .send({
            title: 'Invalid Time Activity',
            category: 'STUDY',
            startTime: `${testDate}T12:00:00.000Z`,
            endTime: `${testDate}T11:00:00.000Z`,
          });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('INVALID_INTERVAL');
      });

      it('lists activities with date filtering', async () => {
        const res = await request(app)
          .get(`/api/activities?date=${testDate}`)
          .set('Cookie', userACookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        expect(res.body.data[0].id).toBe(createdActivityId);
      });

      it('retrieves an activity session by ID', async () => {
        const res = await request(app)
          .get(`/api/activities/${createdActivityId}`)
          .set('Cookie', userACookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(createdActivityId);
        expect(res.body.data.notes).toBe('Completed paging and segmentation review');
      });

      it('updates an existing activity session', async () => {
        const res = await request(app)
          .patch(`/api/activities/${createdActivityId}`)
          .set('Cookie', userACookie)
          .send({
            notes: 'Updated notes: solved 5 past exam questions',
            durationMinutes: 75,
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.notes).toBe('Updated notes: solved 5 past exam questions');
        expect(res.body.data.durationMinutes).toBe(75);
      });
    });

    describe('2. Planned vs Actual Productivity Comparison', () => {
      it('compares planned schedule blocks and recorded activities', async () => {
        // 1. Generate schedule for testDate
        const genRes = await request(app)
          .post('/api/schedule/generate')
          .set('Cookie', userACookie)
          .send({ targetDate: testDate });

        expect(genRes.status).toBe(200);
        const scheduleId = genRes.body.data.id;

        // 2. Confirm the schedule
        await request(app).post(`/api/schedule/${scheduleId}/confirm`).set('Cookie', userACookie);

        // 3. Request planned vs actual comparison
        const res = await request(app)
          .get(`/api/analytics/planned-vs-actual?date=${testDate}`)
          .set('Cookie', userACookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.date).toBe(testDate);
        expect(res.body.data.totalActualMinutes).toBeGreaterThanOrEqual(75);
        expect(Array.isArray(res.body.data.items)).toBe(true);
        expect(res.body.data.items.length).toBeGreaterThan(0);
      });

      it('accurately identifies unplanned activities', async () => {
        // Log an unplanned personal activity
        await request(app)
          .post('/api/activities')
          .set('Cookie', userACookie)
          .send({
            title: 'Unplanned Grocery Run',
            category: 'PERSONAL',
            startTime: `${testDate}T18:00:00.000Z`,
            endTime: `${testDate}T18:45:00.000Z`,
            durationMinutes: 45,
            date: testDate,
          });

        const res = await request(app)
          .get(`/api/analytics/planned-vs-actual?date=${testDate}`)
          .set('Cookie', userACookie);

        expect(res.status).toBe(200);
        expect(res.body.data.unplannedActivitiesCount).toBeGreaterThanOrEqual(1);

        const unplannedItem = res.body.data.items.find(
          (i: any) => i.title === 'Unplanned Grocery Run'
        );
        expect(unplannedItem).toBeDefined();
        expect(unplannedItem.status).toBe('UNPLANNED');
        expect(unplannedItem.plannedMinutes).toBe(0);
        expect(unplannedItem.actualMinutes).toBe(45);
      });
    });

    describe('3. 365-Day Productivity Heatmap', () => {
      it('returns a 365-day heatmap with intensity levels and streak counts', async () => {
        const res = await request(app).get('/api/analytics/heatmap').set('Cookie', userACookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.days.length).toBe(365);
        expect(res.body.data.totalRecordedMinutes).toBeGreaterThan(0);
        expect(res.body.data.totalRecordedHours).toBeGreaterThan(0);
        expect(res.body.data.activeDaysCount).toBeGreaterThanOrEqual(1);
        expect(res.body.data.currentStreakDays).toBeGreaterThanOrEqual(1);
        expect(res.body.data.longestStreakDays).toBeGreaterThanOrEqual(1);

        const todayEntry = res.body.data.days[res.body.data.days.length - 1];
        expect(todayEntry.date).toBe(testDate);
        expect(todayEntry.intensity).toBeGreaterThan(0);
      });
    });

    describe('4. Weekly & Monthly Productivity Analytics', () => {
      it('generates weekly productivity analytics with category breakdown and daily trends', async () => {
        const res = await request(app)
          .get('/api/analytics/summary?period=week')
          .set('Cookie', userACookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.period).toBe('week');
        expect(res.body.data.totalMinutes).toBeGreaterThan(0);
        expect(Array.isArray(res.body.data.categories)).toBe(true);
        expect(res.body.data.categories.length).toBe(7); // 7 activity categories
        expect(res.body.data.dailyTrends.length).toBe(7);
        expect(res.body.data.consistency.activeDays).toBeGreaterThanOrEqual(1);
        expect(res.body.data.consistency.totalDaysInPeriod).toBe(7);
      });

      it('generates monthly productivity analytics with 30-day trends', async () => {
        const res = await request(app)
          .get('/api/analytics/summary?period=month')
          .set('Cookie', userACookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.period).toBe('month');
        expect(res.body.data.dailyTrends.length).toBe(30);
        expect(res.body.data.consistency.totalDaysInPeriod).toBe(30);
      });
    });

    describe('5. Multi-User Isolation & Security', () => {
      it('does not allow User B to see User A activities', async () => {
        const res = await request(app).get('/api/activities').set('Cookie', userBCookie);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(0);
      });

      it('prevents User B from modifying User A activity', async () => {
        const res = await request(app)
          .patch(`/api/activities/${createdActivityId}`)
          .set('Cookie', userBCookie)
          .send({ title: 'Tampered by User B' });

        expect(res.status).toBe(404);
      });

      it('prevents User B from deleting User A activity', async () => {
        const res = await request(app)
          .delete(`/api/activities/${createdActivityId}`)
          .set('Cookie', userBCookie);

        expect(res.status).toBe(404);
      });

      it('requires authentication for analytics and activities', async () => {
        const actRes = await request(app).get('/api/activities');
        expect(actRes.status).toBe(401);

        const heatRes = await request(app).get('/api/analytics/heatmap');
        expect(heatRes.status).toBe(401);

        const planRes = await request(app).get('/api/analytics/planned-vs-actual');
        expect(planRes.status).toBe(401);
      });

      it('allows User A to delete their own activity session', async () => {
        const res = await request(app)
          .delete(`/api/activities/${createdActivityId}`)
          .set('Cookie', userACookie);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const check = await request(app)
          .get(`/api/activities/${createdActivityId}`)
          .set('Cookie', userACookie);
        expect(check.status).toBe(404);
      });
    });
  }
);
