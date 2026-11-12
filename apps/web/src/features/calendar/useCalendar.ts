import { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../../api/client';
import {
  TimetableDTO,
  TimetableSessionDTO,
  CalendarEventDTO,
  CalendarExceptionDTO,
  CalendarViewItemDTO,
  SessionType,
  EventType,
  ExceptionType,
} from '@tempo/shared';

export const DAYS_OF_WEEK = [
  { num: 1, name: 'Monday', short: 'Mon' },
  { num: 2, name: 'Tuesday', short: 'Tue' },
  { num: 3, name: 'Wednesday', short: 'Wed' },
  { num: 4, name: 'Thursday', short: 'Thu' },
  { num: 5, name: 'Friday', short: 'Fri' },
  { num: 6, name: 'Saturday', short: 'Sat' },
  { num: 7, name: 'Sunday', short: 'Sun' },
];

export interface WeekDayDataItem {
  dateStr: string;
  dayName: string;
  dayNum: number;
  isToday: boolean;
  items: CalendarViewItemDTO[];
}

export interface UseCalendarReturn {
  activeTab: 'TIMETABLE' | 'CALENDAR' | 'EXCEPTIONS';
  setActiveTab: (t: 'TIMETABLE' | 'CALENDAR' | 'EXCEPTIONS') => void;
  calendarSubView: 'WEEK' | 'MONTH' | 'DAY';
  setCalendarSubView: (v: 'WEEK' | 'MONTH' | 'DAY') => void;
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  timetable: TimetableDTO | null;
  calendarItems: CalendarViewItemDTO[];
  exceptions: CalendarExceptionDTO[];
  loading: boolean;
  error: string | null;

  sessionModalOpen: boolean;
  setSessionModalOpen: (o: boolean) => void;
  editingSession: TimetableSessionDTO | null;
  eventModalOpen: boolean;
  setEventModalOpen: (o: boolean) => void;
  editingEvent: CalendarEventDTO | null;
  exceptionModalOpen: boolean;
  setExceptionModalOpen: (o: boolean) => void;

  selectedMobileDay: number;
  setSelectedMobileDay: (d: number) => void;
  selectedMobileWeekDayIndex: number;
  setSelectedMobileWeekDayIndex: (i: number) => void;

  sessionForm: {
    title: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    location: string;
    description: string;
    sessionType: SessionType;
    color: string;
  };
  setSessionForm: React.Dispatch<React.SetStateAction<any>>;

  eventForm: {
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    isAllDay: boolean;
    eventType: EventType;
    location: string;
    color: string;
  };
  setEventForm: React.Dispatch<React.SetStateAction<any>>;

  exceptionForm: {
    date: string;
    exceptionType: ExceptionType;
    timetableSessionId: string;
    isFullDay: boolean;
    title: string;
    description: string;
  };
  setExceptionForm: React.Dispatch<React.SetStateAction<any>>;

  loadData: () => Promise<void>;
  handleNavigate: (direction: 'prev' | 'next' | 'today') => void;
  handleSaveSession: (e: React.FormEvent) => Promise<void>;
  handleDeleteSession: (sessionId: string) => Promise<void>;
  openNewSessionModal: (day?: number) => void;
  openEditSessionModal: (s: TimetableSessionDTO) => void;
  handleSaveEvent: (e: React.FormEvent) => Promise<void>;
  handleDeleteEvent: (id: string) => Promise<void>;
  openNewEventModal: () => void;
  handleSaveException: (e: React.FormEvent) => Promise<void>;
  handleDeleteException: (id: string) => Promise<void>;

  weekDaysData: WeekDayDataItem[];
}

export function useCalendar(): UseCalendarReturn {
  const [activeTab, setActiveTab] = useState<'TIMETABLE' | 'CALENDAR' | 'EXCEPTIONS'>('CALENDAR');
  const [calendarSubView, setCalendarSubView] = useState<'WEEK' | 'MONTH' | 'DAY'>('WEEK');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const [timetable, setTimetable] = useState<TimetableDTO | null>(null);
  const [calendarItems, setCalendarItems] = useState<CalendarViewItemDTO[]>([]);
  const [exceptions, setExceptions] = useState<CalendarExceptionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TimetableSessionDTO | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventDTO | null>(null);
  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);

  const [selectedMobileDay, setSelectedMobileDay] = useState<number>(() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  });
  const [selectedMobileWeekDayIndex, setSelectedMobileWeekDayIndex] = useState<number>(0);

  const [sessionForm, setSessionForm] = useState({
    title: '',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:30',
    location: '',
    description: '',
    sessionType: 'CLASS' as SessionType,
    color: '#080808',
  });

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    isAllDay: false,
    eventType: 'COMMITMENT' as EventType,
    location: '',
    color: '#080808',
  });

  const [exceptionForm, setExceptionForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    exceptionType: 'CANCELLED_CLASS' as ExceptionType,
    timetableSessionId: '',
    isFullDay: false,
    title: '',
    description: '',
  });

  const { dateRangeStart, dateRangeEnd } = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (calendarSubView === 'MONTH') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    } else if (calendarSubView === 'DAY') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else {
      const day = ((start.getDay() + 6) % 7) + 1;
      start.setDate(start.getDate() - (day - 1));
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    }

    return {
      dateRangeStart: start.toISOString(),
      dateRangeEnd: end.toISOString(),
    };
  }, [currentDate, calendarSubView]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ttRes, calViewRes, exRes] = await Promise.all([
        apiRequest<TimetableDTO>('/api/timetables'),
        apiRequest<CalendarViewItemDTO[]>(
          `/api/calendar/view?startDate=${encodeURIComponent(dateRangeStart)}&endDate=${encodeURIComponent(dateRangeEnd)}`
        ),
        apiRequest<CalendarExceptionDTO[]>('/api/calendar/exceptions'),
      ]);

      setTimetable(ttRes);
      setCalendarItems(calViewRes || []);
      setExceptions(exRes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load timetable and calendar data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRangeStart, dateRangeEnd]);

  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }
    const delta = direction === 'next' ? 1 : -1;
    const next = new Date(currentDate);

    if (calendarSubView === 'MONTH') {
      next.setMonth(next.getMonth() + delta);
    } else if (calendarSubView === 'DAY') {
      next.setDate(next.getDate() + delta);
    } else {
      next.setDate(next.getDate() + delta * 7);
    }
    setCurrentDate(next);
  };

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timetable) return;

    try {
      if (editingSession) {
        await apiRequest(`/api/timetables/sessions/${editingSession.id}`, {
          method: 'PUT',
          body: JSON.stringify(sessionForm),
        });
      } else {
        await apiRequest(`/api/timetables/${timetable.id}/sessions`, {
          method: 'POST',
          body: JSON.stringify(sessionForm),
        });
      }
      setSessionModalOpen(false);
      setEditingSession(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save timetable session');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this weekly session?')) return;
    try {
      await apiRequest(`/api/timetables/sessions/${sessionId}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete session');
    }
  };

  const openNewSessionModal = (day = 1) => {
    setEditingSession(null);
    setSessionForm({
      title: '',
      dayOfWeek: day,
      startTime: '09:00',
      endTime: '10:30',
      location: '',
      description: '',
      sessionType: 'CLASS',
      color: '#080808',
    });
    setSessionModalOpen(true);
  };

  const openEditSessionModal = (s: TimetableSessionDTO) => {
    setEditingSession(s);
    setSessionForm({
      title: s.title,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      location: s.location || '',
      description: s.description || '',
      sessionType: s.sessionType,
      color: s.color || '#080808',
    });
    setSessionModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        await apiRequest(`/api/calendar/events/${editingEvent.id}`, {
          method: 'PUT',
          body: JSON.stringify(eventForm),
        });
      } else {
        await apiRequest('/api/calendar/events', {
          method: 'POST',
          body: JSON.stringify(eventForm),
        });
      }
      setEventModalOpen(false);
      setEditingEvent(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save calendar event');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      await apiRequest(`/api/calendar/events/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete event');
    }
  };

  const openNewEventModal = () => {
    setEditingEvent(null);
    const now = new Date();
    const plusHour = new Date(now.getTime() + 60 * 60 * 1000);
    setEventForm({
      title: '',
      description: '',
      startTime: now.toISOString().slice(0, 16),
      endTime: plusHour.toISOString().slice(0, 16),
      isAllDay: false,
      eventType: 'COMMITMENT',
      location: '',
      color: '#080808',
    });
    setEventModalOpen(true);
  };

  const handleSaveException = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/calendar/exceptions', {
        method: 'POST',
        body: JSON.stringify({
          date: exceptionForm.date,
          exceptionType: exceptionForm.exceptionType,
          timetableSessionId:
            exceptionForm.exceptionType === 'CANCELLED_CLASS'
              ? exceptionForm.timetableSessionId || undefined
              : undefined,
          isFullDay: exceptionForm.isFullDay,
          title: exceptionForm.title || undefined,
          description: exceptionForm.description || undefined,
        }),
      });
      setExceptionModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save exception');
    }
  };

  const handleDeleteException = async (id: string) => {
    if (!confirm('Remove this exception? The normal schedule will be restored.')) return;
    try {
      await apiRequest(`/api/calendar/exceptions/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete exception');
    }
  };

  const weekDaysData = useMemo(() => {
    const start = new Date(dateRangeStart);
    const days: WeekDayDataItem[] = [];
    const todayStr = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayNum = ((d.getDay() + 6) % 7) + 1;
      const dayName = DAYS_OF_WEEK.find((x) => x.num === dayNum)?.short || '';

      const itemsForDay = calendarItems.filter((item) => item.date === dateStr);

      days.push({
        dateStr,
        dayName,
        dayNum,
        isToday: dateStr === todayStr,
        items: itemsForDay,
      });
    }

    return days;
  }, [dateRangeStart, calendarItems]);

  useEffect(() => {
    const todayIndex = weekDaysData.findIndex((d) => d.isToday);
    if (todayIndex !== -1) {
      setSelectedMobileWeekDayIndex(todayIndex);
    }
  }, [weekDaysData]);

  return {
    activeTab,
    setActiveTab,
    calendarSubView,
    setCalendarSubView,
    currentDate,
    setCurrentDate,
    timetable,
    calendarItems,
    exceptions,
    loading,
    error,

    sessionModalOpen,
    setSessionModalOpen,
    editingSession,
    eventModalOpen,
    setEventModalOpen,
    editingEvent,
    exceptionModalOpen,
    setExceptionModalOpen,

    selectedMobileDay,
    setSelectedMobileDay,
    selectedMobileWeekDayIndex,
    setSelectedMobileWeekDayIndex,

    sessionForm,
    setSessionForm,
    eventForm,
    setEventForm,
    exceptionForm,
    setExceptionForm,

    loadData,
    handleNavigate,
    handleSaveSession,
    handleDeleteSession,
    openNewSessionModal,
    openEditSessionModal,
    handleSaveEvent,
    handleDeleteEvent,
    openNewEventModal,
    handleSaveException,
    handleDeleteException,

    weekDaysData,
  };
}

