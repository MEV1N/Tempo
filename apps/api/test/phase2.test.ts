import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db';

describe('Phase 2: Task Management & College Calendar Integration', () => {
  const app = createApp();

  let userACookie: string[];
  let userBCookie: string[];
  let userAId: string;
  let userBId: string;

  const testEmailA = `tempo-phase2-a-${Date.now()}@example.com`;
  const testEmailB = `tempo-phase2-b-${Date.now()}@example.com`;
  const password = 'Password123!@#';

  beforeAll(async () => {
    // Register User A
    const regA = await request(app).post('/api/auth/register').send({
      name: 'User A Phase 2',
      email: testEmailA,
      password,
    });
    userACookie = regA.headers['set-cookie'];
    userAId = regA.body.data.user.id;

    // Register User B
    const regB = await request(app).post('/api/auth/register').send({
      name: 'User B Phase 2',
      email: testEmailB,
      password,
    });
    userBCookie = regB.headers['set-cookie'];
    userBId = regB.body.data.user.id;
  });

  afterAll(async () => {
    // Clean up test users and their cascade records from Neon
    if (userAId || userBId) {
      await prisma.user.deleteMany({
        where: { id: { in: [userAId, userBId].filter(Boolean) } },
      });
    }
    await prisma.$disconnect();
  });

  // ==========================================
  // PART A: TASK CATEGORIES
  // ==========================================
  describe('Task Categories', () => {
    let categoryAId: string;

    it('creates a new category for User A', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Cookie', userACookie)
        .send({ name: 'Computer Science', color: '#6366f1' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Computer Science');
      expect(res.body.data.color).toBe('#6366f1');
      categoryAId = res.body.data.id;
    });

    it('rejects duplicate category name for the same user', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Cookie', userACookie)
        .send({ name: 'Computer Science', color: '#38bdf8' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CATEGORY_ALREADY_EXISTS');
    });

    it('allows User B to use the same category name (scoped per user)', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Cookie', userBCookie)
        .send({ name: 'Computer Science', color: '#10b981' });

      expect(res.status).toBe(201);
      expect(res.body.data.userId).toBe(userBId);
    });

    it('updates an existing category', async () => {
      const res = await request(app)
        .put(`/api/categories/${categoryAId}`)
        .set('Cookie', userACookie)
        .send({ name: 'CS & Algorithms', color: '#818cf8' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('CS & Algorithms');
      expect(res.body.data.color).toBe('#818cf8');
    });

    it('enforces multi-user isolation on category modification', async () => {
      // User B attempts to edit User A category
      const res = await request(app)
        .put(`/api/categories/${categoryAId}`)
        .set('Cookie', userBCookie)
        .send({ name: 'Hacked Category' });

      expect(res.status).toBe(404);
    });
  });

  // ==========================================
  // PART B: TASKS CRUD & FILTERING
  // ==========================================
  describe('Tasks Management', () => {
    let taskId: string;
    let categoryId: string;

    beforeAll(async () => {
      const catRes = await request(app)
        .post('/api/categories')
        .set('Cookie', userACookie)
        .send({ name: 'Projects', color: '#f59e0b' });
      categoryId = catRes.body.data.id;
    });

    it('creates a task with duration, priority, preferred time, and category', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await request(app).post('/api/tasks').set('Cookie', userACookie).send({
        title: 'Implement Dijkstra Algorithm',
        description: 'Homework for graphs module',
        categoryId,
        estimatedMinutes: 60,
        priority: 'HIGH',
        preferredTime: 'MORNING',
        energyRequirement: 'HIGH',
        canSplit: true,
        minSessionMinutes: 30,
        dueDate: tomorrow.toISOString(),
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Implement Dijkstra Algorithm');
      expect(res.body.data.estimatedMinutes).toBe(60);
      expect(res.body.data.priority).toBe('HIGH');
      expect(res.body.data.preferredTime).toBe('MORNING');
      expect(res.body.data.status).toBe('TODO');
      expect(res.body.data.completedAt).toBeNull();
      taskId = res.body.data.id;
    });

    it('updates task status and sets completion timestamp', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set('Cookie', userACookie)
        .send({ status: 'COMPLETED' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('COMPLETED');
      expect(res.body.data.completedAt).not.toBeNull();
    });

    it('un-completes a task and resets completion timestamp', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set('Cookie', userACookie)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('IN_PROGRESS');
      expect(res.body.data.completedAt).toBeNull();
    });

    it('filters tasks by status, priority, and category', async () => {
      const res = await request(app)
        .get(`/api/tasks?priority=HIGH&status=IN_PROGRESS&categoryId=${categoryId}`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.data.tasks.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.tasks[0].id).toBe(taskId);
    });

    it('searches tasks by title and description', async () => {
      const res = await request(app).get('/api/tasks?search=Dijkstra').set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.data.tasks.length).toBe(1);
      expect(res.body.data.tasks[0].title).toContain('Dijkstra');
    });

    it('provides aggregated task overview statistics', async () => {
      const res = await request(app).get('/api/tasks/overview').set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.data.totalActive).toBeGreaterThanOrEqual(1);
      expect(res.body.data.byPriority.HIGH).toBeGreaterThanOrEqual(1);
    });

    it('prevents User B from accessing or updating User A tasks', async () => {
      const getRes = await request(app).get(`/api/tasks/${taskId}`).set('Cookie', userBCookie);
      expect(getRes.status).toBe(404);

      const updateRes = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Cookie', userBCookie)
        .send({ title: 'Hacked Title' });
      expect(updateRes.status).toBe(404);

      const deleteRes = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Cookie', userBCookie);
      expect(deleteRes.status).toBe(404);
    }, 15000);
  });

  // ==========================================
  // PART C: RECURRING TASKS
  // ==========================================
  describe('Recurring Task Series', () => {
    let seriesId: string;

    it('creates recurring task series and generates initial task instances idempotently', async () => {
      const startDate = new Date();

      const res = await request(app).post('/api/recurring-tasks').set('Cookie', userACookie).send({
        title: 'Daily LeetCode Practice',
        estimatedMinutes: 30,
        priority: 'MEDIUM',
        frequency: 'DAILY',
        interval: 1,
        startDate: startDate.toISOString(),
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.series.title).toBe('Daily LeetCode Practice');
      expect(res.body.data.generatedCount).toBeGreaterThan(0);
      seriesId = res.body.data.series.id;

      // Verify that task instances linked to series were created in tasks table
      const tasksRes = await request(app)
        .get(`/api/tasks?search=LeetCode`)
        .set('Cookie', userACookie);
      expect(tasksRes.body.data.tasks.length).toBeGreaterThan(0);
    }, 15000);

    it('deletes recurring series while preserving completed instances', async () => {
      // Mark one instance completed
      const tasksRes = await request(app)
        .get(`/api/tasks?search=LeetCode`)
        .set('Cookie', userACookie);
      const firstTask = tasksRes.body.data.tasks[0];

      await request(app)
        .patch(`/api/tasks/${firstTask.id}/status`)
        .set('Cookie', userACookie)
        .send({ status: 'COMPLETED' });

      // Delete series
      const delRes = await request(app)
        .delete(`/api/recurring-tasks/${seriesId}?preserveCompleted=true`)
        .set('Cookie', userACookie);
      expect(delRes.status).toBe(200);

      // Completed instance should still exist in database
      const verifyRes = await request(app)
        .get(`/api/tasks/${firstTask.id}`)
        .set('Cookie', userACookie);
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.status).toBe('COMPLETED');
    }, 15000);
  });

  // ==========================================
  // PART D: COLLEGE TIMETABLE & OVERLAP VALIDATION
  // ==========================================
  describe('College Timetable', () => {
    let timetableId: string;
    let sessionId: string;

    it('retrieves active timetable or auto-provisions one', async () => {
      const res = await request(app).get('/api/timetables').set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      timetableId = res.body.data.id;
    });

    it('adds a class session to Monday (09:00 - 10:30)', async () => {
      const res = await request(app)
        .post(`/api/timetables/${timetableId}/sessions`)
        .set('Cookie', userACookie)
        .send({
          title: 'Database Systems Lecture',
          dayOfWeek: 1, // Monday
          startTime: '09:00',
          endTime: '10:30',
          sessionType: 'CLASS',
          location: 'Hall A-1',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Database Systems Lecture');
      sessionId = res.body.data.id;
    });

    it('adds an adjacent non-overlapping session on the same day (10:30 - 12:00)', async () => {
      const res = await request(app)
        .post(`/api/timetables/${timetableId}/sessions`)
        .set('Cookie', userACookie)
        .send({
          title: 'Database Lab',
          dayOfWeek: 1,
          startTime: '10:30',
          endTime: '12:00',
          sessionType: 'LAB',
          location: 'Lab Room 3',
        });

      expect(res.status).toBe(201);
    });

    it('rejects an overlapping session on the same day (10:00 - 11:00)', async () => {
      const res = await request(app)
        .post(`/api/timetables/${timetableId}/sessions`)
        .set('Cookie', userACookie)
        .send({
          title: 'Conflicting Seminar',
          dayOfWeek: 1,
          startTime: '10:00',
          endTime: '11:00',
          sessionType: 'CLASS',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('SESSION_OVERLAP_CONFLICT');
    });

    it('rejects a session where endTime is before startTime', async () => {
      const res = await request(app)
        .post(`/api/timetables/${timetableId}/sessions`)
        .set('Cookie', userACookie)
        .send({
          title: 'Invalid Timing Session',
          dayOfWeek: 2,
          startTime: '15:00',
          endTime: '14:00',
          sessionType: 'CLASS',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('deletes a session by id', async () => {
      const res = await request(app)
        .delete(`/api/timetables/sessions/${sessionId}`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================
  // PART E: CALENDAR EVENTS & EXCEPTIONS
  // ==========================================
  describe('Calendar Events & Exceptions', () => {
    let eventId: string;

    it('creates a calendar event (e.g. Midterm Exam)', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const start = new Date(tomorrow);
      start.setHours(14, 0, 0, 0);
      const end = new Date(tomorrow);
      end.setHours(16, 0, 0, 0);

      const res = await request(app).post('/api/calendar/events').set('Cookie', userACookie).send({
        title: 'Midterm Exam - Operating Systems',
        eventType: 'EXAM',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        location: 'Auditorium 2',
        isAllDay: false,
      });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Midterm Exam - Operating Systems');
      expect(res.body.data.eventType).toBe('EXAM');
      eventId = res.body.data.id;
    });

    it('creates a calendar exception for a holiday', async () => {
      const holidayDate = new Date();
      holidayDate.setDate(holidayDate.getDate() + 3);
      const dateStr = holidayDate.toISOString().slice(0, 10);

      const res = await request(app)
        .post('/api/calendar/exceptions')
        .set('Cookie', userACookie)
        .send({
          date: dateStr,
          exceptionType: 'HOLIDAY',
          isFullDay: true,
          title: 'Campus Founder Day',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.exceptionType).toBe('HOLIDAY');
      expect(res.body.data.isFullDay).toBe(true);
    });

    it('retrieves unified schedule view combining timetable and events', async () => {
      const start = new Date();
      start.setDate(start.getDate() - 1);
      const end = new Date();
      end.setDate(end.getDate() + 7);

      const res = await request(app)
        .get(
          `/api/calendar/view?startDate=${encodeURIComponent(start.toISOString())}&endDate=${encodeURIComponent(end.toISOString())}`
        )
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      // Verify the exam event is present
      const foundExam = res.body.data.find(
        (item: any) => item.sourceType === 'CALENDAR_EVENT' && item.itemType === 'EXAM'
      );
      expect(foundExam).toBeDefined();
    });

    it('enforces multi-user isolation on calendar items', async () => {
      // User B attempts to delete User A event
      const res = await request(app)
        .delete(`/api/calendar/events/${eventId}`)
        .set('Cookie', userBCookie);

      expect(res.status).toBe(404);
    });
  });

  // ==========================================
  // PART F: UNPROTECTED / UNAUTHENTICATED CALLS
  // ==========================================
  describe('Security & Unauthenticated Guard', () => {
    it('rejects unauthenticated requests to task endpoints', async () => {
      const res = await request(app).get('/api/tasks');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects unauthenticated requests to timetable endpoints', async () => {
      const res = await request(app).get('/api/timetables');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects unauthenticated requests to calendar endpoints', async () => {
      const res = await request(app).get('/api/calendar/view');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });
  });
});
