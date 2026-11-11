import { prisma } from '../db';
import {
  CalendarEventDTO,
  CalendarExceptionDTO,
  CalendarViewItemDTO,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  CreateCalendarExceptionInput,
  UpdateCalendarExceptionInput,
  EventType,
  ExceptionType,
} from '@tempo/shared';
import { toSessionDTO } from './timetable.service';

export function toCalendarEventDTO(e: any): CalendarEventDTO {
  return {
    id: e.id,
    userId: e.userId,
    title: e.title,
    description: e.description,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime.toISOString(),
    isAllDay: e.isAllDay,
    eventType: e.eventType as EventType,
    location: e.location,
    color: e.color,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export function toCalendarExceptionDTO(ex: any): CalendarExceptionDTO {
  return {
    id: ex.id,
    userId: ex.userId,
    timetableSessionId: ex.timetableSessionId,
    timetableSession: ex.timetableSession ? toSessionDTO(ex.timetableSession) : null,
    date: ex.date,
    exceptionType: ex.exceptionType as ExceptionType,
    isFullDay: ex.isFullDay,
    startTime: ex.startTime ? ex.startTime.toISOString() : null,
    endTime: ex.endTime ? ex.endTime.toISOString() : null,
    title: ex.title,
    description: ex.description,
    createdAt: ex.createdAt.toISOString(),
    updatedAt: ex.updatedAt.toISOString(),
  };
}

// Default colors for visual distinction
const EVENT_COLORS: Record<string, string> = {
  CLASS: '#3b82f6', // blue
  LAB: '#6366f1', // indigo
  BREAK: '#10b981', // emerald
  TRAVEL: '#f59e0b', // amber
  EXAM: '#ef4444', // red
  HOLIDAY: '#8b5cf6', // purple
  APPOINTMENT: '#ec4899', // pink
  MEETING: '#06b6d4', // cyan
  COMMITMENT: '#14b8a6', // teal
  SPECIAL: '#f97316', // orange
  OTHER: '#64748b', // slate
};

export async function getCalendarEvents(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<CalendarEventDTO[]> {
  const where: any = { userId };
  if (startDate && endDate) {
    where.startTime = { gte: new Date(startDate) };
    where.endTime = { lte: new Date(endDate) };
  }

  const events = await prisma.calendarEvent.findMany({
    where,
    orderBy: { startTime: 'asc' },
  });

  return events.map(toCalendarEventDTO);
}

export async function createCalendarEvent(
  userId: string,
  input: CreateCalendarEventInput
): Promise<CalendarEventDTO> {
  const event = await prisma.calendarEvent.create({
    data: {
      userId,
      title: input.title,
      description: input.description ?? null,
      startTime: new Date(input.startTime),
      endTime: new Date(input.endTime),
      isAllDay: input.isAllDay ?? false,
      eventType: input.eventType ?? 'COMMITMENT',
      location: input.location ?? null,
      color: input.color || EVENT_COLORS[input.eventType ?? 'COMMITMENT'] || '#3b82f6',
    },
  });

  return toCalendarEventDTO(event);
}

export async function updateCalendarEvent(
  userId: string,
  id: string,
  input: UpdateCalendarEventInput
): Promise<CalendarEventDTO> {
  const existing = await prisma.calendarEvent.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    const error: any = new Error('Calendar event not found');
    error.code = 'EVENT_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  const updated = await prisma.calendarEvent.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.startTime !== undefined ? { startTime: new Date(input.startTime) } : {}),
      ...(input.endTime !== undefined ? { endTime: new Date(input.endTime) } : {}),
      ...(input.isAllDay !== undefined ? { isAllDay: input.isAllDay } : {}),
      ...(input.eventType !== undefined ? { eventType: input.eventType } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    },
  });

  return toCalendarEventDTO(updated);
}

export async function deleteCalendarEvent(userId: string, id: string): Promise<void> {
  const existing = await prisma.calendarEvent.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    const error: any = new Error('Calendar event not found');
    error.code = 'EVENT_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  await prisma.calendarEvent.delete({ where: { id } });
}

// --- Calendar Exceptions ---

export async function getCalendarExceptions(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<CalendarExceptionDTO[]> {
  const where: any = { userId };
  if (startDate && endDate) {
    where.date = { gte: startDate.slice(0, 10), lte: endDate.slice(0, 10) };
  }

  const exceptions = await prisma.calendarException.findMany({
    where,
    include: { timetableSession: true },
    orderBy: { date: 'asc' },
  });

  return exceptions.map(toCalendarExceptionDTO);
}

export async function createCalendarException(
  userId: string,
  input: CreateCalendarExceptionInput
): Promise<CalendarExceptionDTO> {
  if (input.timetableSessionId) {
    const session = await prisma.timetableSession.findFirst({
      where: { id: input.timetableSessionId, userId },
    });
    if (!session) {
      const error: any = new Error('Timetable session not found');
      error.code = 'SESSION_NOT_FOUND';
      error.status = 404;
      throw error;
    }
  }

  const exception = await prisma.calendarException.create({
    data: {
      userId,
      timetableSessionId: input.timetableSessionId ?? null,
      date: input.date,
      exceptionType: input.exceptionType,
      isFullDay: input.isFullDay ?? false,
      startTime: input.startTime ? new Date(input.startTime) : null,
      endTime: input.endTime ? new Date(input.endTime) : null,
      title: input.title ?? null,
      description: input.description ?? null,
    },
    include: { timetableSession: true },
  });

  return toCalendarExceptionDTO(exception);
}

export async function updateCalendarException(
  userId: string,
  id: string,
  input: UpdateCalendarExceptionInput
): Promise<CalendarExceptionDTO> {
  const existing = await prisma.calendarException.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    const error: any = new Error('Calendar exception not found');
    error.code = 'EXCEPTION_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  const updated = await prisma.calendarException.update({
    where: { id },
    data: {
      ...(input.timetableSessionId !== undefined
        ? { timetableSessionId: input.timetableSessionId }
        : {}),
      ...(input.date !== undefined ? { date: input.date } : {}),
      ...(input.exceptionType !== undefined ? { exceptionType: input.exceptionType } : {}),
      ...(input.isFullDay !== undefined ? { isFullDay: input.isFullDay } : {}),
      ...(input.startTime !== undefined
        ? { startTime: input.startTime ? new Date(input.startTime) : null }
        : {}),
      ...(input.endTime !== undefined
        ? { endTime: input.endTime ? new Date(input.endTime) : null }
        : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    },
    include: { timetableSession: true },
  });

  return toCalendarExceptionDTO(updated);
}

export async function deleteCalendarException(userId: string, id: string): Promise<void> {
  const existing = await prisma.calendarException.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    const error: any = new Error('Calendar exception not found');
    error.code = 'EXCEPTION_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  await prisma.calendarException.delete({ where: { id } });
}

// --- Unified Schedule View Assembly ---
export async function getUnifiedCalendarView(
  userId: string,
  startDateStr: string,
  endDateStr: string
): Promise<CalendarViewItemDTO[]> {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  const startDay = new Date(start);
  startDay.setUTCHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setUTCHours(23, 59, 59, 999);

  // Fetch timetable, events, and exceptions in parallel
  const [timetable, events, exceptions] = await Promise.all([
    prisma.timetable.findFirst({
      where: { userId, isActive: true },
      include: { sessions: true },
    }),
    prisma.calendarEvent.findMany({
      where: {
        userId,
        startTime: { lte: endDay },
        endTime: { gte: startDay },
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.calendarException.findMany({
      where: {
        userId,
        date: {
          gte: startDay.toISOString().slice(0, 10),
          lte: endDay.toISOString().slice(0, 10),
        },
      },
    }),
  ]);

  const items: CalendarViewItemDTO[] = [];

  // 1. Map Calendar Events
  for (const ev of events) {
    const dateStr = ev.startTime.toISOString().slice(0, 10);
    const startHourMin = ev.startTime.toISOString().slice(11, 16);
    const endHourMin = ev.endTime.toISOString().slice(11, 16);

    items.push({
      id: `event-${ev.id}`,
      sourceType: 'CALENDAR_EVENT',
      title: ev.title,
      startTime: ev.startTime.toISOString(),
      endTime: ev.endTime.toISOString(),
      timeDisplay: ev.isAllDay ? 'All Day' : `${startHourMin} - ${endHourMin}`,
      date: dateStr,
      isAllDay: ev.isAllDay,
      itemType: ev.eventType,
      color: ev.color || EVENT_COLORS[ev.eventType] || '#3b82f6',
      location: ev.location,
      description: ev.description,
    });
  }

  // Group exceptions by date
  const exceptionsByDate = new Map<string, typeof exceptions>();
  for (const ex of exceptions) {
    const list = exceptionsByDate.get(ex.date) || [];
    list.push(ex);
    exceptionsByDate.set(ex.date, list);
  }

  // 2. Map Exceptions that are standalone (HOLIDAY, EXAM, SPECIAL_EVENT)
  for (const ex of exceptions) {
    if (
      ex.exceptionType === 'HOLIDAY' ||
      (ex.exceptionType !== 'CANCELLED_CLASS' && !ex.timetableSessionId)
    ) {
      items.push({
        id: `exception-${ex.id}`,
        sourceType: 'EXCEPTION',
        title: ex.title || (ex.exceptionType === 'HOLIDAY' ? 'Holiday' : 'Special Event'),
        startTime: ex.startTime ? ex.startTime.toISOString() : `${ex.date}T00:00:00.000Z`,
        endTime: ex.endTime ? ex.endTime.toISOString() : `${ex.date}T23:59:59.000Z`,
        timeDisplay: ex.isFullDay ? 'All Day' : 'Special Exception',
        date: ex.date,
        isAllDay: ex.isFullDay,
        itemType: ex.exceptionType,
        color: EVENT_COLORS[ex.exceptionType] || '#8b5cf6',
        description: ex.description,
      });
    }
  }

  // 3. Project Weekly Timetable Sessions across the date range
  if (timetable && timetable.sessions.length > 0) {
    const curr = new Date(startDay);

    while (curr <= endDay) {
      const dateStr = curr.toISOString().slice(0, 10);
      // 1=Monday ... 7=Sunday
      const dayOfWeek = ((curr.getUTCDay() + 6) % 7) + 1;

      const dateExceptions: any[] = exceptionsByDate.get(dateStr) || [];
      const isFullDayHoliday = dateExceptions.some(
        (e: any) => e.exceptionType === 'HOLIDAY' && e.isFullDay
      );

      // If full-day holiday, skip weekly classes for this day
      if (!isFullDayHoliday) {
        const daySessions = timetable.sessions.filter((s: any) => s.dayOfWeek === dayOfWeek);

        for (const session of daySessions) {
          // Check if this specific session was cancelled on this date
          const isCancelled = dateExceptions.some(
            (e: any) => e.timetableSessionId === session.id && e.exceptionType === 'CANCELLED_CLASS'
          );

          if (!isCancelled) {
            const sessionStartISO = `${dateStr}T${session.startTime}:00.000Z`;
            const sessionEndISO = `${dateStr}T${session.endTime}:00.000Z`;

            items.push({
              id: `session-${session.id}-${dateStr}`,
              sessionId: session.id,
              sourceType: 'TIMETABLE_SESSION',
              title: session.title,
              startTime: sessionStartISO,
              endTime: sessionEndISO,
              timeDisplay: `${session.startTime} - ${session.endTime}`,
              date: dateStr,
              isAllDay: false,
              itemType: session.sessionType,
              color: session.color || EVENT_COLORS[session.sessionType] || '#3b82f6',
              location: session.location,
              description: session.description,
              isCancelled: false,
            });
          }
        }
      }

      curr.setUTCDate(curr.getUTCDate() + 1);
    }
  }

  // Sort chronologically
  items.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return items;
}
