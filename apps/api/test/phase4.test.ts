import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db';

describe('Tempo Phase 4 — Schedule Approval, Editing & Intelligent Rescheduling Integration Tests', () => {
  const app = createApp();

  const userAEmail = `phase4_userA_${Date.now()}@example.com`;
  const userBEmail = `phase4_userB_${Date.now()}@example.com`;
  const password = 'Password123!';

  let userAId: string;
  let userBId: string;
  let userACookie: string;
  let userBCookie: string;

  const testDate = '2026-11-23'; // Monday

  let scheduleId: string;
  let taskBlockId: string;
  let fixedBlockId: string;

  beforeAll(async () => {
    // 1. Register User A
    const regA = await request(app).post('/api/auth/register').send({
      name: 'Phase 4 User A',
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
      name: 'Phase 4 User B',
      email: userBEmail,
      password,
    });
    userBId = regB.body.data.user.id;
    userBCookie = regB.headers['set-cookie'][0];

    // 3. Set up Monday Timetable Session for User A (09:00 - 10:30)
    const ttRes = await request(app).get('/api/timetables').set('Cookie', userACookie);
    const timetableId = ttRes.body.data.id;

    await request(app)
      .post(`/api/timetables/${timetableId}/sessions`)
      .set('Cookie', userACookie)
      .send({
        title: 'Compiler Construction',
        dayOfWeek: 1, // Monday
        startTime: '09:00',
        endTime: '10:30',
        sessionType: 'CLASS',
      });

    // 4. Create tasks for User A
    await request(app).post('/api/tasks').set('Cookie', userACookie).send({
      title: 'Lexer Parser Assignment',
      estimatedMinutes: 60,
      priority: 'HIGH',
      status: 'TODO',
    });

    await request(app).post('/api/tasks').set('Cookie', userACookie).send({
      title: 'Operating Systems Lab Prep',
      estimatedMinutes: 60,
      priority: 'MEDIUM',
      status: 'TODO',
    });
  }, 25000);

  afterAll(async () => {
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
  }, 25000);

  // ==========================================
  // PART A: SCHEDULE LIFECYCLE (PROPOSED -> CONFIRMED -> ARCHIVED)
  // ==========================================
  describe('Schedule Lifecycle Transitions', () => {
    it('generates a PROPOSED schedule for User A', async () => {
      const res = await request(app)
        .post('/api/schedule/generate')
        .set('Cookie', userACookie)
        .send({ targetDate: testDate });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.status).toBe('PROPOSED');
      expect(data.version).toBe(1);
      expect(data.blocks.length).toBeGreaterThan(0);

      scheduleId = data.id;

      const tBlock = data.blocks.find((b: any) => b.blockType === 'TASK');
      expect(tBlock).toBeDefined();
      taskBlockId = tBlock.id;

      const fBlock = data.blocks.find((b: any) => b.blockType === 'COLLEGE');
      expect(fBlock).toBeDefined();
      fixedBlockId = fBlock.id;
    }, 15000);

    it('rejects a proposed schedule and removes it', async () => {
      const res = await request(app)
        .post(`/api/schedule/${scheduleId}/reject`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it is no longer retrieved
      const getRes = await request(app)
        .get(`/api/schedule?date=${testDate}`)
        .set('Cookie', userACookie);

      expect(getRes.body.data).toBeNull();
    }, 15000);

    it('re-generates proposed schedule and confirms it', async () => {
      // Re-generate
      const genRes = await request(app)
        .post('/api/schedule/generate')
        .set('Cookie', userACookie)
        .send({ targetDate: testDate });

      expect(genRes.status).toBe(200);
      scheduleId = genRes.body.data.id;
      const tBlock = genRes.body.data.blocks.find((b: any) => b.blockType === 'TASK');
      taskBlockId = tBlock.id;

      // Confirm
      const confirmRes = await request(app)
        .post(`/api/schedule/${scheduleId}/confirm`)
        .set('Cookie', userACookie);

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.success).toBe(true);
      expect(confirmRes.body.data.status).toBe('CONFIRMED');
      expect(confirmRes.body.data.version).toBe(2);
    }, 15000);

    it('prevents accidental replacement of a CONFIRMED schedule without explicit replaceConfirmed', async () => {
      const res = await request(app)
        .post('/api/schedule/generate')
        .set('Cookie', userACookie)
        .send({ targetDate: testDate });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFIRMED_SCHEDULE_EXISTS');
    });

    it('replaces confirmed schedule when replaceConfirmed is explicitly true', async () => {
      const res = await request(app)
        .post('/api/schedule/generate')
        .set('Cookie', userACookie)
        .send({ targetDate: testDate, replaceConfirmed: true });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PROPOSED');

      // Update active scheduleId & taskBlockId
      scheduleId = res.body.data.id;
      const tBlock = res.body.data.blocks.find((b: any) => b.blockType === 'TASK');
      taskBlockId = tBlock.id;
      const fBlock = res.body.data.blocks.find((b: any) => b.blockType === 'COLLEGE');
      fixedBlockId = fBlock.id;

      // Confirm again for downstream tests
      await request(app).post(`/api/schedule/${scheduleId}/confirm`).set('Cookie', userACookie);
    }, 15000);
  });

  // ==========================================
  // PART B: LOCKED BLOCKS
  // ==========================================
  describe('Locked Schedule Blocks', () => {
    it('toggles lock state on a schedule block', async () => {
      const res = await request(app)
        .patch(`/api/schedule/blocks/${taskBlockId}/lock`)
        .set('Cookie', userACookie)
        .send({ isLocked: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isLocked).toBe(true);
    });

    it('unlocks a schedule block when requested', async () => {
      const res = await request(app)
        .patch(`/api/schedule/blocks/${taskBlockId}/lock`)
        .set('Cookie', userACookie)
        .send({ isLocked: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isLocked).toBe(false);

      // Lock it back for rescheduling tests
      await request(app)
        .patch(`/api/schedule/blocks/${taskBlockId}/lock`)
        .set('Cookie', userACookie)
        .send({ isLocked: true });
    });
  });

  // ==========================================
  // PART C: MANUAL BLOCK EDITING & VALIDATION
  // ==========================================
  describe('Manual Block Editing & Invariant Checks', () => {
    it('rejects editing a fixed college timetable session', async () => {
      const res = await request(app)
        .patch(`/api/schedule/blocks/${fixedBlockId}`)
        .set('Cookie', userACookie)
        .send({ title: 'Hacked College Lecture' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_MODIFY_FIXED_BLOCK');
    });

    it('rejects moving a block into sleep hours (e.g. 02:00 - 03:00)', async () => {
      const res = await request(app)
        .patch(`/api/schedule/blocks/${taskBlockId}`)
        .set('Cookie', userACookie)
        .send({
          startTime: '02:00',
          endTime: '03:00',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('SLEEP_CONFLICT');
    });

    it('rejects moving a block to overlap with fixed college lecture (09:00 - 10:30)', async () => {
      const res = await request(app)
        .patch(`/api/schedule/blocks/${taskBlockId}`)
        .set('Cookie', userACookie)
        .send({
          startTime: '09:30',
          endTime: '10:30',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('OVERLAPPING_BLOCKS');
    });

    it('successfully edits title and timing into valid open window', async () => {
      const res = await request(app)
        .patch(`/api/schedule/blocks/${taskBlockId}`)
        .set('Cookie', userACookie)
        .send({
          startTime: '16:00',
          endTime: '17:00',
          title: 'Manual Renamed Study Block',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const updatedBlock = res.body.data.blocks.find((b: any) => b.id === taskBlockId);
      expect(updatedBlock.title).toBe('Manual Renamed Study Block');
      expect(updatedBlock.startTime).toBe('16:00');
      expect(updatedBlock.endTime).toBe('17:00');
    });
  });

  // ==========================================
  // PART D: INTELLIGENT RESCHEDULING & MINIMAL CHANGE
  // ==========================================
  describe('Intelligent Rescheduling', () => {
    it('reschedules preserving locked blocks and reporting changelog', async () => {
      const res = await request(app)
        .post(`/api/schedule/${scheduleId}/reschedule`)
        .set('Cookie', userACookie)
        .send({
          reason: 'Sudden Department Assembly',
          newEvents: [
            {
              title: 'Department Assembly',
              startTime: '14:00',
              endTime: '15:00',
              blockType: 'EVENT',
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.schedule).toBeDefined();
      expect(res.body.data.changelog).toBeDefined();

      const newBlocks = res.body.data.schedule.blocks;

      // Verify the locked block at 16:00 - 17:00 was preserved
      const locked = newBlocks.find((b: any) => b.title === 'Manual Renamed Study Block');
      expect(locked).toBeDefined();
      expect(locked.startTime).toBe('16:00');
      expect(locked.endTime).toBe('17:00');
      expect(locked.isLocked).toBe(true);

      // Verify the new event was added
      const assembly = newBlocks.find((b: any) => b.title === 'Department Assembly');
      expect(assembly).toBeDefined();
      expect(assembly.startTime).toBe('14:00');
      expect(assembly.endTime).toBe('15:00');
    }, 15000);
  });

  // ==========================================
  // PART E: VERSION HISTORY & RESTORATION
  // ==========================================
  describe('Schedule Versions & Restoration', () => {
    let versionList: any[];

    it('fetches schedule version history', async () => {
      const res = await request(app)
        .get(`/api/schedule/${scheduleId}/versions`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);

      versionList = res.body.data;
      expect(versionList[0].versionNumber).toBeGreaterThan(1);
    });

    it('restores schedule to Version 1', async () => {
      const res = await request(app)
        .post(`/api/schedule/${scheduleId}/restore`)
        .set('Cookie', userACookie)
        .send({ versionNumber: 1 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const restoredSchedule = res.body.data;
      // Version 1 was initial generation where title was not "Manual Renamed Study Block"
      const blockTitle = restoredSchedule.blocks.find(
        (b: any) => b.title === 'Manual Renamed Study Block'
      );
      expect(blockTitle).toBeUndefined();
    }, 15000);
  });

  // ==========================================
  // PART F: MULTI-USER ISOLATION & SECURITY
  // ==========================================
  describe('Multi-User Security & Tenant Isolation', () => {
    it("prevents User B from confirming User A's schedule", async () => {
      const res = await request(app)
        .post(`/api/schedule/${scheduleId}/confirm`)
        .set('Cookie', userBCookie);

      expect(res.status).toBe(404);
    });

    it("prevents User B from modifying User A's schedule blocks", async () => {
      const res = await request(app)
        .patch(`/api/schedule/blocks/${taskBlockId}`)
        .set('Cookie', userBCookie)
        .send({ title: 'Hacked by User B' });

      expect(res.status).toBe(404);
    });

    it("prevents User B from reading User A's version history", async () => {
      const res = await request(app)
        .get(`/api/schedule/${scheduleId}/versions`)
        .set('Cookie', userBCookie);

      expect(res.status).toBe(200);
      // Returns empty array for User B
      expect(res.body.data.length).toBe(0);
    });
  });
});
