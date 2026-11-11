import { prisma } from '../db';
import {
  RecurringTaskSeriesDTO,
  CreateRecurringTaskInput,
  UpdateRecurringTaskInput,
  Priority,
  TimeOfDay,
  EnergyLevel,
  RecurrenceFrequency,
} from '@tempo/shared';
import { toCategoryDTO } from './category.service';

export function toRecurringSeriesDTO(s: any): RecurringTaskSeriesDTO {
  return {
    id: s.id,
    userId: s.userId,
    title: s.title,
    description: s.description,
    categoryId: s.categoryId,
    category: s.category ? toCategoryDTO(s.category) : null,
    estimatedMinutes: s.estimatedMinutes,
    priority: s.priority as Priority,
    preferredTime: s.preferredTime as TimeOfDay,
    energyRequirement: s.energyRequirement as EnergyLevel,
    canSplit: s.canSplit,
    minSessionMinutes: s.minSessionMinutes,
    frequency: s.frequency as RecurrenceFrequency,
    interval: s.interval,
    daysOfWeek: s.daysOfWeek || [],
    startDate: s.startDate.toISOString(),
    endDate: s.endDate ? s.endDate.toISOString() : null,
    isPaused: s.isPaused,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export async function getRecurringSeries(userId: string): Promise<RecurringTaskSeriesDTO[]> {
  const series = await prisma.recurringTaskSeries.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });

  return series.map(toRecurringSeriesDTO);
}

export async function getRecurringSeriesById(
  userId: string,
  id: string
): Promise<RecurringTaskSeriesDTO> {
  const s = await prisma.recurringTaskSeries.findFirst({
    where: { id, userId },
    include: { category: true },
  });

  if (!s) {
    const error: any = new Error('Recurring task series not found');
    error.code = 'RECURRING_SERIES_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  return toRecurringSeriesDTO(s);
}

// Bounded occurrence generator
export function calculateOccurrenceDates(
  series: {
    startDate: Date;
    endDate: Date | null;
    frequency: string;
    interval: number;
    daysOfWeek: number[];
  },
  upToDate: Date
): string[] {
  const dates: string[] = [];
  const current = new Date(series.startDate);
  // Reset time to start of day UTC
  current.setUTCHours(0, 0, 0, 0);

  const maxDate = series.endDate && series.endDate < upToDate ? series.endDate : upToDate;
  maxDate.setUTCHours(23, 59, 59, 999);

  // Safety ceiling: max 100 occurrences generated in a batch
  let count = 0;
  const maxOccurrences = 100;

  if (series.frequency === 'DAILY') {
    const step = Math.max(1, series.interval);
    while (current <= maxDate && count < maxOccurrences) {
      dates.push(current.toISOString().slice(0, 10));
      current.setUTCDate(current.getUTCDate() + step);
      count++;
    }
  } else if (series.frequency === 'WEEKLY') {
    // If daysOfWeek specified, e.g. [1, 3, 5] (1 = Mon ... 7 = Sun)
    const targetDays =
      series.daysOfWeek && series.daysOfWeek.length > 0
        ? series.daysOfWeek
        : [((series.startDate.getUTCDay() + 6) % 7) + 1]; // Convert 0=Sun..6=Sat to 1=Mon..7=Sun

    const checkDate = new Date(current);
    while (checkDate <= maxDate && count < maxOccurrences) {
      // 1=Mon .. 7=Sun
      const dayNum = ((checkDate.getUTCDay() + 6) % 7) + 1;
      if (targetDays.includes(dayNum)) {
        dates.push(checkDate.toISOString().slice(0, 10));
        count++;
      }
      checkDate.setUTCDate(checkDate.getUTCDate() + 1);
    }
  } else if (series.frequency === 'MONTHLY') {
    const step = Math.max(1, series.interval);
    const dayOfMonth = current.getUTCDate();
    while (current <= maxDate && count < maxOccurrences) {
      dates.push(current.toISOString().slice(0, 10));
      current.setUTCMonth(current.getUTCMonth() + step);
      // Ensure day did not skip over shorter months
      if (current.getUTCDate() !== dayOfMonth) {
        current.setUTCDate(0); // last day of prev month
      }
      count++;
    }
  } else {
    // CUSTOM: default interval in days
    const step = Math.max(1, series.interval);
    while (current <= maxDate && count < maxOccurrences) {
      dates.push(current.toISOString().slice(0, 10));
      current.setUTCDate(current.getUTCDate() + step);
      count++;
    }
  }

  return dates;
}

export async function generateOccurrencesForSeries(
  userId: string,
  seriesId: string,
  horizonDays = 21
): Promise<number> {
  const series = await prisma.recurringTaskSeries.findFirst({
    where: { id: seriesId, userId },
  });
  if (!series || series.isPaused) return 0;

  const horizon = new Date();
  horizon.setUTCDate(horizon.getUTCDate() + horizonDays);

  const dates = calculateOccurrenceDates(
    {
      startDate: series.startDate,
      endDate: series.endDate,
      frequency: series.frequency,
      interval: series.interval,
      daysOfWeek: series.daysOfWeek,
    },
    horizon
  );

  if (dates.length === 0) return 0;

  const records = dates.map((dateStr) => ({
    userId: series.userId,
    title: series.title,
    description: series.description,
    categoryId: series.categoryId,
    estimatedMinutes: series.estimatedMinutes,
    priority: series.priority,
    preferredTime: series.preferredTime,
    energyRequirement: series.energyRequirement,
    canSplit: series.canSplit,
    minSessionMinutes: series.minSessionMinutes,
    dueDate: new Date(`${dateStr}T23:59:59.000Z`),
    recurringSeriesId: series.id,
    recurrenceDate: dateStr,
    status: 'TODO' as any,
  }));

  const result = await prisma.task.createMany({
    data: records,
    skipDuplicates: true,
  });

  return result.count;
}

export async function createRecurringSeries(
  userId: string,
  input: CreateRecurringTaskInput
): Promise<{ series: RecurringTaskSeriesDTO; generatedCount: number }> {
  if (input.categoryId) {
    const cat = await prisma.taskCategory.findFirst({
      where: { id: input.categoryId, userId },
    });
    if (!cat) {
      const error: any = new Error('Category not found');
      error.code = 'CATEGORY_NOT_FOUND';
      error.status = 404;
      throw error;
    }
  }

  const series = await prisma.recurringTaskSeries.create({
    data: {
      userId,
      title: input.title,
      description: input.description ?? null,
      categoryId: input.categoryId ?? null,
      estimatedMinutes: input.estimatedMinutes ?? 30,
      priority: input.priority ?? 'MEDIUM',
      preferredTime: input.preferredTime ?? 'ANYTIME',
      energyRequirement: input.energyRequirement ?? 'MEDIUM',
      canSplit: input.canSplit ?? false,
      minSessionMinutes: input.minSessionMinutes ?? 30,
      frequency: input.frequency ?? 'DAILY',
      interval: input.interval ?? 1,
      daysOfWeek: input.daysOfWeek ?? [],
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      isPaused: false,
    },
    include: { category: true },
  });

  const generatedCount = await generateOccurrencesForSeries(userId, series.id, 21);

  return {
    series: toRecurringSeriesDTO(series),
    generatedCount,
  };
}

export async function updateRecurringSeries(
  userId: string,
  id: string,
  input: UpdateRecurringTaskInput,
  updateFutureInstances = false
): Promise<RecurringTaskSeriesDTO> {
  await getRecurringSeriesById(userId, id);

  if (input.categoryId !== undefined && input.categoryId !== null) {
    const cat = await prisma.taskCategory.findFirst({
      where: { id: input.categoryId, userId },
    });
    if (!cat) {
      const error: any = new Error('Category not found');
      error.code = 'CATEGORY_NOT_FOUND';
      error.status = 404;
      throw error;
    }
  }

  const updated = await prisma.recurringTaskSeries.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.estimatedMinutes !== undefined ? { estimatedMinutes: input.estimatedMinutes } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.preferredTime !== undefined ? { preferredTime: input.preferredTime } : {}),
      ...(input.energyRequirement !== undefined
        ? { energyRequirement: input.energyRequirement }
        : {}),
      ...(input.canSplit !== undefined ? { canSplit: input.canSplit } : {}),
      ...(input.minSessionMinutes !== undefined
        ? { minSessionMinutes: input.minSessionMinutes }
        : {}),
      ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
      ...(input.interval !== undefined ? { interval: input.interval } : {}),
      ...(input.daysOfWeek !== undefined ? { daysOfWeek: input.daysOfWeek } : {}),
      ...(input.startDate !== undefined ? { startDate: new Date(input.startDate) } : {}),
      ...(input.endDate !== undefined
        ? { endDate: input.endDate ? new Date(input.endDate) : null }
        : {}),
      ...(input.isPaused !== undefined ? { isPaused: input.isPaused } : {}),
    },
    include: { category: true },
  });

  // If updateFutureInstances is true, propagate title/category/priority/duration to future uncompleted tasks
  if (updateFutureInstances) {
    const now = new Date();
    await prisma.task.updateMany({
      where: {
        recurringSeriesId: id,
        userId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        dueDate: { gte: now },
      },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.estimatedMinutes !== undefined
          ? { estimatedMinutes: input.estimatedMinutes }
          : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.preferredTime !== undefined ? { preferredTime: input.preferredTime } : {}),
        ...(input.energyRequirement !== undefined
          ? { energyRequirement: input.energyRequirement }
          : {}),
      },
    });
  }

  return toRecurringSeriesDTO(updated);
}

export async function deleteRecurringSeries(
  userId: string,
  id: string,
  preserveCompleted = true
): Promise<void> {
  await getRecurringSeriesById(userId, id);

  if (preserveCompleted) {
    // Unlink completed/skipped tasks so historical records persist
    await prisma.task.updateMany({
      where: {
        recurringSeriesId: id,
        userId,
        status: { in: ['COMPLETED', 'SKIPPED', 'CANCELED'] },
      },
      data: { recurringSeriesId: null },
    });

    // Remove future uncompleted instances
    await prisma.task.deleteMany({
      where: {
        recurringSeriesId: id,
        userId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
      },
    });
  }

  await prisma.recurringTaskSeries.delete({
    where: { id },
  });
}
