import { prisma } from '../db';
import { TaskCategoryDTO, CreateCategoryInput, UpdateCategoryInput } from '@tempo/shared';

export function toCategoryDTO(cat: any): TaskCategoryDTO {
  return {
    id: cat.id,
    userId: cat.userId,
    name: cat.name,
    color: cat.color,
    taskCount: cat._count?.tasks ?? cat.tasks?.length ?? 0,
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
  };
}

export async function getCategories(userId: string): Promise<TaskCategoryDTO[]> {
  const categories = await prisma.taskCategory.findMany({
    where: { userId },
    include: {
      _count: {
        select: { tasks: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return categories.map(toCategoryDTO);
}

export async function getCategoryById(userId: string, id: string): Promise<TaskCategoryDTO> {
  const category = await prisma.taskCategory.findFirst({
    where: { id, userId },
    include: {
      _count: {
        select: { tasks: true },
      },
    },
  });

  if (!category) {
    const error: any = new Error('Category not found');
    error.code = 'CATEGORY_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  return toCategoryDTO(category);
}

export async function createCategory(
  userId: string,
  input: CreateCategoryInput
): Promise<TaskCategoryDTO> {
  const existing = await prisma.taskCategory.findFirst({
    where: {
      userId,
      name: { equals: input.name, mode: 'insensitive' },
    },
  });

  if (existing) {
    const error: any = new Error('A category with this name already exists');
    error.code = 'CATEGORY_ALREADY_EXISTS';
    error.status = 409;
    throw error;
  }

  const category = await prisma.taskCategory.create({
    data: {
      userId,
      name: input.name,
      color: input.color || '#38bdf8',
    },
  });

  return toCategoryDTO(category);
}

export async function updateCategory(
  userId: string,
  id: string,
  input: UpdateCategoryInput
): Promise<TaskCategoryDTO> {
  await getCategoryById(userId, id);

  if (input.name) {
    const existing = await prisma.taskCategory.findFirst({
      where: {
        userId,
        name: { equals: input.name, mode: 'insensitive' },
        NOT: { id },
      },
    });

    if (existing) {
      const error: any = new Error('A category with this name already exists');
      error.code = 'CATEGORY_ALREADY_EXISTS';
      error.status = 409;
      throw error;
    }
  }

  const updated = await prisma.taskCategory.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    },
    include: {
      _count: { select: { tasks: true } },
    },
  });

  return toCategoryDTO(updated);
}

export async function deleteCategory(userId: string, id: string): Promise<void> {
  await getCategoryById(userId, id);

  // Unlink tasks explicitly in transaction or let Prisma onDelete: SetNull handle it
  await prisma.$transaction([
    prisma.task.updateMany({
      where: { categoryId: id, userId },
      data: { categoryId: null },
    }),
    prisma.recurringTaskSeries.updateMany({
      where: { categoryId: id, userId },
      data: { categoryId: null },
    }),
    prisma.taskCategory.delete({
      where: { id },
    }),
  ]);
}
