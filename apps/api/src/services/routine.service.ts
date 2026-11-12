import { prisma } from '../db';
import {
  PersonalRoutineDTO,
  CreateRoutineInput,
  UpdateRoutineInput,
  CopyRoutinesInput,
  RoutineCategory,
  RoutineClassification,
} from '@tempo/shared';
import { PersonalRoutine } from '@tempo/database';

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function fromMinutes(mins: number): string {
  const normalized = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function toRoutineDTO(routine: PersonalRoutine): PersonalRoutineDTO {
  return {
    id: routine.id,
    userId: routine.userId,
    name: routine.name,
    category: routine.category as RoutineCategory,
    classification: routine.classification as RoutineClassification,
    startTime: routine.startTime,
    endTime: routine.endTime,
    durationMinutes: routine.durationMinutes,
    daysOfWeek: routine.daysOfWeek,
    isEnabled: routine.isEnabled,
    color: routine.color,
    description: routine.description,
    createdAt: routine.createdAt.toISOString(),
    updatedAt: routine.updatedAt.toISOString(),
  };
}

export class RoutineService {
  /**
   * Retrieves all routines for the authenticated user, with optional day and category filters.
   */
  async getRoutines(
    userId: string,
    filters?: { dayOfWeek?: number; category?: string; isEnabled?: boolean }
  ): Promise<PersonalRoutineDTO[]> {
    const where: any = { userId };

    if (filters?.isEnabled !== undefined) {
      where.isEnabled = filters.isEnabled;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    const routines = await prisma.personalRoutine.findMany({
      where,
      orderBy: [{ startTime: 'asc' }, { name: 'asc' }],
    });

    if (filters?.dayOfWeek !== undefined) {
      const targetDay = Number(filters.dayOfWeek);
      return routines
        .filter((r: PersonalRoutine) => r.daysOfWeek.includes(targetDay))
        .map(toRoutineDTO);
    }

    return routines.map(toRoutineDTO);
  }

  /**
   * Retrieves a specific routine by ID with ownership enforcement.
   */
  async getRoutineById(userId: string, routineId: string): Promise<PersonalRoutineDTO> {
    const routine = await prisma.personalRoutine.findFirst({
      where: { id: routineId, userId },
    });

    if (!routine) {
      const err: any = new Error('Personal routine not found');
      err.code = 'ROUTINE_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    return toRoutineDTO(routine);
  }

  /**
   * Creates a new personal routine record.
   */
  async createRoutine(userId: string, input: CreateRoutineInput): Promise<PersonalRoutineDTO> {
    const startMin = toMinutes(input.startTime);
    const endMin = toMinutes(input.endTime);
    let duration = input.durationMinutes;

    if (!duration) {
      if (endMin > startMin) {
        duration = endMin - startMin;
      } else {
        // Spans past midnight or same time
        duration = 1440 - startMin + endMin;
      }
    }

    const created = await prisma.personalRoutine.create({
      data: {
        userId,
        name: input.name,
        category: input.category as any,
        classification: input.classification as any,
        startTime: input.startTime,
        endTime: input.endTime,
        durationMinutes: duration,
        daysOfWeek: input.daysOfWeek,
        isEnabled: input.isEnabled ?? true,
        color: input.color || null,
        description: input.description || null,
      },
    });

    return toRoutineDTO(created);
  }

  /**
   * Updates an existing personal routine with ownership validation.
   */
  async updateRoutine(
    userId: string,
    routineId: string,
    input: UpdateRoutineInput
  ): Promise<PersonalRoutineDTO> {
    const existing = await prisma.personalRoutine.findFirst({
      where: { id: routineId, userId },
    });

    if (!existing) {
      const err: any = new Error('Personal routine not found');
      err.code = 'ROUTINE_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const newStart = input.startTime ?? existing.startTime;
    const newEnd = input.endTime ?? existing.endTime;
    let duration = input.durationMinutes ?? existing.durationMinutes;

    if (input.startTime !== undefined || input.endTime !== undefined) {
      const startMin = toMinutes(newStart);
      const endMin = toMinutes(newEnd);
      if (endMin > startMin) {
        duration = endMin - startMin;
      } else {
        duration = 1440 - startMin + endMin;
      }
    }

    const updated = await prisma.personalRoutine.update({
      where: { id: routineId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.category !== undefined ? { category: input.category as any } : {}),
        ...(input.classification !== undefined
          ? { classification: input.classification as any }
          : {}),
        ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
        ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
        ...(input.daysOfWeek !== undefined ? { daysOfWeek: input.daysOfWeek } : {}),
        ...(input.isEnabled !== undefined ? { isEnabled: input.isEnabled } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        durationMinutes: duration,
      },
    });

    return toRoutineDTO(updated);
  }

  /**
   * Deletes a personal routine record.
   */
  async deleteRoutine(userId: string, routineId: string): Promise<{ deleted: boolean }> {
    const existing = await prisma.personalRoutine.findFirst({
      where: { id: routineId, userId },
    });

    if (!existing) {
      const err: any = new Error('Personal routine not found');
      err.code = 'ROUTINE_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    await prisma.personalRoutine.delete({
      where: { id: routineId },
    });

    return { deleted: true };
  }

  /**
   * Copies all routines applicable on `fromDay` to all days in `toDays`.
   */
  async copyRoutines(
    userId: string,
    input: CopyRoutinesInput
  ): Promise<{ count: number; routines: PersonalRoutineDTO[] }> {
    const fromRoutines = await prisma.personalRoutine.findMany({
      where: { userId },
    });

    const applicable = fromRoutines.filter((r: PersonalRoutine) =>
      r.daysOfWeek.includes(input.fromDay)
    );
    const updatedRoutines: PersonalRoutine[] = [];

    for (const r of applicable) {
      const newDaysSet = new Set<number>(r.daysOfWeek);
      for (const targetDay of input.toDays) {
        newDaysSet.add(targetDay);
      }
      const newDaysArray = Array.from(newDaysSet).sort((a: number, b: number) => a - b);

      if (newDaysArray.length !== r.daysOfWeek.length) {
        const updated = await prisma.personalRoutine.update({
          where: { id: r.id },
          data: { daysOfWeek: newDaysArray },
        });
        updatedRoutines.push(updated);
      } else {
        updatedRoutines.push(r);
      }
    }

    return {
      count: updatedRoutines.length,
      routines: updatedRoutines.map(toRoutineDTO),
    };
  }

  /**
   * Generates a starter set of default routines derived from the user's UserPreference settings.
   */
  async seedDefaultRoutines(userId: string): Promise<PersonalRoutineDTO[]> {
    const existing = await prisma.personalRoutine.findMany({
      where: { userId },
    });

    if (existing.length > 0) {
      return existing.map(toRoutineDTO);
    }

    const pref = await prisma.userPreference.findUnique({
      where: { userId },
    });

    const wakeTime = pref?.wakeTime || '07:00';
    const sleepTime = pref?.sleepTime || '23:00';
    const breakfastTime = pref?.breakfastTime || '08:30';
    const lunchTime = pref?.lunchTime || '13:00';
    const dinnerTime = pref?.dinnerTime || '20:30';

    const defaultTemplates: CreateRoutineInput[] = [
      {
        name: 'Night Sleep',
        category: 'SLEEP',
        classification: 'FIXED',
        startTime: sleepTime,
        endTime: wakeTime,
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        isEnabled: true,
        color: '#475569',
        description: 'Nightly restorative sleep schedule',
      },
      {
        name: 'Morning Routine',
        category: 'MORNING_ROUTINE',
        classification: 'FIXED',
        startTime: wakeTime,
        endTime: fromMinutes(toMinutes(wakeTime) + 45),
        daysOfWeek: [1, 2, 3, 4, 5],
        isEnabled: true,
        color: '#06b6d4',
        description: 'Wake up, hydration, hygiene and day prep',
      },
      {
        name: 'Breakfast',
        category: 'MEAL',
        classification: 'FIXED',
        startTime: breakfastTime,
        endTime: fromMinutes(toMinutes(breakfastTime) + 45),
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        isEnabled: true,
        color: '#f97316',
        description: 'Morning meal and nutrition',
      },
      {
        name: 'Lunch',
        category: 'MEAL',
        classification: 'FIXED',
        startTime: lunchTime,
        endTime: fromMinutes(toMinutes(lunchTime) + 45),
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        isEnabled: true,
        color: '#f97316',
        description: 'Midday meal break',
      },
      {
        name: 'Dinner',
        category: 'MEAL',
        classification: 'FIXED',
        startTime: dinnerTime,
        endTime: fromMinutes(toMinutes(dinnerTime) + 45),
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        isEnabled: true,
        color: '#f97316',
        description: 'Evening dinner and wind-down',
      },
      {
        name: 'Exercise & Workout',
        category: 'EXERCISE',
        classification: 'FLEXIBLE',
        startTime: '17:30',
        endTime: '18:30',
        daysOfWeek: [1, 3, 5],
        isEnabled: true,
        color: '#10b981',
        description: 'Cardio, strength training, or personal fitness',
      },
      {
        name: 'Evening Routine & Wind-down',
        category: 'EVENING_ROUTINE',
        classification: 'FLEXIBLE',
        startTime: fromMinutes(toMinutes(sleepTime) - 45),
        endTime: sleepTime,
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        isEnabled: true,
        color: '#6366f1',
        description: 'Screen-off, reading, and preparing for sleep',
      },
    ];

    const createdList: PersonalRoutine[] = [];

    for (const t of defaultTemplates) {
      const startMin = toMinutes(t.startTime);
      const endMin = toMinutes(t.endTime);
      const duration = endMin > startMin ? endMin - startMin : 1440 - startMin + endMin;

      const created = await prisma.personalRoutine.create({
        data: {
          userId,
          name: t.name,
          category: t.category as any,
          classification: t.classification as any,
          startTime: t.startTime,
          endTime: t.endTime,
          durationMinutes: duration,
          daysOfWeek: t.daysOfWeek,
          isEnabled: true,
          color: t.color,
          description: t.description,
        },
      });
      createdList.push(created);
    }

    return createdList.map(toRoutineDTO);
  }
}

export const routineService = new RoutineService();
