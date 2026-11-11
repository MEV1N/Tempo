import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db';

describe('Tempo Phase 3 — Intelligent Scheduling Engine Integration Tests', () => {
  const app = createApp();

  const userAEmail = `phase3_userA_${Date.now()}@example.com`;
  const userBEmail = `phase3_userB_${Date.now()}@example.com`;
  const password = 'Password123!';

  let userAId: string;
  let userBId: string;
  let userACookie: string;
  let userBCookie: string;

  beforeAll(async () => {
    // Register User A
    const regA = await request(app).post('/api/auth/register').send({
      name: 'Scheduler User A',
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

    // Register User B
    const regB = await request(app).post('/api/auth/register').send({
      name: 'Scheduler User B',
      email: userBEmail,
      password,
    });
    userBId = regB.body.data.user.id;
    userBCookie = regB.headers['set-cookie'][0];
  }, 20000);

  afterAll(async () => {
    // Clean up test data safely without affecting existing users
    try {
      if (userAId) {
        await prisma.user.delete({ where: { id: userAId } }).catch(() => null);
      }
      if (userBId) {
        await prisma.user.delete({ where: { id: userBId } }).catch(() => null);
      }
    } catch {
      // Ignored
    }
  }, 20000);

  // ==========================================
  // PART A: UNAUTHENTICATED GUARDS
  // ==========================================
  describe('Security & Route Guards', () => {
    it('rejects unauthenticated schedule generation with 401', async () => {
      const res = await request(app)
        .post('/api/schedule/generate')
        .send({ targetDate: '2026-11-16' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects unauthenticated schedule retrieval with 401', async () => {
      const res = await request(app).get('/api/schedule?date=2026-11-16');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('validates request payload (requires valid YYYY-MM-DD targetDate)', async () => {
      const res = await request(app)
        .post('/api/schedule/generate')
        .set('Cookie', userACookie)
        .send({ targetDate: 'invalid-date-format' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // PART B: SCHEDULE GENERATION & COLLEGE TIMETABLE
  // ==========================================
  describe('Schedule Generation with Timetable, Events & Tasks', () => {
    const mondayDate = '2026-11-16'; // Monday

    it('sets up timetable and tasks for User A', async () => {
      // 1. Get/create active timetable
      const ttRes = await request(app).get('/api/timetables').set('Cookie', userACookie);
      const timetableId = ttRes.body.data.id;

      // Add a Monday class session: 09:00 - 11:00
      await request(app)
        .post(`/api/timetables/${timetableId}/sessions`)
        .set('Cookie', userACookie)
        .send({
          title: 'Algorithms Lecture',
          dayOfWeek: 1, // Monday
          startTime: '09:00',
          endTime: '11:00',
          sessionType: 'CLASS',
          location: 'Hall 101',
        });

      // 2. Add tasks
      await request(app).post('/api/tasks').set('Cookie', userACookie).send({
        title: 'Complete Homework 1',
        estimatedMinutes: 60,
        priority: 'HIGH',
        status: 'TODO',
        preferredTime: 'AFTERNOON',
      });

      await request(app).post('/api/tasks').set('Cookie', userACookie).send({
        title: 'Read Textbook Chapter',
        estimatedMinutes: 60,
        priority: 'MEDIUM',
        status: 'TODO',
        preferredTime: 'EVENING',
      });
    }, 15000);

    it('generates a valid, non-overlapping schedule for Monday', async () => {
      const res = await request(app)
        .post('/api/schedule/generate')
        .set('Cookie', userACookie)
        .send({
          targetDate: mondayDate,
          options: {
            includeMeals: true,
            includeLeisure: true,
            includeFreeTimeBlocks: true,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const schedule = res.body.data;
      expect(schedule.date).toBe(mondayDate);
      expect(schedule.status).toBe('PROPOSED');
      expect(schedule.blocks.length).toBeGreaterThan(0);

      // Verify college class is present
      const collegeBlock = schedule.blocks.find((b: any) => b.blockType === 'COLLEGE');
      expect(collegeBlock).toBeDefined();
      expect(collegeBlock.title).toBe('Algorithms Lecture');
      expect(collegeBlock.startTime).toBe('09:00');
      expect(collegeBlock.endTime).toBe('11:00');

      // Verify task blocks are present
      const taskBlocks = schedule.blocks.filter((b: any) => b.blockType === 'TASK');
      expect(taskBlocks.length).toBeGreaterThanOrEqual(2);

      // Verify no overlaps in returned blocks
      for (let i = 1; i < schedule.blocks.length; i++) {
        const prev = schedule.blocks[i - 1];
        const curr = schedule.blocks[i];
        expect(curr.startTime >= prev.endTime).toBe(true);
      }
    }, 15000);

    it('retrieves the generated schedule via GET /api/schedule', async () => {
      const res = await request(app)
        .get(`/api/schedule?date=${mondayDate}`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.date).toBe(mondayDate);
      expect(res.body.data.blocks.length).toBeGreaterThan(0);
      expect(res.body.data.metrics).toBeDefined();
    });

    it('honors full-day holiday exception by freeing up college hours', async () => {
      // Create holiday exception on Tuesday (2026-11-17)
      const tuesdayDate = '2026-11-17';

      // First add a Tuesday class
      const ttRes = await request(app).get('/api/timetables').set('Cookie', userACookie);
      const timetableId = ttRes.body.data.id;

      await request(app)
        .post(`/api/timetables/${timetableId}/sessions`)
        .set('Cookie', userACookie)
        .send({
          title: 'Physics Lab',
          dayOfWeek: 2, // Tuesday
          startTime: '10:00',
          endTime: '13:00',
          sessionType: 'LAB',
        });

      // Add full-day holiday exception
      await request(app).post('/api/calendar/exceptions').set('Cookie', userACookie).send({
        date: tuesdayDate,
        exceptionType: 'HOLIDAY',
        isFullDay: true,
        title: "Founder's Day Holiday",
      });

      // Generate schedule for Tuesday
      const res = await request(app)
        .post('/api/schedule/generate')
        .set('Cookie', userACookie)
        .send({ targetDate: tuesdayDate });

      expect(res.status).toBe(200);
      const schedule = res.body.data;

      // No college classes should appear on a full day holiday
      const collegeBlocks = schedule.blocks.filter((b: any) => b.blockType === 'COLLEGE');
      expect(collegeBlocks.length).toBe(0);
    }, 15000);

    it('respects fixed calendar events and avoids overlaps', async () => {
      const wednesdayDate = '2026-11-18';

      // Add fixed calendar event on Wednesday: 14:00 - 16:00
      await request(app)
        .post('/api/calendar/events')
        .set('Cookie', userACookie)
        .send({
          title: 'Doctor Appointment',
          startTime: `${wednesdayDate}T14:00:00.000Z`,
          endTime: `${wednesdayDate}T16:00:00.000Z`,
          isAllDay: false,
          eventType: 'APPOINTMENT',
        });

      const res = await request(app)
        .post('/api/schedule/generate')
        .set('Cookie', userACookie)
        .send({ targetDate: wednesdayDate });

      expect(res.status).toBe(200);
      const schedule = res.body.data;

      const eventBlock = schedule.blocks.find((b: any) => b.title === 'Doctor Appointment');
      expect(eventBlock).toBeDefined();
      expect(eventBlock.startTime).toBe('14:00');
      expect(eventBlock.endTime).toBe('16:00');

      // No other block should overlap with 14:00 - 16:00
      for (const b of schedule.blocks) {
        if (b.id !== eventBlock.id) {
          const overlaps = b.startTime < '16:00' && b.endTime > '14:00';
          expect(overlaps).toBe(false);
        }
      }
    }, 15000);
  });

  // ==========================================
  // PART C: MULTI-USER ISOLATION
  // ==========================================
  describe('Multi-User Data Isolation', () => {
    it("ensures User B cannot view User A's generated schedule", async () => {
      const res = await request(app)
        .get('/api/schedule?date=2026-11-16')
        .set('Cookie', userBCookie);

      expect(res.status).toBe(200);
      // User B has not generated a schedule for this date yet
      expect(res.body.data).toBeNull();
    });

    it("ensures User B generating a schedule operates on User B's data only", async () => {
      // User B adds a unique task
      await request(app).post('/api/tasks').set('Cookie', userBCookie).send({
        title: 'User B Exclusive Task',
        estimatedMinutes: 45,
        priority: 'URGENT',
        status: 'TODO',
      });

      const res = await request(app)
        .post('/api/schedule/generate')
        .set('Cookie', userBCookie)
        .send({ targetDate: '2026-11-16' });

      expect(res.status).toBe(200);
      const scheduleB = res.body.data;

      expect(scheduleB.userId).toBe(userBId);
      const userBTask = scheduleB.blocks.find((b: any) => b.title === 'User B Exclusive Task');
      expect(userBTask).toBeDefined();

      // User A's tasks must not appear in User B's schedule
      const userATaskInB = scheduleB.blocks.find((b: any) => b.title === 'Complete Homework 1');
      expect(userATaskInB).toBeUndefined();
    }, 15000);
  });
});
