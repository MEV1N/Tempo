import { describe, it, expect } from 'vitest';
import {
  TempoSchedulerEngine,
  TempoRescheduler,
  SchedulerRequest,
  RescheduleRequest,
  timeToMinutes,
  minutesToTime,
  mergeIntervals,
  subtractIntervals,
  intervalsOverlap,
} from '../src';

describe('Tempo Intelligent Scheduler Unit Tests', () => {
  const engine = new TempoSchedulerEngine();

  const basePreferences = {
    timezone: 'Asia/Kolkata',
    wakeTime: '07:00',
    sleepTime: '23:00',
    preferredWorkStart: '09:00',
    preferredWorkEnd: '18:00',
    breakfastTime: '08:00',
    lunchTime: '13:00',
    dinnerTime: '20:00',
    mealDurationMinutes: 45,
    preferredBreakDuration: 15,
    maxContinuousWorkDuration: 90,
    dailyLeisureTarget: 60,
  };

  describe('Interval Calculations & Utility Functions', () => {
    it('correctly converts between time strings and minutes', () => {
      expect(timeToMinutes('00:00')).toBe(0);
      expect(timeToMinutes('07:30')).toBe(450);
      expect(timeToMinutes('23:59')).toBe(1439);
      expect(timeToMinutes('2026-11-15T14:30:00Z')).toBe(870);

      expect(minutesToTime(0)).toBe('00:00');
      expect(minutesToTime(450)).toBe('07:30');
      expect(minutesToTime(1380)).toBe('23:00');
    });

    it('correctly detects interval overlap', () => {
      expect(
        intervalsOverlap({ startMinute: 60, endMinute: 120 }, { startMinute: 90, endMinute: 150 })
      ).toBe(true);
      expect(
        intervalsOverlap({ startMinute: 60, endMinute: 120 }, { startMinute: 120, endMinute: 180 })
      ).toBe(false);
      expect(
        intervalsOverlap({ startMinute: 60, endMinute: 90 }, { startMinute: 120, endMinute: 180 })
      ).toBe(false);
    });

    it('correctly merges overlapping and adjacent intervals', () => {
      const merged = mergeIntervals([
        { startMinute: 60, endMinute: 100 },
        { startMinute: 90, endMinute: 140 },
        { startMinute: 200, endMinute: 250 },
        { startMinute: 250, endMinute: 300 },
      ]);

      expect(merged).toEqual([
        { startMinute: 60, endMinute: 140 },
        { startMinute: 200, endMinute: 300 },
      ]);
    });

    it('correctly subtracts occupied intervals from available window', () => {
      const available = [{ startMinute: 420, endMinute: 1380 }]; // 07:00 - 23:00
      const occupied = [
        { startMinute: 540, endMinute: 720 }, // 09:00 - 12:00
        { startMinute: 780, endMinute: 840 }, // 13:00 - 14:00
      ];

      const free = subtractIntervals(available, occupied);
      expect(free).toEqual([
        { startMinute: 420, endMinute: 540 },
        { startMinute: 720, endMinute: 780 },
        { startMinute: 840, endMinute: 1380 },
      ]);
    });
  });

  describe('College Day, Holidays and Timetable Scenarios', () => {
    it('schedules tasks around normal college sessions', () => {
      // 2026-11-16 is a Monday (dayOfWeek = 1)
      const request: SchedulerRequest = {
        userId: 'test-user',
        targetDate: '2026-11-16',
        preferences: basePreferences,
        tasks: [
          {
            id: 'task-algo',
            title: 'Algorithm Assignment',
            estimatedMinutes: 60,
            priority: 'HIGH',
            status: 'TODO',
          },
        ],
        calendarContext: {
          timetableSessions: [
            {
              id: 'sess-algo-lec',
              title: 'Algorithms Lecture',
              dayOfWeek: 1,
              startTime: '09:00',
              endTime: '11:00',
              sessionType: 'CLASS',
            },
          ],
          exceptions: [],
          calendarEvents: [],
        },
      };

      const result = engine.generateSchedule(request);

      // Verify college block is preserved
      const collegeBlock = result.blocks.find((b) => b.blockType === 'COLLEGE');
      expect(collegeBlock).toBeDefined();
      expect(collegeBlock?.title).toBe('Algorithms Lecture');
      expect(collegeBlock?.startTime).toBe('09:00');
      expect(collegeBlock?.endTime).toBe('11:00');

      // Verify task is scheduled and does not collide with college lecture (09:00 - 11:00)
      const taskBlock = result.blocks.find((b) => b.blockType === 'TASK');
      expect(taskBlock).toBeDefined();
      expect(taskBlock?.title).toBe('Algorithm Assignment');
      expect(taskBlock?.startMinute < 660 && taskBlock?.endMinute > 540).toBe(false);
    });

    it('frees up college hours on a full-day college holiday', () => {
      // Monday with full-day holiday
      const request: SchedulerRequest = {
        userId: 'test-user',
        targetDate: '2026-11-16',
        preferences: basePreferences,
        tasks: [
          {
            id: 'task-project',
            title: 'Project Work',
            estimatedMinutes: 120,
            priority: 'HIGH',
            status: 'TODO',
          },
        ],
        calendarContext: {
          timetableSessions: [
            {
              id: 'sess-1',
              title: 'Full Day Class Session',
              dayOfWeek: 1,
              startTime: '09:00',
              endTime: '16:00',
              sessionType: 'CLASS',
            },
          ],
          exceptions: [
            {
              id: 'ex-holiday',
              date: '2026-11-16',
              exceptionType: 'HOLIDAY',
              isFullDay: true,
              title: 'National Holiday',
            },
          ],
          calendarEvents: [],
        },
      };

      const result = engine.generateSchedule(request);

      // College session should NOT appear
      const collegeBlock = result.blocks.find((b) => b.blockType === 'COLLEGE');
      expect(collegeBlock).toBeUndefined();

      // Task should be scheduled successfully in the morning
      const taskBlock = result.blocks.find((b) => b.taskId === 'task-project');
      expect(taskBlock).toBeDefined();
    });

    it('cancels specific class sessions when an exception is present', () => {
      const request: SchedulerRequest = {
        userId: 'test-user',
        targetDate: '2026-11-16', // Monday
        preferences: basePreferences,
        tasks: [
          {
            id: 'task-study',
            title: 'Study Session',
            estimatedMinutes: 60,
            priority: 'MEDIUM',
            status: 'TODO',
          },
        ],
        calendarContext: {
          timetableSessions: [
            {
              id: 'sess-morning',
              title: 'Physics Lecture',
              dayOfWeek: 1,
              startTime: '09:00',
              endTime: '10:30',
              sessionType: 'CLASS',
            },
            {
              id: 'sess-afternoon',
              title: 'Chemistry Lab',
              dayOfWeek: 1,
              startTime: '14:00',
              endTime: '16:00',
              sessionType: 'LAB',
            },
          ],
          exceptions: [
            {
              id: 'ex-cancelled',
              timetableSessionId: 'sess-morning',
              date: '2026-11-16',
              exceptionType: 'CANCELLED_CLASS',
              isFullDay: false,
              title: 'Physics Cancelled',
            },
          ],
          calendarEvents: [],
        },
      };

      const result = engine.generateSchedule(request);

      // Physics Lecture should be cancelled, Chemistry Lab present
      const physics = result.blocks.find((b) => b.title === 'Physics Lecture');
      const chem = result.blocks.find((b) => b.title === 'Chemistry Lab');

      expect(physics).toBeUndefined();
      expect(chem).toBeDefined();
      expect(chem?.startTime).toBe('14:00');
    });

    it('handles weekends without regular college timetable sessions', () => {
      // 2026-11-15 is Sunday (dayOfWeek = 7)
      const request: SchedulerRequest = {
        userId: 'test-user',
        targetDate: '2026-11-15',
        preferences: basePreferences,
        tasks: [
          {
            id: 'weekend-task',
            title: 'Weekend Reading',
            estimatedMinutes: 90,
            priority: 'MEDIUM',
            status: 'TODO',
          },
        ],
        calendarContext: {
          timetableSessions: [
            {
              id: 'weekday-class',
              title: 'Monday Lecture',
              dayOfWeek: 1,
              startTime: '09:00',
              endTime: '10:00',
              sessionType: 'CLASS',
            },
          ],
          exceptions: [],
          calendarEvents: [],
        },
      };

      const result = engine.generateSchedule(request);
      expect(result.blocks.find((b) => b.blockType === 'COLLEGE')).toBeUndefined();
      expect(result.blocks.find((b) => b.taskId === 'weekend-task')).toBeDefined();
    });

    it('respects fixed calendar events such as Exams', () => {
      const request: SchedulerRequest = {
        userId: 'test-user',
        targetDate: '2026-11-16',
        preferences: basePreferences,
        tasks: [
          {
            id: 'prep-task',
            title: 'Post-Exam Revision',
            estimatedMinutes: 60,
            priority: 'HIGH',
            status: 'TODO',
          },
        ],
        calendarContext: {
          timetableSessions: [],
          exceptions: [],
          calendarEvents: [
            {
              id: 'exam-event',
              title: 'Mid-Term Exam',
              startTime: '10:00',
              endTime: '13:00',
              isAllDay: false,
              eventType: 'EXAM',
            },
          ],
        },
      };

      const result = engine.generateSchedule(request);

      const examBlock = result.blocks.find((b) => b.title === 'Mid-Term Exam');
      expect(examBlock).toBeDefined();
      expect(examBlock?.startTime).toBe('10:00');
      expect(examBlock?.endTime).toBe('13:00');

      // Task must not overlap with exam
      const taskBlock = result.blocks.find((b) => b.taskId === 'prep-task');
      expect(taskBlock).toBeDefined();
      expect(taskBlock!.startMinute < 780 && taskBlock!.endMinute > 600).toBe(false);
    });
  });

  describe('Task Allocation, Deadlines, Splitting & Prioritization', () => {
    it('prioritizes tasks with closer deadlines', () => {
      const request: SchedulerRequest = {
        userId: 'test-user',
        targetDate: '2026-11-16',
        preferences: basePreferences,
        tasks: [
          {
            id: 'task-future',
            title: 'Future Assignment',
            estimatedMinutes: 60,
            priority: 'MEDIUM',
            status: 'TODO',
            dueDate: '2026-11-20',
          },
          {
            id: 'task-today',
            title: 'Urgent Today Assignment',
            estimatedMinutes: 60,
            priority: 'MEDIUM',
            status: 'TODO',
            dueDate: '2026-11-16',
          },
        ],
      };

      const result = engine.generateSchedule(request);

      const todayBlock = result.blocks.find((b) => b.taskId === 'task-today');
      const futureBlock = result.blocks.find((b) => b.taskId === 'task-future');

      expect(todayBlock).toBeDefined();
      expect(futureBlock).toBeDefined();
      // Today's urgent deadline should be scheduled earlier
      expect(todayBlock!.startMinute).toBeLessThan(futureBlock!.startMinute);
    });

    it('enforces hard deadlines within the day', () => {
      const request: SchedulerRequest = {
        userId: 'test-user',
        targetDate: '2026-11-16',
        preferences: basePreferences,
        tasks: [
          {
            id: 'task-submission',
            title: 'Midday Submission',
            estimatedMinutes: 60,
            priority: 'HIGH',
            status: 'TODO',
            dueDate: '2026-11-16T12:00:00Z',
          },
        ],
      };

      const result = engine.generateSchedule(request);

      const block = result.blocks.find((b) => b.taskId === 'task-submission');
      expect(block).toBeDefined();
      // Must end at or before 12:00 (720 minutes)
      expect(block!.endMinute).toBeLessThanOrEqual(720);
    });

    it('marks task unscheduled when deadline has already passed', () => {
      const request: SchedulerRequest = {
        userId: 'test-user',
        targetDate: '2026-11-16',
        preferences: basePreferences,
        tasks: [
          {
            id: 'task-past',
            title: 'Expired Paper',
            estimatedMinutes: 60,
            priority: 'HIGH',
            status: 'TODO',
            dueDate: '2026-11-10', // Past
          },
        ],
      };

      const result = engine.generateSchedule(request);
      expect(result.blocks.find((b) => b.taskId === 'task-past')).toBeUndefined();

      const unscheduled = result.unscheduledTasks.find((u) => u.taskId === 'task-past');
      expect(unscheduled).toBeDefined();
      expect(unscheduled?.reason).toBe('DEADLINE_PASSED');
    });

    it('splits splittable tasks across available slots respecting minSessionMinutes', () => {
      const request: SchedulerRequest = {
        userId: 'test-user',
        targetDate: '2026-11-16',
        preferences: {
          ...basePreferences,
          maxContinuousWorkDuration: 60, // Split after 60 mins
        },
        tasks: [
          {
            id: 'task-large',
            title: 'Large Research Paper',
            estimatedMinutes: 120,
            canSplit: true,
            minSessionMinutes: 30,
            priority: 'HIGH',
            status: 'TODO',
          },
        ],
      };

      const result = engine.generateSchedule(request);

      const blocks = result.blocks.filter((b) => b.taskId === 'task-large');
      expect(blocks.length).toBeGreaterThanOrEqual(2);

      const totalAllocated = blocks.reduce((sum, b) => sum + b.durationMinutes, 0);
      expect(totalAllocated).toBe(120);

      for (const b of blocks) {
        expect(b.durationMinutes).toBeGreaterThanOrEqual(30);
      }
    });

    it('reports unscheduled for non-splittable task when no single slot is large enough', () => {
      const request: SchedulerRequest = {
        userId: 'test-user',
        targetDate: '2026-11-16',
        preferences: {
          ...basePreferences,
          wakeTime: '08:00',
          sleepTime: '12:00', // only 4 hours waking window (240 mins)
        },
        tasks: [
          {
            id: 'huge-task',
            title: 'Unsplittable Deep Work',
            estimatedMinutes: 180, // 3 hours continuous
            canSplit: false,
            priority: 'MEDIUM',
            status: 'TODO',
          },
        ],
        // Fill slots with fixed commitments so no 180m continuous slot exists
        fixedCommitments: [
          {
            id: 'c-1',
            title: 'Meeting 1',
            startTime: '09:00',
            endTime: '10:00',
            blockType: 'EVENT',
            isFixed: true,
          },
          {
            id: 'c-2',
            title: 'Meeting 2',
            startTime: '10:30',
            endTime: '11:30',
            blockType: 'EVENT',
            isFixed: true,
          },
        ],
      };

      const result = engine.generateSchedule(request);
      expect(result.blocks.find((b) => b.taskId === 'huge-task')).toBeUndefined();

      const unscheduled = result.unscheduledTasks.find((u) => u.taskId === 'huge-task');
      expect(unscheduled).toBeDefined();
      expect(['NO_SUITABLE_INTERVAL', 'INSUFFICIENT_TIME']).toContain(unscheduled?.reason);
    });

    it('honestly reports overloaded day when total task demand exceeds available hours', () => {
      const request: SchedulerRequest = {
        userId: 'test-user',
        targetDate: '2026-11-16',
        preferences: basePreferences,
        tasks: [
          { id: 't1', title: 'Task 1', estimatedMinutes: 300, priority: 'URGENT', status: 'TODO' },
          { id: 't2', title: 'Task 2', estimatedMinutes: 300, priority: 'HIGH', status: 'TODO' },
          { id: 't3', title: 'Task 3', estimatedMinutes: 300, priority: 'MEDIUM', status: 'TODO' },
          { id: 't4', title: 'Task 4', estimatedMinutes: 300, priority: 'LOW', status: 'TODO' },
        ], // 1200 minutes of work, but waking day has meal/leisure/waking constraints
      };

      const result = engine.generateSchedule(request);

      expect(result.unscheduledTasks.length).toBeGreaterThan(0);
      expect(result.metrics.totalScheduledWorkMinutes).toBeLessThan(1200);
      // Ensures sleep was preserved
      expect(result.metrics.sleepMinutes).toBeGreaterThanOrEqual(480);
    });

    it('matches preferred time of day (morning task scheduled in morning)', () => {
      const request: SchedulerRequest = {
        userId: 'test-user',
        targetDate: '2026-11-16',
        preferences: basePreferences,
        tasks: [
          {
            id: 'task-morning',
            title: 'Morning Meditation & Reading',
            estimatedMinutes: 60,
            preferredTime: 'MORNING',
            priority: 'MEDIUM',
            status: 'TODO',
          },
        ],
      };

      const result = engine.generateSchedule(request);
      const block = result.blocks.find((b) => b.taskId === 'task-morning');

      expect(block).toBeDefined();
      // Morning is 06:00 - 12:00 (endMinute <= 720)
      expect(block!.endMinute).toBeLessThanOrEqual(720);
    });

    it('protects sleep time and never schedules tasks into sleep boundaries', () => {
      const request: SchedulerRequest = {
        userId: 'test-user',
        targetDate: '2026-11-16',
        preferences: {
          ...basePreferences,
          wakeTime: '08:00', // 480
          sleepTime: '22:00', // 1320
        },
        tasks: [
          {
            id: 'task-long',
            title: 'All Day Work',
            estimatedMinutes: 600,
            priority: 'HIGH',
            status: 'TODO',
          },
        ],
      };

      const result = engine.generateSchedule(request);

      for (const block of result.blocks) {
        if (block.blockType === 'TASK') {
          expect(block.startMinute).toBeGreaterThanOrEqual(480);
          expect(block.endMinute).toBeLessThanOrEqual(1320);
        }
      }
    });

    it('is 100% deterministic: produces identical schedule for identical input', () => {
      const request: SchedulerRequest = {
        userId: 'deterministic-user',
        targetDate: '2026-11-16',
        preferences: basePreferences,
        tasks: [
          { id: 't-b', title: 'Task B', estimatedMinutes: 45, priority: 'HIGH', status: 'TODO' },
          { id: 't-a', title: 'Task A', estimatedMinutes: 45, priority: 'HIGH', status: 'TODO' },
          { id: 't-c', title: 'Task C', estimatedMinutes: 60, priority: 'MEDIUM', status: 'TODO' },
        ],
      };

      const run1 = engine.generateSchedule(request);
      const run2 = engine.generateSchedule(request);

      expect(run1.blocks.length).toBe(run2.blocks.length);
      expect(JSON.stringify(run1.blocks)).toBe(JSON.stringify(run2.blocks));
      expect(JSON.stringify(run1.metrics)).toBe(JSON.stringify(run2.metrics));
    });
  });

  describe('Tempo Intelligent Rescheduling (Phase 4)', () => {
    const rescheduler = new TempoRescheduler();

    it('preserves locked blocks at their exact time during rescheduling', () => {
      const currentBlocks = [
        {
          id: 'b-locked',
          startTime: '09:00',
          endTime: '10:30',
          startMinute: 540,
          endMinute: 630,
          durationMinutes: 90,
          blockType: 'TASK' as const,
          isFixed: false,
          isLocked: true, // LOCKED!
          title: 'Locked Critical Study',
          taskId: 'task-crit',
        },
        {
          id: 'b-flexible',
          startTime: '10:30',
          endTime: '11:30',
          startMinute: 630,
          endMinute: 690,
          durationMinutes: 60,
          blockType: 'TASK' as const,
          isFixed: false,
          isLocked: false,
          title: 'Flexible Review',
          taskId: 'task-flex',
        },
      ];

      // Introduce a new sudden event conflicting with the flexible review (10:30 - 11:30)
      const req: RescheduleRequest = {
        currentBlocks,
        targetDate: '2026-11-16',
        preferences: basePreferences,
        tasks: [
          {
            id: 'task-crit',
            title: 'Locked Critical Study',
            estimatedMinutes: 90,
            priority: 'HIGH',
            status: 'TODO',
          },
          {
            id: 'task-flex',
            title: 'Flexible Review',
            estimatedMinutes: 60,
            priority: 'MEDIUM',
            status: 'TODO',
          },
        ],
        newEvents: [
          {
            title: 'Urgent Faculty Meeting',
            startTime: '10:30',
            endTime: '11:30',
            blockType: 'EVENT',
          },
        ],
      };

      const result = rescheduler.reschedule(req);

      // Verify the locked block was strictly preserved at 09:00 - 10:30
      const locked = result.blocks.find((b) => b.taskId === 'task-crit');
      expect(locked).toBeDefined();
      expect(locked?.startTime).toBe('09:00');
      expect(locked?.endTime).toBe('10:30');
      expect(locked?.isLocked).toBe(true);

      // Verify the flexible block was relocated without colliding with meeting (10:30 - 11:30)
      const flex = result.blocks.find((b) => b.taskId === 'task-flex');
      expect(flex).toBeDefined();
      expect(flex?.startMinute < 690 && flex?.endMinute > 630).toBe(false);

      // Verify diff reports preserved vs moved
      const preservedDiff = result.diff.find((d) => d.title === 'Locked Critical Study');
      expect(preservedDiff?.type).toBe('PRESERVED');
    });

    it('rejects a new event that directly conflicts with a locked block', () => {
      const currentBlocks = [
        {
          id: 'b-locked',
          startTime: '09:00',
          endTime: '10:30',
          startMinute: 540,
          endMinute: 630,
          durationMinutes: 90,
          blockType: 'TASK' as const,
          isFixed: false,
          isLocked: true,
          title: 'Locked Deep Work',
          taskId: 'task-crit',
        },
      ];

      const req: RescheduleRequest = {
        currentBlocks,
        targetDate: '2026-11-16',
        preferences: basePreferences,
        tasks: [
          {
            id: 'task-crit',
            title: 'Locked Deep Work',
            estimatedMinutes: 90,
            priority: 'HIGH',
            status: 'TODO',
          },
        ],
        newEvents: [
          {
            title: 'Colliding Event',
            startTime: '10:00', // Collides with 09:00-10:30!
            endTime: '11:00',
          },
        ],
      };

      expect(() => rescheduler.reschedule(req)).toThrow(/Conflict with locked block/);
    });

    it('implements minimal-change strategy by leaving unaffected blocks in place', () => {
      const currentBlocks = [
        {
          id: 'b-1',
          startTime: '09:00',
          endTime: '10:00',
          startMinute: 540,
          endMinute: 600,
          durationMinutes: 60,
          blockType: 'TASK' as const,
          isFixed: false,
          isLocked: false,
          title: 'Morning Code',
          taskId: 't-1',
        },
        {
          id: 'b-2',
          startTime: '15:00',
          endTime: '16:00',
          startMinute: 900,
          endMinute: 960,
          durationMinutes: 60,
          blockType: 'TASK' as const,
          isFixed: false,
          isLocked: false,
          title: 'Afternoon Writing',
          taskId: 't-2',
        },
      ];

      // Modification: only t-1 takes 30 mins longer
      const req: RescheduleRequest = {
        currentBlocks,
        targetDate: '2026-11-16',
        preferences: basePreferences,
        tasks: [
          {
            id: 't-1',
            title: 'Morning Code',
            estimatedMinutes: 60,
            priority: 'HIGH',
            status: 'TODO',
          },
          {
            id: 't-2',
            title: 'Afternoon Writing',
            estimatedMinutes: 60,
            priority: 'MEDIUM',
            status: 'TODO',
          },
        ],
        taskModifications: [
          {
            taskId: 't-1',
            additionalMinutes: 30, // 90 mins total
          },
        ],
      };

      const result = rescheduler.reschedule(req);

      // Afternoon block (t-2) should remain at 15:00 - 16:00 (minimal change!)
      const b2 = result.blocks.find((b) => b.taskId === 't-2');
      expect(b2).toBeDefined();
      expect(b2?.startTime).toBe('15:00');
      expect(b2?.endTime).toBe('16:00');
    });

    it('removes future task blocks when task is marked completed earlier than expected', () => {
      const currentBlocks = [
        {
          id: 'b-done',
          startTime: '09:00',
          endTime: '10:00',
          startMinute: 540,
          endMinute: 600,
          durationMinutes: 60,
          blockType: 'TASK' as const,
          isFixed: false,
          title: 'Done Early Task',
          taskId: 't-done',
        },
      ];

      const req: RescheduleRequest = {
        currentBlocks,
        targetDate: '2026-11-16',
        preferences: basePreferences,
        tasks: [
          {
            id: 't-done',
            title: 'Done Early Task',
            estimatedMinutes: 60,
            priority: 'HIGH',
            status: 'TODO',
          },
        ],
        taskModifications: [
          {
            taskId: 't-done',
            completed: true,
          },
        ],
      };

      const result = rescheduler.reschedule(req);
      expect(result.blocks.find((b) => b.taskId === 't-done')).toBeUndefined();

      const removedDiff = result.diff.find((d) => d.title === 'Done Early Task');
      expect(removedDiff?.type).toBe('REMOVED');
    });
  });
});
