import { prisma } from '../db';
import {
  CreateActivityInput,
  UpdateActivityInput,
  ActivityFilterInput,
  ActivitySessionDTO,
} from '@tempo/shared';

export class ActivityService {
  /**
   * Records a manual work/study activity session.
   */
  async createActivity(userId: string, input: CreateActivityInput): Promise<ActivitySessionDTO> {
    const startTime = new Date(input.startTime);
    const endTime = new Date(input.endTime);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      const err: any = new Error('Invalid start or end timestamp');
      err.code = 'INVALID_TIMESTAMP';
      throw err;
    }

    if (startTime >= endTime) {
      const err: any = new Error('End time must be strictly after start time');
      err.code = 'INVALID_INTERVAL';
      throw err;
    }

    const calculatedMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
    const durationMinutes = input.durationMinutes || calculatedMinutes;

    if (durationMinutes <= 0) {
      const err: any = new Error('Activity duration must be greater than zero');
      err.code = 'INVALID_DURATION';
      throw err;
    }

    const date = input.date || input.startTime.substring(0, 10);

    // Verify task if provided
    if (input.taskId) {
      const task = await prisma.task.findFirst({
        where: { id: input.taskId, userId },
      });
      if (!task) {
        const err: any = new Error('Associated task not found');
        err.code = 'NOT_FOUND';
        throw err;
      }

      // If user logs activity as completed, update task status if desired
      if (input.completedAsPlanned && task.status !== 'COMPLETED') {
        await prisma.task.update({
          where: { id: task.id },
          data: {
            status: 'COMPLETED',
            completedAt: endTime,
          },
        });
      }
    }

    // Verify schedule block if provided
    if (input.scheduleBlockId) {
      const block = await prisma.scheduleBlock.findFirst({
        where: { id: input.scheduleBlockId, userId },
      });
      if (!block) {
        const err: any = new Error('Associated schedule block not found');
        err.code = 'NOT_FOUND';
        throw err;
      }
    }

    const activity = await prisma.activitySession.create({
      data: {
        userId,
        title: input.title,
        category: input.category as any,
        taskId: input.taskId || null,
        scheduleBlockId: input.scheduleBlockId || null,
        startTime,
        endTime,
        durationMinutes,
        date,
        notes: input.notes || null,
        completedAsPlanned:
          input.completedAsPlanned !== undefined ? input.completedAsPlanned : true,
      },
      include: {
        task: true,
      },
    });

    return this.mapToDTO(activity);
  }

  /**
   * Retrieves activity sessions with optional date/range/category filtering.
   */
  async getActivities(userId: string, filter: ActivityFilterInput): Promise<ActivitySessionDTO[]> {
    const whereClause: any = { userId };

    if (filter.date) {
      whereClause.date = filter.date;
    } else if (filter.startDate && filter.endDate) {
      whereClause.date = {
        gte: filter.startDate,
        lte: filter.endDate,
      };
    } else if (filter.startDate) {
      whereClause.date = { gte: filter.startDate };
    }

    if (filter.category) {
      whereClause.category = filter.category;
    }

    if (filter.taskId) {
      whereClause.taskId = filter.taskId;
    }

    const activities = await prisma.activitySession.findMany({
      where: whereClause,
      orderBy: { startTime: 'desc' },
      include: {
        task: true,
      },
    });

    return activities.map((a: any) => this.mapToDTO(a));
  }

  /**
   * Retrieves a single activity session by ID.
   */
  async getActivityById(userId: string, id: string): Promise<ActivitySessionDTO> {
    const activity = await prisma.activitySession.findFirst({
      where: { id, userId },
      include: {
        task: true,
      },
    });

    if (!activity) {
      const err: any = new Error('Activity session not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    return this.mapToDTO(activity);
  }

  /**
   * Updates an existing activity session.
   */
  async updateActivity(
    userId: string,
    id: string,
    input: UpdateActivityInput
  ): Promise<ActivitySessionDTO> {
    const existing = await prisma.activitySession.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      const err: any = new Error('Activity session not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const startTime = input.startTime ? new Date(input.startTime) : existing.startTime;
    const endTime = input.endTime ? new Date(input.endTime) : existing.endTime;

    if (startTime >= endTime) {
      const err: any = new Error('End time must be strictly after start time');
      err.code = 'INVALID_INTERVAL';
      throw err;
    }

    const durationMinutes =
      input.durationMinutes || Math.round((endTime.getTime() - startTime.getTime()) / 60000);

    const date = input.date || (input.startTime ? input.startTime.substring(0, 10) : existing.date);

    const updated = await prisma.activitySession.update({
      where: { id },
      data: {
        title: input.title !== undefined ? input.title : existing.title,
        category: input.category ? (input.category as any) : existing.category,
        taskId: input.taskId !== undefined ? input.taskId : existing.taskId,
        scheduleBlockId:
          input.scheduleBlockId !== undefined ? input.scheduleBlockId : existing.scheduleBlockId,
        startTime,
        endTime,
        durationMinutes,
        date,
        notes: input.notes !== undefined ? input.notes : existing.notes,
        completedAsPlanned:
          input.completedAsPlanned !== undefined
            ? input.completedAsPlanned
            : existing.completedAsPlanned,
      },
      include: {
        task: true,
      },
    });

    return this.mapToDTO(updated);
  }

  /**
   * Deletes an activity session.
   */
  async deleteActivity(userId: string, id: string): Promise<{ success: boolean; message: string }> {
    const existing = await prisma.activitySession.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      const err: any = new Error('Activity session not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    await prisma.activitySession.delete({
      where: { id },
    });

    return { success: true, message: 'Activity session deleted successfully' };
  }

  private mapToDTO(a: any): ActivitySessionDTO {
    const sStr = a.startTime.toISOString().substring(11, 16);
    const eStr = a.endTime.toISOString().substring(11, 16);

    return {
      id: a.id,
      userId: a.userId,
      title: a.title,
      category: a.category,
      taskId: a.taskId,
      taskTitle: a.task?.title || null,
      scheduleBlockId: a.scheduleBlockId,
      startTime: a.startTime.toISOString(),
      endTime: a.endTime.toISOString(),
      timeDisplay: `${sStr} - ${eStr}`,
      durationMinutes: a.durationMinutes,
      date: a.date,
      notes: a.notes,
      completedAsPlanned: a.completedAsPlanned,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
  }
}
