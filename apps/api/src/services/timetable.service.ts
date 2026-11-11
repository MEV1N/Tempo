import { prisma } from '../db';
import {
  TimetableDTO,
  TimetableSessionDTO,
  CreateTimetableInput,
  UpdateTimetableInput,
  CreateSessionInput,
  UpdateSessionInput,
  SessionType,
} from '@tempo/shared';

export function toSessionDTO(s: any): TimetableSessionDTO {
  return {
    id: s.id,
    timetableId: s.timetableId,
    userId: s.userId,
    title: s.title,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    location: s.location,
    description: s.description,
    sessionType: s.sessionType as SessionType,
    color: s.color,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export function toTimetableDTO(t: any): TimetableDTO {
  return {
    id: t.id,
    userId: t.userId,
    name: t.name,
    isActive: t.isActive,
    startDate: t.startDate ? t.startDate.toISOString() : null,
    endDate: t.endDate ? t.endDate.toISOString() : null,
    sessions: t.sessions ? t.sessions.map(toSessionDTO) : [],
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

// Overlap detection helper
export function checkSessionOverlap(
  existingSessions: {
    id?: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    title: string;
  }[],
  candidate: { id?: string; dayOfWeek: number; startTime: string; endTime: string }
): { hasOverlap: boolean; conflictingSession?: any } {
  for (const existing of existingSessions) {
    if (candidate.id && existing.id === candidate.id) continue;
    if (existing.dayOfWeek !== candidate.dayOfWeek) continue;

    // Check overlap: startA < endB && startB < endA
    if (candidate.startTime < existing.endTime && candidate.endTime > existing.startTime) {
      return { hasOverlap: true, conflictingSession: existing };
    }
  }
  return { hasOverlap: false };
}

export async function getActiveTimetable(userId: string): Promise<TimetableDTO | null> {
  let timetable = await prisma.timetable.findFirst({
    where: { userId, isActive: true },
    include: {
      sessions: {
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      },
    },
  });

  if (!timetable) {
    // If no active timetable exists, auto-provision default timetable
    timetable = await prisma.timetable.create({
      data: {
        userId,
        name: 'Weekly College Timetable',
        isActive: true,
      },
      include: {
        sessions: true,
      },
    });
  }

  return toTimetableDTO(timetable);
}

export async function createTimetable(
  userId: string,
  input: CreateTimetableInput
): Promise<TimetableDTO> {
  // If isActive is true, set others to inactive
  if (input.isActive) {
    await prisma.timetable.updateMany({
      where: { userId },
      data: { isActive: false },
    });
  }

  const timetable = await prisma.timetable.create({
    data: {
      userId,
      name: input.name || 'College Timetable',
      isActive: input.isActive ?? true,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
    },
  });

  // If initial sessions provided, validate overlaps and create
  if (input.sessions && input.sessions.length > 0) {
    for (let i = 0; i < input.sessions.length; i++) {
      for (let j = i + 1; j < input.sessions.length; j++) {
        const overlap = checkSessionOverlap([input.sessions[i]], input.sessions[j]);
        if (overlap.hasOverlap) {
          const err: any = new Error(
            `Conflicting sessions detected on day ${input.sessions[i].dayOfWeek}: ${input.sessions[i].title} overlaps with ${input.sessions[j].title}`
          );
          err.code = 'SESSION_OVERLAP_CONFLICT';
          err.status = 409;
          throw err;
        }
      }
    }

    await prisma.timetableSession.createMany({
      data: input.sessions.map((s) => ({
        timetableId: timetable.id,
        userId,
        title: s.title,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location ?? null,
        description: s.description ?? null,
        sessionType: s.sessionType ?? 'CLASS',
        color: s.color ?? null,
      })),
    });
  }

  const result = await prisma.timetable.findUnique({
    where: { id: timetable.id },
    include: {
      sessions: {
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      },
    },
  });

  return toTimetableDTO(result!);
}

export async function updateTimetable(
  userId: string,
  id: string,
  input: UpdateTimetableInput
): Promise<TimetableDTO> {
  const existing = await prisma.timetable.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    const error: any = new Error('Timetable not found');
    error.code = 'TIMETABLE_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  if (input.isActive) {
    await prisma.timetable.updateMany({
      where: { userId, NOT: { id } },
      data: { isActive: false },
    });
  }

  const updated = await prisma.timetable.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.startDate !== undefined
        ? { startDate: input.startDate ? new Date(input.startDate) : null }
        : {}),
      ...(input.endDate !== undefined
        ? { endDate: input.endDate ? new Date(input.endDate) : null }
        : {}),
    },
    include: {
      sessions: {
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      },
    },
  });

  return toTimetableDTO(updated);
}

export async function addSession(
  userId: string,
  timetableId: string,
  input: CreateSessionInput
): Promise<TimetableSessionDTO> {
  const timetable = await prisma.timetable.findFirst({
    where: { id: timetableId, userId },
    include: { sessions: true },
  });
  if (!timetable) {
    const error: any = new Error('Timetable not found');
    error.code = 'TIMETABLE_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  // Validate session overlap
  const overlap = checkSessionOverlap(timetable.sessions, input);
  if (overlap.hasOverlap) {
    const err: any = new Error(
      `Schedule conflict: This session (${input.startTime} - ${input.endTime}) overlaps with '${overlap.conflictingSession.title}' (${overlap.conflictingSession.startTime} - ${overlap.conflictingSession.endTime}) on this day.`
    );
    err.code = 'SESSION_OVERLAP_CONFLICT';
    err.status = 409;
    throw err;
  }

  const session = await prisma.timetableSession.create({
    data: {
      timetableId,
      userId,
      title: input.title,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location ?? null,
      description: input.description ?? null,
      sessionType: input.sessionType ?? 'CLASS',
      color: input.color ?? null,
    },
  });

  return toSessionDTO(session);
}

export async function updateSession(
  userId: string,
  sessionId: string,
  input: UpdateSessionInput
): Promise<TimetableSessionDTO> {
  const existing = await prisma.timetableSession.findFirst({
    where: { id: sessionId, userId },
    include: { timetable: { include: { sessions: true } } },
  });
  if (!existing) {
    const error: any = new Error('Timetable session not found');
    error.code = 'SESSION_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  const candidate = {
    id: existing.id,
    dayOfWeek: input.dayOfWeek ?? existing.dayOfWeek,
    startTime: input.startTime ?? existing.startTime,
    endTime: input.endTime ?? existing.endTime,
  };

  if (candidate.startTime >= candidate.endTime) {
    const err: any = new Error('Session end time must be after start time');
    err.code = 'INVALID_TIME_RANGE';
    err.status = 400;
    throw err;
  }

  // Check overlap against sibling sessions in the same timetable
  const siblingSessions = existing.timetable.sessions;
  const overlap = checkSessionOverlap(siblingSessions, candidate);
  if (overlap.hasOverlap) {
    const err: any = new Error(
      `Schedule conflict: Updated timing (${candidate.startTime} - ${candidate.endTime}) overlaps with '${overlap.conflictingSession.title}' (${overlap.conflictingSession.startTime} - ${overlap.conflictingSession.endTime}) on this day.`
    );
    err.code = 'SESSION_OVERLAP_CONFLICT';
    err.status = 409;
    throw err;
  }

  const updated = await prisma.timetableSession.update({
    where: { id: sessionId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.dayOfWeek !== undefined ? { dayOfWeek: input.dayOfWeek } : {}),
      ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
      ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.sessionType !== undefined ? { sessionType: input.sessionType } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    },
  });

  return toSessionDTO(updated);
}

export async function deleteSession(userId: string, sessionId: string): Promise<void> {
  const existing = await prisma.timetableSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!existing) {
    const error: any = new Error('Timetable session not found');
    error.code = 'SESSION_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  await prisma.timetableSession.delete({
    where: { id: sessionId },
  });
}
