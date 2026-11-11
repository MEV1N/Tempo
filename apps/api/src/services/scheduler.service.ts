import { prisma } from '../db';
import {
  GenerateScheduleInput,
  ScheduleDTO,
  ScheduleBlockDTO,
  ScheduleVersionDTO,
  UpdateScheduleBlockInput,
  RescheduleInput,
  RescheduleResponseDTO,
} from '@tempo/shared';
import {
  TempoSchedulerEngine,
  TempoRescheduler,
  SchedulerRequest,
  SchedulerTaskInput,
  getDayOfWeekFromDate,
  timeToMinutes,
  intervalsOverlap,
} from '@tempo/scheduler';

export class SchedulerService {
  private engine: TempoSchedulerEngine;
  private rescheduler: TempoRescheduler;

  constructor() {
    this.engine = new TempoSchedulerEngine();
    this.rescheduler = new TempoRescheduler();
  }

  /**
   * Generates and persists a proposed daily schedule for the authenticated user and target date.
   */
  async generateSchedule(userId: string, input: GenerateScheduleInput): Promise<ScheduleDTO> {
    const { targetDate, options, replaceConfirmed } = input;

    // Check if a CONFIRMED schedule already exists for this date
    const existingConfirmed = await prisma.schedule.findFirst({
      where: {
        userId,
        date: targetDate,
        status: 'CONFIRMED',
      },
    });

    if (existingConfirmed && !replaceConfirmed) {
      const err: any = new Error(
        'A confirmed schedule already exists for this date. Confirm replacement to proceed.'
      );
      err.code = 'CONFIRMED_SCHEDULE_EXISTS';
      throw err;
    }

    // 1. Fetch user preferences
    const preference = await prisma.userPreference.findUnique({
      where: { userId },
    });

    const preferences = {
      timezone: preference?.timezone || 'Asia/Kolkata',
      wakeTime: preference?.wakeTime || '07:00',
      sleepTime: preference?.sleepTime || '23:00',
      preferredWorkStart: preference?.preferredWorkStart || '09:00',
      preferredWorkEnd: preference?.preferredWorkEnd || '18:00',
      breakfastTime: preference?.breakfastTime || '08:30',
      lunchTime: preference?.lunchTime || '13:00',
      dinnerTime: preference?.dinnerTime || '20:30',
      preferredBreakDuration: preference?.preferredBreakDuration || 15,
      maxContinuousWorkDuration: preference?.maxContinuousWorkDuration || 90,
      dailyLeisureTarget: preference?.dailyLeisureTarget || 120,
    };

    // 2. Fetch active timetable and its sessions
    const activeTimetable = await prisma.timetable.findFirst({
      where: { userId, isActive: true },
      include: {
        sessions: true,
      },
    });

    const dayOfWeek = getDayOfWeekFromDate(targetDate);
    const daySessions = (activeTimetable?.sessions || []).filter(
      (s: any) => s.dayOfWeek === dayOfWeek
    );

    // 3. Fetch date-specific calendar exceptions
    const exceptions = await prisma.calendarException.findMany({
      where: { userId, date: targetDate },
    });

    // 4. Fetch calendar events for targetDate
    const dayStartUtc = new Date(`${targetDate}T00:00:00.000Z`);
    const dayEndUtc = new Date(`${targetDate}T23:59:59.999Z`);

    const calendarEvents = await prisma.calendarEvent.findMany({
      where: {
        userId,
        OR: [
          {
            startTime: { lte: dayEndUtc },
            endTime: { gte: dayStartUtc },
          },
          {
            isAllDay: true,
            startTime: { lte: dayEndUtc },
          },
        ],
      },
    });

    // 5. Fetch active tasks
    const dbTasks = await prisma.task.findMany({
      where: {
        userId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
      },
      include: {
        category: true,
      },
    });

    const tasks: SchedulerTaskInput[] = dbTasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      estimatedMinutes: t.estimatedMinutes,
      priority: t.priority as any,
      status: t.status as any,
      preferredTime: t.preferredTime as any,
      energyRequirement: t.energyRequirement as any,
      canSplit: t.canSplit,
      minSessionMinutes: t.minSessionMinutes,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      categoryId: t.categoryId,
      categoryName: t.category?.name || null,
      categoryColor: t.category?.color || null,
      createdAt: t.createdAt.toISOString(),
    }));

    // 6. Build normalized SchedulerRequest
    const schedulerRequest: SchedulerRequest = {
      userId,
      targetDate,
      preferences,
      tasks,
      calendarContext: {
        timetableSessions: daySessions.map((s: any) => ({
          id: s.id,
          title: s.title,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          sessionType: s.sessionType as any,
          location: s.location,
          color: s.color,
        })),
        exceptions: exceptions.map((e: any) => ({
          id: e.id,
          timetableSessionId: e.timetableSessionId,
          date: e.date,
          exceptionType: e.exceptionType as any,
          isFullDay: e.isFullDay,
          startTime: e.startTime ? e.startTime.toISOString() : null,
          endTime: e.endTime ? e.endTime.toISOString() : null,
          title: e.title,
        })),
        calendarEvents: calendarEvents.map((e: any) => ({
          id: e.id,
          title: e.title,
          startTime: e.startTime.toISOString(),
          endTime: e.endTime.toISOString(),
          isAllDay: e.isAllDay,
          eventType: e.eventType as any,
          location: e.location,
          color: e.color,
        })),
      },
      options,
    };

    // 7. Execute Scheduler Engine
    const scheduleResult = this.engine.generateSchedule(schedulerRequest);

    // 8. Persist Proposed Schedule in a Transaction
    const persisted = await prisma.$transaction(async (tx: any) => {
      // If confirmed schedule replacement requested, archive it
      if (existingConfirmed && replaceConfirmed) {
        await tx.schedule.update({
          where: { id: existingConfirmed.id },
          data: { status: 'ARCHIVED' },
        });
      }

      // Remove any previously generated PROPOSED schedule for this user and date
      const existingProposed = await tx.schedule.findFirst({
        where: {
          userId,
          date: targetDate,
          status: 'PROPOSED',
        },
      });

      if (existingProposed) {
        await tx.schedule.delete({
          where: { id: existingProposed.id },
        });
      }

      // Create new schedule record
      const newSchedule = await tx.schedule.create({
        data: {
          userId,
          date: targetDate,
          status: 'PROPOSED',
          version: 1,
          metrics: scheduleResult.metrics as any,
          unscheduledTasks: scheduleResult.unscheduledTasks as any,
        },
      });

      // Create ScheduleBlocks
      if (scheduleResult.blocks.length > 0) {
        await tx.scheduleBlock.createMany({
          data: scheduleResult.blocks.map((b: any) => ({
            userId,
            scheduleId: newSchedule.id,
            taskId: b.taskId || null,
            eventId: b.eventId || null,
            title: b.title,
            startTime: new Date(`${targetDate}T${b.startTime}:00.000Z`),
            endTime: new Date(`${targetDate}T${b.endTime}:00.000Z`),
            durationMinutes: b.durationMinutes,
            blockType: b.blockType as any,
            isFixed: b.isFixed,
            isLocked: b.isLocked || false,
            metadata: b.metadata || null,
          })),
        });
      }

      const scheduleWithBlocks = await tx.schedule.findUniqueOrThrow({
        where: { id: newSchedule.id },
        include: {
          blocks: {
            orderBy: { startTime: 'asc' },
          },
        },
      });

      // Create Version 1 Snapshot
      await tx.scheduleVersion.create({
        data: {
          scheduleId: newSchedule.id,
          userId,
          versionNumber: 1,
          status: 'PROPOSED',
          changeReason: 'Initial schedule generation',
          metrics: scheduleResult.metrics as any,
          unscheduledTasks: scheduleResult.unscheduledTasks as any,
          blocksSnapshot: scheduleWithBlocks.blocks.map((b: any) => this.mapBlockToDTO(b)) as any,
        },
      });

      return scheduleWithBlocks;
    });

    return this.mapScheduleToDTO(persisted);
  }

  /**
   * Confirms a proposed schedule.
   */
  async confirmSchedule(userId: string, scheduleId: string): Promise<ScheduleDTO> {
    const schedule = await prisma.schedule.findFirst({
      where: { id: scheduleId, userId },
      include: {
        blocks: { orderBy: { startTime: 'asc' } },
      },
    });

    if (!schedule) {
      const err: any = new Error('Schedule not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (schedule.status === 'CONFIRMED') {
      return this.mapScheduleToDTO(schedule); // Idempotent
    }

    if (schedule.status === 'ARCHIVED') {
      const err: any = new Error('Cannot confirm an archived schedule');
      err.code = 'INVALID_STATE';
      throw err;
    }

    const nextVersion = schedule.version + 1;

    const updated = await prisma.$transaction(async (tx: any) => {
      // Archive any existing confirmed schedule for that date
      await tx.schedule.updateMany({
        where: {
          userId,
          date: schedule.date,
          status: 'CONFIRMED',
        },
        data: { status: 'ARCHIVED' },
      });

      const confirmed = await tx.schedule.update({
        where: { id: scheduleId },
        data: {
          status: 'CONFIRMED',
          version: nextVersion,
        },
        include: {
          blocks: { orderBy: { startTime: 'asc' } },
        },
      });

      await tx.scheduleVersion.create({
        data: {
          scheduleId,
          userId,
          versionNumber: nextVersion,
          status: 'CONFIRMED',
          changeReason: 'Schedule confirmed by user',
          metrics: confirmed.metrics as any,
          unscheduledTasks: confirmed.unscheduledTasks as any,
          blocksSnapshot: confirmed.blocks.map((b: any) => this.mapBlockToDTO(b)) as any,
        },
      });

      return confirmed;
    });

    return this.mapScheduleToDTO(updated);
  }

  /**
   * Rejects a proposed schedule (archives or deletes it).
   */
  async rejectSchedule(
    userId: string,
    scheduleId: string
  ): Promise<{ success: boolean; message: string }> {
    const schedule = await prisma.schedule.findFirst({
      where: { id: scheduleId, userId },
    });

    if (!schedule) {
      const err: any = new Error('Schedule not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (schedule.status !== 'PROPOSED') {
      const err: any = new Error('Only proposed schedules can be rejected');
      err.code = 'INVALID_STATE';
      throw err;
    }

    await prisma.schedule.delete({
      where: { id: scheduleId },
    });

    return { success: true, message: 'Proposed schedule rejected' };
  }

  /**
   * Manually edits an individual schedule block with strict server-side validation.
   */
  async updateBlock(
    userId: string,
    blockId: string,
    input: UpdateScheduleBlockInput
  ): Promise<ScheduleDTO> {
    const block = await prisma.scheduleBlock.findFirst({
      where: { id: blockId, userId },
      include: {
        schedule: {
          include: {
            blocks: { orderBy: { startTime: 'asc' } },
          },
        },
      },
    });

    if (!block || !block.schedule) {
      const err: any = new Error('Schedule block not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (block.isFixed) {
      const err: any = new Error(
        'Cannot modify fixed college sessions or immutable calendar events'
      );
      err.code = 'CANNOT_MODIFY_FIXED_BLOCK';
      throw err;
    }

    const schedule = block.schedule;
    const targetDate = schedule.date;

    const newStartStr = input.startTime || block.startTime.toISOString().substring(11, 16);
    const newEndStr = input.endTime || block.endTime.toISOString().substring(11, 16);
    const newStartMin = timeToMinutes(newStartStr);
    const newEndMin = timeToMinutes(newEndStr);

    if (newStartMin >= newEndMin) {
      const err: any = new Error('Start time must be strictly before end time');
      err.code = 'INVALID_INTERVAL';
      throw err;
    }

    // Check user preferences (waking boundaries)
    const pref = await prisma.userPreference.findUnique({ where: { userId } });
    const wakeMin = timeToMinutes(pref?.wakeTime || '07:00');
    let sleepMin = timeToMinutes(pref?.sleepTime || '23:00');
    if (sleepMin <= wakeMin) sleepMin = 1440;

    if (newStartMin < wakeMin || newEndMin > sleepMin) {
      const err: any = new Error(
        `Block cannot be scheduled during sleep hours (wake: ${pref?.wakeTime || '07:00'}, sleep: ${pref?.sleepTime || '23:00'})`
      );
      err.code = 'SLEEP_CONFLICT';
      throw err;
    }

    // Check overlapping with any other occupied block in the same schedule (excluding FREE_TIME)
    const otherOccupiedBlocks = schedule.blocks.filter(
      (b: any) => b.id !== blockId && b.blockType !== 'FREE_TIME'
    );
    for (const ob of otherOccupiedBlocks) {
      const obStart = timeToMinutes(ob.startTime.toISOString().substring(11, 16));
      const obEnd = timeToMinutes(ob.endTime.toISOString().substring(11, 16));

      if (
        intervalsOverlap(
          { startMinute: newStartMin, endMinute: newEndMin },
          { startMinute: obStart, endMinute: obEnd }
        )
      ) {
        const err: any = new Error(
          `Time slot overlaps with existing block "${ob.title}" (${ob.startTime.toISOString().substring(11, 16)} - ${ob.endTime.toISOString().substring(11, 16)})`
        );
        err.code = 'OVERLAPPING_BLOCKS';
        throw err;
      }
    }

    const duration = input.durationMinutes || newEndMin - newStartMin;
    const nextVersion = schedule.version + 1;

    const updatedSchedule = await prisma.$transaction(async (tx: any) => {
      // Remove any FREE_TIME blocks that overlap with the new block location
      const overlappingFreeBlocks = schedule.blocks.filter(
        (b: any) =>
          b.blockType === 'FREE_TIME' &&
          intervalsOverlap(
            { startMinute: newStartMin, endMinute: newEndMin },
            {
              startMinute: timeToMinutes(b.startTime.toISOString().substring(11, 16)),
              endMinute: timeToMinutes(b.endTime.toISOString().substring(11, 16)),
            }
          )
      );

      if (overlappingFreeBlocks.length > 0) {
        await tx.scheduleBlock.deleteMany({
          where: { id: { in: overlappingFreeBlocks.map((b: any) => b.id) } },
        });
      }

      await tx.scheduleBlock.update({
        where: { id: blockId },
        data: {
          startTime: new Date(`${targetDate}T${newStartStr}:00.000Z`),
          endTime: new Date(`${targetDate}T${newEndStr}:00.000Z`),
          durationMinutes: duration,
          title: input.title !== undefined ? input.title : block.title,
          isLocked: input.isLocked !== undefined ? input.isLocked : block.isLocked,
          taskId: input.taskId !== undefined ? input.taskId : block.taskId,
        },
      });

      const updated = await tx.schedule.update({
        where: { id: schedule.id },
        data: { version: nextVersion },
        include: {
          blocks: { orderBy: { startTime: 'asc' } },
        },
      });

      await tx.scheduleVersion.create({
        data: {
          scheduleId: schedule.id,
          userId,
          versionNumber: nextVersion,
          status: updated.status,
          changeReason: `Manual edit: updated block "${block.title}"`,
          metrics: updated.metrics as any,
          unscheduledTasks: updated.unscheduledTasks as any,
          blocksSnapshot: updated.blocks.map((b: any) => this.mapBlockToDTO(b)) as any,
        },
      });

      return updated;
    });

    return this.mapScheduleToDTO(updatedSchedule);
  }

  /**
   * Toggles the lock state of a schedule block.
   */
  async toggleBlockLock(
    userId: string,
    blockId: string,
    isLocked?: boolean
  ): Promise<ScheduleBlockDTO> {
    const block = await prisma.scheduleBlock.findFirst({
      where: { id: blockId, userId },
    });

    if (!block) {
      const err: any = new Error('Schedule block not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const newLockState = isLocked !== undefined ? isLocked : !block.isLocked;

    const updated = await prisma.scheduleBlock.update({
      where: { id: blockId },
      data: { isLocked: newLockState },
    });

    return this.mapBlockToDTO(updated);
  }

  /**
   * Intelligently reschedules an existing schedule using minimal-change strategy.
   */
  async reschedule(
    userId: string,
    scheduleId: string,
    input: RescheduleInput
  ): Promise<RescheduleResponseDTO> {
    const schedule = await prisma.schedule.findFirst({
      where: { id: scheduleId, userId },
      include: {
        blocks: { orderBy: { startTime: 'asc' } },
      },
    });

    if (!schedule) {
      const err: any = new Error('Schedule not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const pref = await prisma.userPreference.findUnique({ where: { userId } });
    const preferences = {
      timezone: pref?.timezone || 'Asia/Kolkata',
      wakeTime: pref?.wakeTime || '07:00',
      sleepTime: pref?.sleepTime || '23:00',
      preferredWorkStart: pref?.preferredWorkStart || '09:00',
      preferredWorkEnd: pref?.preferredWorkEnd || '18:00',
      breakfastTime: pref?.breakfastTime || '08:30',
      lunchTime: pref?.lunchTime || '13:00',
      dinnerTime: pref?.dinnerTime || '20:30',
      preferredBreakDuration: pref?.preferredBreakDuration || 15,
      maxContinuousWorkDuration: pref?.maxContinuousWorkDuration || 90,
      dailyLeisureTarget: pref?.dailyLeisureTarget || 120,
    };

    const dbTasks = await prisma.task.findMany({
      where: {
        userId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
      },
      include: { category: true },
    });

    const tasks: SchedulerTaskInput[] = dbTasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      estimatedMinutes: t.estimatedMinutes,
      priority: t.priority as any,
      status: t.status as any,
      preferredTime: t.preferredTime as any,
      energyRequirement: t.energyRequirement as any,
      canSplit: t.canSplit,
      minSessionMinutes: t.minSessionMinutes,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      categoryId: t.categoryId,
      categoryName: t.category?.name || null,
      categoryColor: t.category?.color || null,
      createdAt: t.createdAt.toISOString(),
    }));

    // Convert existing blocks to ScheduledBlockOutput
    const currentBlocks = schedule.blocks.map((b: any) => {
      const sStr = b.startTime.toISOString().substring(11, 16);
      const eStr = b.endTime.toISOString().substring(11, 16);
      return {
        id: b.id,
        startTime: sStr,
        endTime: eStr,
        startMinute: timeToMinutes(sStr),
        endMinute: timeToMinutes(eStr),
        durationMinutes: b.durationMinutes,
        blockType: b.blockType as any,
        isFixed: b.isFixed,
        isLocked: b.isLocked,
        title: b.title,
        taskId: b.taskId,
        eventId: b.eventId,
        metadata: b.metadata as any,
      };
    });

    // Run Intelligent Rescheduler
    const rescheduleResult = this.rescheduler.reschedule({
      currentBlocks,
      targetDate: schedule.date,
      preferences,
      tasks,
      taskModifications: input.taskModifications,
      newEvents: input.newEvents,
      reason: input.reason,
    });

    const nextVersion = schedule.version + 1;

    // Persist changes in a transaction
    const updated = await prisma.$transaction(async (tx: any) => {
      // Delete old blocks
      await tx.scheduleBlock.deleteMany({
        where: { scheduleId },
      });

      // Create new blocks
      if (rescheduleResult.blocks.length > 0) {
        await tx.scheduleBlock.createMany({
          data: rescheduleResult.blocks.map((b: any) => ({
            userId,
            scheduleId,
            taskId: b.taskId || null,
            eventId: b.eventId || null,
            title: b.title,
            startTime: new Date(`${schedule.date}T${b.startTime}:00.000Z`),
            endTime: new Date(`${schedule.date}T${b.endTime}:00.000Z`),
            durationMinutes: b.durationMinutes,
            blockType: b.blockType as any,
            isFixed: b.isFixed,
            isLocked: b.isLocked || false,
            metadata: b.metadata || null,
          })),
        });
      }

      const updatedSched = await tx.schedule.update({
        where: { id: scheduleId },
        data: {
          version: nextVersion,
          metrics: rescheduleResult.metrics as any,
          unscheduledTasks: rescheduleResult.unscheduledTasks as any,
        },
        include: {
          blocks: { orderBy: { startTime: 'asc' } },
        },
      });

      // Create Version Snapshot
      await tx.scheduleVersion.create({
        data: {
          scheduleId,
          userId,
          versionNumber: nextVersion,
          status: updatedSched.status,
          changeReason: input.reason || 'Intelligent reschedule',
          metrics: rescheduleResult.metrics as any,
          unscheduledTasks: rescheduleResult.unscheduledTasks as any,
          blocksSnapshot: updatedSched.blocks.map((b: any) => this.mapBlockToDTO(b)) as any,
        },
      });

      return updatedSched;
    });

    return {
      schedule: this.mapScheduleToDTO(updated),
      diff: rescheduleResult.diff as any,
      changelog: rescheduleResult.changelog,
    };
  }

  /**
   * Retrieves version history for a schedule.
   */
  async getVersions(userId: string, scheduleId: string): Promise<ScheduleVersionDTO[]> {
    const versions = await prisma.scheduleVersion.findMany({
      where: { scheduleId, userId },
      orderBy: { versionNumber: 'desc' },
    });

    return versions.map((v: any) => ({
      id: v.id,
      scheduleId: v.scheduleId,
      userId: v.userId,
      versionNumber: v.versionNumber,
      status: v.status,
      changeReason: v.changeReason,
      metrics: v.metrics,
      unscheduledTasks: v.unscheduledTasks,
      blocksSnapshot: v.blocksSnapshot,
      createdAt: v.createdAt.toISOString(),
    }));
  }

  /**
   * Restores a schedule to an earlier version.
   */
  async restoreVersion(
    userId: string,
    scheduleId: string,
    versionNumber: number
  ): Promise<ScheduleDTO> {
    const targetVersion = await prisma.scheduleVersion.findUnique({
      where: {
        scheduleId_versionNumber: {
          scheduleId,
          versionNumber,
        },
      },
    });

    if (!targetVersion || targetVersion.userId !== userId) {
      const err: any = new Error(`Version ${versionNumber} not found for this schedule`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const currentSchedule = await prisma.schedule.findUniqueOrThrow({
      where: { id: scheduleId },
    });

    const nextVersion = currentSchedule.version + 1;
    const blocksToRestore: ScheduleBlockDTO[] = targetVersion.blocksSnapshot as any;

    const restored = await prisma.$transaction(async (tx: any) => {
      await tx.scheduleBlock.deleteMany({
        where: { scheduleId },
      });

      if (blocksToRestore.length > 0) {
        await tx.scheduleBlock.createMany({
          data: blocksToRestore.map((b: any) => ({
            userId,
            scheduleId,
            taskId: b.taskId || null,
            eventId: b.eventId || null,
            title: b.title,
            startTime: new Date(`${currentSchedule.date}T${b.startTime}:00.000Z`),
            endTime: new Date(`${currentSchedule.date}T${b.endTime}:00.000Z`),
            durationMinutes: b.durationMinutes,
            blockType: b.blockType as any,
            isFixed: b.isFixed,
            isLocked: b.isLocked || false,
            metadata: b.metadata || null,
          })),
        });
      }

      const updated = await tx.schedule.update({
        where: { id: scheduleId },
        data: {
          version: nextVersion,
          status: targetVersion.status,
          metrics: targetVersion.metrics as any,
          unscheduledTasks: targetVersion.unscheduledTasks as any,
        },
        include: {
          blocks: { orderBy: { startTime: 'asc' } },
        },
      });

      await tx.scheduleVersion.create({
        data: {
          scheduleId,
          userId,
          versionNumber: nextVersion,
          status: updated.status,
          changeReason: `Restored from version ${versionNumber}`,
          metrics: updated.metrics as any,
          unscheduledTasks: updated.unscheduledTasks as any,
          blocksSnapshot: updated.blocks.map((b: any) => this.mapBlockToDTO(b)) as any,
        },
      });

      return updated;
    });

    return this.mapScheduleToDTO(restored);
  }

  /**
   * Retrieves the latest active schedule for a given date.
   */
  async getSchedule(userId: string, date: string): Promise<ScheduleDTO | null> {
    // Prefer CONFIRMED schedule, otherwise PROPOSED, otherwise latest
    let schedule = await prisma.schedule.findFirst({
      where: { userId, date, status: 'CONFIRMED' },
      include: { blocks: { orderBy: { startTime: 'asc' } } },
    });

    if (!schedule) {
      schedule = await prisma.schedule.findFirst({
        where: { userId, date, status: 'PROPOSED' },
        include: { blocks: { orderBy: { startTime: 'asc' } } },
      });
    }

    if (!schedule) {
      schedule = await prisma.schedule.findFirst({
        where: { userId, date },
        orderBy: { createdAt: 'desc' },
        include: { blocks: { orderBy: { startTime: 'asc' } } },
      });
    }

    if (!schedule) return null;
    return this.mapScheduleToDTO(schedule);
  }

  /**
   * Retrieves all schedules on a date (proposed, confirmed, archived).
   */
  async getScheduleHistory(userId: string, date: string): Promise<ScheduleDTO[]> {
    const schedules = await prisma.schedule.findMany({
      where: { userId, date },
      orderBy: { createdAt: 'desc' },
      include: { blocks: { orderBy: { startTime: 'asc' } } },
    });

    return schedules.map((s: any) => this.mapScheduleToDTO(s));
  }

  private mapScheduleToDTO(schedule: any): ScheduleDTO {
    return {
      id: schedule.id,
      userId: schedule.userId,
      date: schedule.date,
      status: schedule.status,
      version: schedule.version,
      metrics: schedule.metrics,
      unscheduledTasks: schedule.unscheduledTasks,
      blocks: schedule.blocks.map((b: any) => this.mapBlockToDTO(b)),
      createdAt: schedule.createdAt.toISOString(),
      updatedAt: schedule.updatedAt.toISOString(),
    };
  }

  private mapBlockToDTO(b: any): ScheduleBlockDTO {
    return {
      id: b.id,
      userId: b.userId,
      scheduleId: b.scheduleId,
      taskId: b.taskId,
      eventId: b.eventId,
      title: b.title,
      startTime: b.startTime.toISOString().substring(11, 16),
      endTime: b.endTime.toISOString().substring(11, 16),
      durationMinutes: b.durationMinutes,
      blockType: b.blockType,
      isFixed: b.isFixed,
      isLocked: b.isLocked,
      metadata: b.metadata,
      createdAt: b.createdAt.toISOString(),
    };
  }
}
