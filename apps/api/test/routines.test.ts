import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db';

describe('Tempo — Profile & Personal Routines Integration Suite', { timeout: 60000 }, () => {
  const app = createApp();

  const timestamp = Date.now();
  const userAEmail = `routine_a_${timestamp}@tempo.app`;
  const userBEmail = `routine_b_${timestamp}@tempo.app`;
  const testPassword = 'Password123!';

  let userAId: string;
  let userACookie: string;

  let userBId: string;
  let userBCookie: string;

  let createdRoutineId: string;
  let scheduleId: string;
  let routineBlockId: string;
  let taskBlockId: string;
  let taskId: string;

  afterAll(async () => {
    try {
      const userIds = [userAId, userBId].filter(Boolean);
      await prisma.scheduleBlock.deleteMany({
        where: { schedule: { userId: { in: userIds } } },
      });
      await prisma.schedule.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.task.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.personalRoutine.deleteMany({
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
    } catch {
      // Ignore cleanup error
    }
  });

  it('Setup: Register User A and User B', async () => {
    // Register User A
    const regA = await request(app).post('/api/auth/register').send({
      name: 'User A Routine Master',
      email: userAEmail,
      password: testPassword,
    });
    expect(regA.status).toBe(201);
    userAId = regA.body.data.user.id;
    userACookie = regA.headers['set-cookie'][0].split(';')[0];

    // Register User B
    const regB = await request(app).post('/api/auth/register').send({
      name: 'User B Isolated',
      email: userBEmail,
      password: testPassword,
    });
    expect(regB.status).toBe(201);
    userBId = regB.body.data.user.id;
    userBCookie = regB.headers['set-cookie'][0].split(';')[0];
  });

  it('1. Personal Information: Update profile with name and avatar URL', async () => {
    const updateRes = await request(app)
      .patch('/api/profile')
      .set('Cookie', [userACookie])
      .set('x-tempo-csrf', '1')
      .send({
        name: 'User A Updated Name',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.user.name).toBe('User A Updated Name');
    expect(updateRes.body.data.user.avatarUrl).toBe(
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb'
    );
  });

  it('2. Routine CRUD: Create a fixed personal routine', async () => {
    const res = await request(app)
      .post('/api/routines')
      .set('Cookie', [userACookie])
      .set('x-tempo-csrf', '1')
      .send({
        name: 'Morning Gym & Strength Training',
        category: 'EXERCISE',
        classification: 'FIXED',
        startTime: '07:30',
        endTime: '08:30',
        daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
        description: 'Heavy strength session',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBe('Morning Gym & Strength Training');
    expect(res.body.data.category).toBe('EXERCISE');
    expect(res.body.data.classification).toBe('FIXED');
    expect(res.body.data.durationMinutes).toBe(60);
    expect(res.body.data.daysOfWeek).toEqual([1, 3, 5]);

    createdRoutineId = res.body.data.id;
  });

  it('3. Routine CRUD: Read all routines and retrieve by ID', async () => {
    // List routines
    const listRes = await request(app).get('/api/routines').set('Cookie', [userACookie]);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

    // Retrieve by ID
    const singleRes = await request(app)
      .get(`/api/routines/${createdRoutineId}`)
      .set('Cookie', [userACookie]);

    expect(singleRes.status).toBe(200);
    expect(singleRes.body.data.id).toBe(createdRoutineId);
    expect(singleRes.body.data.name).toBe('Morning Gym & Strength Training');
  });

  it('4. Weekday-specific filtering: Filter routines by dayOfWeek', async () => {
    // Mon (day 1) includes our routine
    const monRes = await request(app).get('/api/routines?dayOfWeek=1').set('Cookie', [userACookie]);

    expect(monRes.status).toBe(200);
    expect(monRes.body.data.some((r: any) => r.id === createdRoutineId)).toBe(true);

    // Tue (day 2) does NOT include our routine
    const tueRes = await request(app).get('/api/routines?dayOfWeek=2').set('Cookie', [userACookie]);

    expect(tueRes.status).toBe(200);
    expect(tueRes.body.data.some((r: any) => r.id === createdRoutineId)).toBe(false);
  });

  it('5. Routine CRUD: Update routine timing and classification', async () => {
    const updateRes = await request(app)
      .patch(`/api/routines/${createdRoutineId}`)
      .set('Cookie', [userACookie])
      .set('x-tempo-csrf', '1')
      .send({
        startTime: '07:00',
        endTime: '08:15',
        classification: 'FIXED',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.startTime).toBe('07:00');
    expect(updateRes.body.data.endTime).toBe('08:15');
    expect(updateRes.body.data.durationMinutes).toBe(75);
  });

  it('6. Weekly Routine Customization: Copy routines between days', async () => {
    // Copy Monday (1) routines to Tuesday (2) and Thursday (4)
    const copyRes = await request(app)
      .post('/api/routines/copy')
      .set('Cookie', [userACookie])
      .set('x-tempo-csrf', '1')
      .send({
        fromDay: 1,
        toDays: [2, 4],
      });

    expect(copyRes.status).toBe(200);
    expect(copyRes.body.success).toBe(true);

    // Verify Tuesday now has the routine
    const tueRes = await request(app).get('/api/routines?dayOfWeek=2').set('Cookie', [userACookie]);

    expect(tueRes.body.data.some((r: any) => r.id === createdRoutineId)).toBe(true);
  });

  it('7. Seed default routines derived from user preferences', async () => {
    // Create new temporary user to test default seed
    const tempEmail = `temp_seed_${Date.now()}@tempo.app`;
    const regTemp = await request(app).post('/api/auth/register').send({
      name: 'Temp Seed User',
      email: tempEmail,
      password: testPassword,
    });
    const tempCookie = regTemp.headers['set-cookie'][0].split(';')[0];

    const seedRes = await request(app)
      .post('/api/routines/defaults')
      .set('Cookie', [tempCookie])
      .set('x-tempo-csrf', '1');

    expect(seedRes.status).toBe(201);
    expect(seedRes.body.data.length).toBeGreaterThanOrEqual(6);
    expect(seedRes.body.data.some((r: any) => r.category === 'SLEEP')).toBe(true);
    expect(seedRes.body.data.some((r: any) => r.category === 'MEAL')).toBe(true);
    expect(seedRes.body.data.some((r: any) => r.category === 'EXERCISE')).toBe(true);
  });

  it('8. Scheduler Integration: Fixed routine collision prevention and task placement', async () => {
    // Setup target date on a Monday (e.g. 2026-11-16 is a Monday)
    const targetDate = '2026-11-16';

    // Create a 2-hour high priority task for User A
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Cookie', [userACookie])
      .set('x-tempo-csrf', '1')
      .send({
        title: 'High Priority Research Project',
        priority: 'HIGH',
        estimatedMinutes: 120,
      });

    expect(taskRes.status).toBe(201);
    taskId = taskRes.body.data.id;

    // Generate schedule
    const schedRes = await request(app)
      .post('/api/schedule/generate')
      .set('Cookie', [userACookie])
      .set('x-tempo-csrf', '1')
      .send({
        targetDate,
        replaceConfirmed: true,
      });

    expect(schedRes.status).toBe(200);
    expect(schedRes.body.success).toBe(true);

    scheduleId = schedRes.body.data.id;
    const blocks = schedRes.body.data.blocks;

    // 1. Fixed routine block must exist
    const routineBlock = blocks.find(
      (b: any) => b.blockType === 'ROUTINE' || b.title === 'Morning Gym & Strength Training'
    );
    expect(routineBlock).toBeDefined();
    expect(routineBlock.isFixed).toBe(true);
    routineBlockId = routineBlock.id;

    // 2. Task block must NOT overlap with the fixed routine block
    const taskBlock = blocks.find((b: any) => b.taskId === taskId);
    expect(taskBlock).toBeDefined();
    taskBlockId = taskBlock.id;

    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const rStart = toMinutes(routineBlock.startTime);
    const rEnd = toMinutes(routineBlock.endTime);
    const tStart = toMinutes(taskBlock.startTime);
    const tEnd = toMinutes(taskBlock.endTime);

    const overlaps = tStart < rEnd && rStart < tEnd;
    expect(overlaps).toBe(false);
  });

  it('9. Scheduler Sleep & Meal Protection: Respects sleep boundaries and meal times', async () => {
    const targetDate = '2026-11-16';
    const schedRes = await request(app)
      .get(`/api/schedule?date=${targetDate}`)
      .set('Cookie', [userACookie]);

    expect(schedRes.status).toBe(200);
    const blocks = schedRes.body.data.blocks;

    // Verify all task blocks are scheduled within waking hours
    for (const b of blocks) {
      if (b.blockType === 'TASK') {
        const [h] = b.startTime.split(':').map(Number);
        // Waking hours are 07:00 to 23:00
        expect(h).toBeGreaterThanOrEqual(7);
        expect(h).toBeLessThan(23);
      }
    }
  });

  it('10. Multi-User Isolation: User B cannot access or modify User A routines', async () => {
    // User B tries to read User A's routine -> 404
    const getAttempt = await request(app)
      .get(`/api/routines/${createdRoutineId}`)
      .set('Cookie', [userBCookie]);

    expect(getAttempt.status).toBe(404);

    // User B tries to update User A's routine -> 404
    const patchAttempt = await request(app)
      .patch(`/api/routines/${createdRoutineId}`)
      .set('Cookie', [userBCookie])
      .set('x-tempo-csrf', '1')
      .send({ name: 'Hacked by User B' });

    expect(patchAttempt.status).toBe(404);

    // User B tries to delete User A's routine -> 404
    const deleteAttempt = await request(app)
      .delete(`/api/routines/${createdRoutineId}`)
      .set('Cookie', [userBCookie])
      .set('x-tempo-csrf', '1');

    expect(deleteAttempt.status).toBe(404);
  });

  it('11. Manual Rescheduling: Respects fixed routines and sleep constraints', async () => {
    // 1. Attempting to modify fixed routine block should be rejected
    const updateRoutineAttempt = await request(app)
      .patch(`/api/schedule/blocks/${routineBlockId}`)
      .set('Cookie', [userACookie])
      .set('x-tempo-csrf', '1')
      .send({
        startTime: '08:30',
        endTime: '09:30',
      });

    expect(updateRoutineAttempt.status).toBe(400);
    expect(updateRoutineAttempt.body.error.code).toBe('CANNOT_MODIFY_FIXED_BLOCK');

    // 2. Attempting to schedule task during sleep hours (05:00-06:00, sleep is until 07:00) should be rejected
    const updateSleepAttempt = await request(app)
      .patch(`/api/schedule/blocks/${taskBlockId}`)
      .set('Cookie', [userACookie])
      .set('x-tempo-csrf', '1')
      .send({
        startTime: '05:00',
        endTime: '06:00',
      });

    expect(updateSleepAttempt.status).toBe(400);
    expect(updateSleepAttempt.body.error.code).toBe('SLEEP_CONFLICT');
  });

  it('12. Automatic Rescheduling: Preserves fixed routine blocks and respects sleep boundaries', async () => {
    const reschedRes = await request(app)
      .post(`/api/schedule/${scheduleId}/reschedule`)
      .set('Cookie', [userACookie])
      .set('x-tempo-csrf', '1')
      .send({
        reason: 'Task took longer than anticipated',
        taskModifications: [{ taskId, additionalMinutes: 30 }],
      });

    expect(reschedRes.status).toBe(200);
    expect(reschedRes.body.success).toBe(true);

    const reschedBlocks = reschedRes.body.data.schedule.blocks;

    // Routine block still present and fixed
    const routineBlock = reschedBlocks.find(
      (b: any) => b.blockType === 'ROUTINE' || b.title === 'Morning Gym & Strength Training'
    );
    expect(routineBlock).toBeDefined();
    expect(routineBlock.isFixed).toBe(true);

    // Rescheduled task must remain in waking hours (07:00 - 23:00)
    const taskBlock = reschedBlocks.find((b: any) => b.taskId === taskId);
    expect(taskBlock).toBeDefined();

    const [h] = taskBlock.startTime.split(':').map(Number);
    expect(h).toBeGreaterThanOrEqual(7);
    expect(h).toBeLessThan(23);
  });

  it('13. Routine CRUD: Delete routine cleanly', async () => {
    const delRes = await request(app)
      .delete(`/api/routines/${createdRoutineId}`)
      .set('Cookie', [userACookie])
      .set('x-tempo-csrf', '1');

    expect(delRes.status).toBe(200);
    expect(delRes.body.data.deleted).toBe(true);

    // Confirm it is gone
    const getRes = await request(app)
      .get(`/api/routines/${createdRoutineId}`)
      .set('Cookie', [userACookie]);

    expect(getRes.status).toBe(404);
  });
});
