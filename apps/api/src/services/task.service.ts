import { prisma } from '../db';
import {
  TaskItemDTO,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilterInput,
  Priority,
  TaskStatusType,
  TimeOfDay,
  EnergyLevel,
} from '@tempo/shared';
import { toCategoryDTO } from './category.service';

export function toTaskDTO(t: any): TaskItemDTO {
  return {
    id: t.id,
    userId: t.userId,
    title: t.title,
    description: t.description,
    categoryId: t.categoryId,
    category: t.category ? toCategoryDTO(t.category) : null,
    estimatedMinutes: t.estimatedMinutes,
    priority: t.priority as Priority,
    status: t.status as TaskStatusType,
    preferredTime: t.preferredTime as TimeOfDay,
    energyRequirement: t.energyRequirement as EnergyLevel,
    canSplit: t.canSplit,
    minSessionMinutes: t.minSessionMinutes,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    recurringSeriesId: t.recurringSeriesId,
    recurrenceDate: t.recurrenceDate,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export async function getTasks(
  userId: string,
  filter: TaskFilterInput
): Promise<{ tasks: TaskItemDTO[]; total: number; page: number; totalPages: number }> {
  const where: any = { userId };

  // Status filtering
  if (filter.status && filter.status !== 'ALL') {
    where.status = filter.status;
  }

  // Priority filtering
  if (filter.priority) {
    where.priority = filter.priority;
  }

  // Category filtering
  if (filter.categoryId) {
    where.categoryId = filter.categoryId;
  }

  // Completed boolean filter
  if (filter.completed === 'true') {
    where.status = 'COMPLETED';
  } else if (filter.completed === 'false') {
    where.status = { not: 'COMPLETED' };
  }

  const now = new Date();

  // Overdue filter: dueDate in past AND status is not COMPLETED or CANCELED or SKIPPED
  if (filter.overdue === 'true') {
    where.dueDate = { lt: now };
    where.status = { in: ['TODO', 'IN_PROGRESS'] };
  }

  // Upcoming filter: dueDate in future AND status not COMPLETED
  if (filter.upcoming === 'true') {
    where.dueDate = { gte: now };
    where.status = { in: ['TODO', 'IN_PROGRESS'] };
  }

  // Search filter across title & description
  if (filter.search && filter.search.trim()) {
    const term = filter.search.trim();
    where.OR = [
      { title: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
    ];
  }

  // Sorting
  const sortBy = filter.sortBy || 'createdAt';
  const sortOrder = filter.sortOrder || 'desc';
  const orderBy: any = {};
  if (sortBy === 'priority') {
    orderBy.priority = sortOrder;
  } else if (sortBy === 'dueDate') {
    orderBy.dueDate = { sort: sortOrder, nulls: 'last' };
  } else if (sortBy === 'estimatedMinutes') {
    orderBy.estimatedMinutes = sortOrder;
  } else if (sortBy === 'title') {
    orderBy.title = sortOrder;
  } else {
    orderBy.createdAt = sortOrder;
  }

  const page = filter.page || 1;
  const limit = filter.limit || 50;
  const skip = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: { category: true },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.task.count({ where }),
  ]);

  return {
    tasks: tasks.map(toTaskDTO),
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getTaskById(userId: string, id: string): Promise<TaskItemDTO> {
  const task = await prisma.task.findFirst({
    where: { id, userId },
    include: { category: true },
  });

  if (!task) {
    const error: any = new Error('Task not found');
    error.code = 'TASK_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  return toTaskDTO(task);
}

export async function createTask(userId: string, input: CreateTaskInput): Promise<TaskItemDTO> {
  // If categoryId provided, verify it belongs to user
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

  const status = input.status || 'TODO';
  const completedAt = status === 'COMPLETED' ? new Date() : null;

  const task = await prisma.task.create({
    data: {
      userId,
      title: input.title,
      description: input.description ?? null,
      categoryId: input.categoryId ?? null,
      estimatedMinutes: input.estimatedMinutes ?? 30,
      priority: input.priority ?? 'MEDIUM',
      status: status as any,
      preferredTime: input.preferredTime ?? 'ANYTIME',
      energyRequirement: input.energyRequirement ?? 'MEDIUM',
      canSplit: input.canSplit ?? false,
      minSessionMinutes: input.minSessionMinutes ?? 30,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      completedAt,
      recurringSeriesId: input.recurringSeriesId ?? null,
      recurrenceDate: input.recurrenceDate ?? null,
    },
    include: { category: true },
  });

  return toTaskDTO(task);
}

export async function updateTask(
  userId: string,
  id: string,
  input: UpdateTaskInput
): Promise<TaskItemDTO> {
  const current = await getTaskById(userId, id);

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

  // Handle completedAt timestamp transition
  let completedAtUpdate = undefined;
  if (input.status !== undefined) {
    if (input.status === 'COMPLETED' && current.status !== 'COMPLETED') {
      completedAtUpdate = new Date();
    } else if (input.status !== 'COMPLETED' && current.status === 'COMPLETED') {
      completedAtUpdate = null;
    }
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.estimatedMinutes !== undefined ? { estimatedMinutes: input.estimatedMinutes } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.status !== undefined ? { status: input.status as any } : {}),
      ...(completedAtUpdate !== undefined ? { completedAt: completedAtUpdate } : {}),
      ...(input.completedAt !== undefined && completedAtUpdate === undefined
        ? { completedAt: input.completedAt ? new Date(input.completedAt) : null }
        : {}),
      ...(input.preferredTime !== undefined ? { preferredTime: input.preferredTime } : {}),
      ...(input.energyRequirement !== undefined
        ? { energyRequirement: input.energyRequirement }
        : {}),
      ...(input.canSplit !== undefined ? { canSplit: input.canSplit } : {}),
      ...(input.minSessionMinutes !== undefined
        ? { minSessionMinutes: input.minSessionMinutes }
        : {}),
      ...(input.dueDate !== undefined
        ? { dueDate: input.dueDate ? new Date(input.dueDate) : null }
        : {}),
    },
    include: { category: true },
  });

  return toTaskDTO(updated);
}

export async function deleteTask(userId: string, id: string): Promise<void> {
  await getTaskById(userId, id);
  await prisma.task.delete({ where: { id } });
}

export async function getTaskOverview(userId: string): Promise<{
  totalActive: number;
  completed: number;
  overdue: number;
  upcoming: number;
  byPriority: Record<string, number>;
}> {
  const now = new Date();

  const [activeCount, completedCount, overdueCount, upcomingCount, priorityGroups] =
    await Promise.all([
      prisma.task.count({
        where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } },
      }),
      prisma.task.count({
        where: { userId, status: 'COMPLETED' },
      }),
      prisma.task.count({
        where: {
          userId,
          dueDate: { lt: now },
          status: { in: ['TODO', 'IN_PROGRESS'] },
        },
      }),
      prisma.task.count({
        where: {
          userId,
          dueDate: { gte: now },
          status: { in: ['TODO', 'IN_PROGRESS'] },
        },
      }),
      prisma.task.groupBy({
        by: ['priority'],
        where: { userId, status: { in: ['TODO', 'IN_PROGRESS'] } },
        _count: { priority: true },
      }),
    ]);

  const byPriority: Record<string, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    URGENT: 0,
  };
  for (const group of priorityGroups) {
    byPriority[group.priority] = group._count.priority;
  }

  return {
    totalActive: activeCount,
    completed: completedCount,
    overdue: overdueCount,
    upcoming: upcomingCount,
    byPriority,
  };
}
