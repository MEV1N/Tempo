import { useState, useEffect, useMemo } from 'react';
import { Navbar } from '../components/Navbar';
import { apiRequest } from '../api/client';
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
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  X,
  Trash2,
  Edit2,
  CalendarDays,
  BookOpen,
  CalendarCheck,
  AlertCircle,
} from 'lucide-react';

const DAYS_OF_WEEK = [
  { num: 1, name: 'Monday', short: 'Mon' },
  { num: 2, name: 'Tuesday', short: 'Tue' },
  { num: 3, name: 'Wednesday', short: 'Wed' },
  { num: 4, name: 'Thursday', short: 'Thu' },
  { num: 5, name: 'Friday', short: 'Fri' },
  { num: 6, name: 'Saturday', short: 'Sat' },
  { num: 7, name: 'Sunday', short: 'Sun' },
];

const SESSION_COLORS: Record<SessionType, string> = {
  CLASS: '#3b82f6',
  LAB: '#6366f1',
  BREAK: '#10b981',
  TRAVEL: '#f59e0b',
  OTHER: '#64748b',
};

export function CalendarPage() {
  const [activeTab, setActiveTab] = useState<'TIMETABLE' | 'CALENDAR' | 'EXCEPTIONS'>('CALENDAR');
  const [calendarSubView, setCalendarSubView] = useState<'WEEK' | 'MONTH' | 'DAY'>('WEEK');

  // Active Date Anchor (default: today)
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Data states
  const [timetable, setTimetable] = useState<TimetableDTO | null>(null);
  const [calendarItems, setCalendarItems] = useState<CalendarViewItemDTO[]>([]);
  const [exceptions, setExceptions] = useState<CalendarExceptionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TimetableSessionDTO | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventDTO | null>(null);
  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);

  // Session Form
  const [sessionForm, setSessionForm] = useState({
    title: '',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:30',
    location: '',
    description: '',
    sessionType: 'CLASS' as SessionType,
    color: '#3b82f6',
  });

  // Event Form
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    isAllDay: false,
    eventType: 'COMMITMENT' as EventType,
    location: '',
    color: '#3b82f6',
  });

  // Exception Form
  const [exceptionForm, setExceptionForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    exceptionType: 'CANCELLED_CLASS' as ExceptionType,
    timetableSessionId: '',
    isFullDay: false,
    title: '',
    description: '',
  });

  // Load Date Range for Calendar
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
      // WEEK: Monday to Sunday
      const day = ((start.getDay() + 6) % 7) + 1; // 1=Mon .. 7=Sun
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

  // Load Timetable & Calendar Data
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

  // Navigate Date
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

  // --- Session CRUD Handlers ---
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
      color: '#3b82f6',
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
      color: s.color || SESSION_COLORS[s.sessionType] || '#3b82f6',
    });
    setSessionModalOpen(true);
  };

  // --- Event CRUD Handlers ---
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
      color: '#3b82f6',
    });
    setEventModalOpen(true);
  };

  // --- Exception Handlers ---
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

  // Group weekly calendar items by Day for Weekly View
  const weekDaysData = useMemo(() => {
    const start = new Date(dateRangeStart);
    const days: {
      dateStr: string;
      dayName: string;
      dayNum: number;
      isToday: boolean;
      items: CalendarViewItemDTO[];
    }[] = [];

    const todayStr = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayNum = ((d.getDay() + 6) % 7) + 1; // 1=Mon .. 7=Sun
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Header & Main Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <CalendarIcon className="w-7 h-7 text-sky-400" />
              <span>Timetable & Calendar</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Manage your college class rhythm, exams, commitments, and calendar exceptions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Tab switchers */}
            <div className="bg-slate-900 border border-slate-800 p-1 rounded-2xl flex items-center">
              <button
                onClick={() => setActiveTab('CALENDAR')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'CALENDAR'
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Calendar View
              </button>
              <button
                onClick={() => setActiveTab('TIMETABLE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'TIMETABLE'
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Weekly Timetable
              </button>
              <button
                onClick={() => setActiveTab('EXCEPTIONS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'EXCEPTIONS'
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Exceptions & Holidays
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center py-2 text-xs text-slate-500 font-medium">
            Updating timetable & calendar data...
          </div>
        )}

        {/* -------------------------------------------------------------------------------- */}
        {/* TAB 1: CALENDAR VIEW */}
        {/* -------------------------------------------------------------------------------- */}
        {activeTab === 'CALENDAR' && (
          <div className="space-y-6">
            {/* View navigation & filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleNavigate('prev')}
                  className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
                  title="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleNavigate('today')}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white"
                >
                  Today
                </button>
                <button
                  onClick={() => handleNavigate('next')}
                  className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
                  title="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <span className="text-sm font-bold text-white ml-2">
                  {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </span>
              </div>

              {/* Sub-view switcher + Add Event */}
              <div className="flex items-center space-x-2">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-0.5 flex text-xs">
                  {(['WEEK', 'MONTH', 'DAY'] as const).map((view) => (
                    <button
                      key={view}
                      onClick={() => setCalendarSubView(view)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${
                        calendarSubView === view
                          ? 'bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {view.charAt(0) + view.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>

                <button
                  onClick={openNewEventModal}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-md shadow-sky-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Event</span>
                </button>
              </div>
            </div>

            {/* WEEK VIEW GRID */}
            {calendarSubView === 'WEEK' && (
              <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
                {weekDaysData.map((d) => (
                  <div
                    key={d.dateStr}
                    className={`rounded-2xl border p-3 min-h-[260px] flex flex-col space-y-2.5 transition ${
                      d.isToday
                        ? 'bg-sky-950/20 border-sky-500/40 shadow-lg shadow-sky-500/5'
                        : 'bg-slate-900/60 border-slate-800/80'
                    }`}
                  >
                    {/* Day Header */}
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                      <span className="text-xs font-semibold text-slate-400">{d.dayName}</span>
                      <span
                        className={`text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center ${
                          d.isToday ? 'bg-sky-500 text-slate-950' : 'text-slate-300'
                        }`}
                      >
                        {new Date(d.dateStr).getDate()}
                      </span>
                    </div>

                    {/* Events / Sessions for this day */}
                    <div className="flex-1 space-y-2 overflow-y-auto">
                      {d.items.length === 0 ? (
                        <p className="text-[11px] text-slate-600 text-center py-6">No sessions</p>
                      ) : (
                        d.items.map((item) => (
                          <div
                            key={item.id}
                            className="p-2.5 rounded-xl border text-xs space-y-1 shadow-sm transition hover:scale-[1.01]"
                            style={{
                              backgroundColor: `${item.color}15`,
                              borderColor: `${item.color}35`,
                              color: '#f8fafc',
                            }}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-bold text-xs truncate leading-tight">
                                {item.title}
                              </span>
                              <span
                                className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider shrink-0"
                                style={{ color: item.color }}
                              >
                                {item.itemType}
                              </span>
                            </div>

                            <p className="text-[10px] text-slate-300 flex items-center">
                              <Clock className="w-2.5 h-2.5 mr-1 text-slate-400" />
                              {item.timeDisplay}
                            </p>

                            {item.location && (
                              <p className="text-[10px] text-slate-400 flex items-center truncate">
                                <MapPin className="w-2.5 h-2.5 mr-1 shrink-0" />
                                {item.location}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* DAY VIEW */}
            {calendarSubView === 'DAY' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-sky-400" />
                    <span>
                      {currentDate.toLocaleDateString(undefined, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    {calendarItems.length} items scheduled
                  </span>
                </div>

                <div className="space-y-3">
                  {calendarItems.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-12">
                      No commitments, classes, or events scheduled for this day.
                    </p>
                  ) : (
                    calendarItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl border flex items-center justify-between"
                        style={{
                          backgroundColor: `${item.color}10`,
                          borderColor: `${item.color}30`,
                        }}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-white">{item.title}</span>
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                              style={{ color: item.color, backgroundColor: `${item.color}20` }}
                            >
                              {item.itemType}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 flex items-center gap-3">
                            <span className="inline-flex items-center">
                              <Clock className="w-3.5 h-3.5 mr-1" />
                              {item.timeDisplay}
                            </span>
                            {item.location && (
                              <span className="inline-flex items-center">
                                <MapPin className="w-3.5 h-3.5 mr-1" />
                                {item.location}
                              </span>
                            )}
                          </p>
                          {item.description && (
                            <p className="text-xs text-slate-300">{item.description}</p>
                          )}
                        </div>

                        {item.sourceType === 'CALENDAR_EVENT' && (
                          <button
                            onClick={() => handleDeleteEvent(item.id.replace('event-', ''))}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title="Delete Event"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* MONTH VIEW */}
            {calendarSubView === 'MONTH' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <p className="text-xs text-slate-400">
                  Showing schedule overview for{' '}
                  {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {calendarItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border text-xs space-y-1"
                      style={{
                        backgroundColor: `${item.color}10`,
                        borderColor: `${item.color}30`,
                      }}
                    >
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {item.date}
                      </span>
                      <p className="font-semibold text-white truncate">{item.title}</p>
                      <p className="text-[10px] text-slate-400">{item.timeDisplay}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------------------------- */}
        {/* TAB 2: WEEKLY COLLEGE TIMETABLE */}
        {/* -------------------------------------------------------------------------------- */}
        {activeTab === 'TIMETABLE' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  <span>{timetable?.name || 'Weekly College Schedule'}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Your recurring classes, labs, and study blocks automatically projected across the
                  semester.
                </p>
              </div>

              <button
                onClick={() => openNewSessionModal(1)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-md shadow-indigo-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add Class / Session</span>
              </button>
            </div>

            {/* Timetable Grid (Monday to Sunday) */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {DAYS_OF_WEEK.map(({ num, name }) => {
                const daySessions = timetable?.sessions.filter((s) => s.dayOfWeek === num) || [];

                return (
                  <div
                    key={num}
                    className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 flex flex-col space-y-2.5 min-h-[300px]"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-slate-200">{name}</span>
                      <button
                        onClick={() => openNewSessionModal(num)}
                        className="p-1 rounded text-slate-500 hover:text-sky-400"
                        title={`Add session to ${name}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 space-y-2 overflow-y-auto">
                      {daySessions.length === 0 ? (
                        <p className="text-[11px] text-slate-600 text-center py-8">Free day</p>
                      ) : (
                        daySessions.map((s) => (
                          <div
                            key={s.id}
                            className="p-2.5 rounded-xl border text-xs space-y-1 relative group"
                            style={{
                              backgroundColor: `${s.color || SESSION_COLORS[s.sessionType]}15`,
                              borderColor: `${s.color || SESSION_COLORS[s.sessionType]}35`,
                            }}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-bold text-slate-100 leading-tight">
                                {s.title}
                              </span>
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                                <button
                                  onClick={() => openEditSessionModal(s)}
                                  className="text-slate-400 hover:text-white"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSession(s.id)}
                                  className="text-slate-400 hover:text-rose-400"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <p className="text-[10px] text-slate-300 flex items-center">
                              <Clock className="w-2.5 h-2.5 mr-1" />
                              {s.startTime} - {s.endTime}
                            </p>

                            {s.location && (
                              <p className="text-[10px] text-slate-400 flex items-center">
                                <MapPin className="w-2.5 h-2.5 mr-1 shrink-0" />
                                {s.location}
                              </p>
                            )}

                            <span
                              className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mt-1"
                              style={{
                                color: s.color || SESSION_COLORS[s.sessionType],
                                backgroundColor: `${s.color || SESSION_COLORS[s.sessionType]}20`,
                              }}
                            >
                              {s.sessionType}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------------------- */}
        {/* TAB 3: CALENDAR EXCEPTIONS & HOLIDAYS */}
        {/* -------------------------------------------------------------------------------- */}
        {activeTab === 'EXCEPTIONS' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                  <span>Calendar Exceptions & Schedule Overrides</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cancel classes for specific dates or declare holidays without altering your
                  regular timetable.
                </p>
              </div>

              <button
                onClick={() => setExceptionModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Declare Exception / Holiday</span>
              </button>
            </div>

            {/* Exceptions list */}
            <div className="space-y-3">
              {exceptions.length === 0 ? (
                <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-2">
                  <p className="text-sm font-semibold text-slate-300">No active exceptions</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Your weekly timetable is active without overrides. Add an exception if a
                    professor cancels a class or for an official holiday.
                  </p>
                </div>
              ) : (
                exceptions.map((ex) => (
                  <div
                    key={ex.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white">
                          {ex.title ||
                            (ex.exceptionType === 'HOLIDAY'
                              ? 'Official Holiday'
                              : 'Class Cancelled')}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {ex.exceptionType}
                        </span>
                        {ex.isFullDay && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400">
                            Full Day
                          </span>
                        )}
                      </div>

                      <p className="text-slate-400">
                        Date: <span className="font-mono text-slate-200">{ex.date}</span>
                        {ex.timetableSession && (
                          <span className="ml-2 text-indigo-400">
                            Cancelled class: {ex.timetableSession.title} (
                            {ex.timetableSession.startTime} - {ex.timetableSession.endTime})
                          </span>
                        )}
                      </p>
                      {ex.description && <p className="text-slate-500">{ex.description}</p>}
                    </div>

                    <button
                      onClick={() => handleDeleteException(ex.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Remove exception"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------------------- */}
        {/* MODAL: ADD / EDIT TIMETABLE SESSION */}
        {/* -------------------------------------------------------------------------------- */}
        {sessionModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  <span>
                    {editingSession ? 'Edit Class Session' : 'Add Weekly Class / Session'}
                  </span>
                </h3>
                <button
                  onClick={() => setSessionModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSession} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Subject / Session Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={sessionForm.title}
                    onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                    placeholder="e.g. Distributed Systems Lecture"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Day of Week</label>
                    <select
                      value={sessionForm.dayOfWeek}
                      onChange={(e) =>
                        setSessionForm({ ...sessionForm, dayOfWeek: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      {DAYS_OF_WEEK.map((d) => (
                        <option key={d.num} value={d.num}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Session Type</label>
                    <select
                      value={sessionForm.sessionType}
                      onChange={(e) =>
                        setSessionForm({
                          ...sessionForm,
                          sessionType: e.target.value as SessionType,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="CLASS">Class Lecture</option>
                      <option value="LAB">Lab Session</option>
                      <option value="BREAK">Break / Lunch</option>
                      <option value="TRAVEL">Commute / Travel</option>
                      <option value="OTHER">Other Commitment</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Start Time (24h)
                    </label>
                    <input
                      type="time"
                      required
                      value={sessionForm.startTime}
                      onChange={(e) =>
                        setSessionForm({ ...sessionForm, startTime: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">End Time (24h)</label>
                    <input
                      type="time"
                      required
                      value={sessionForm.endTime}
                      onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Location / Classroom
                  </label>
                  <input
                    type="text"
                    value={sessionForm.location}
                    onChange={(e) => setSessionForm({ ...sessionForm, location: e.target.value })}
                    placeholder="e.g. Hall B-102 or Online"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSessionModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold shadow-md shadow-indigo-500/20"
                  >
                    {editingSession ? 'Save Changes' : 'Add Session'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------------------- */}
        {/* MODAL: ADD / EDIT CALENDAR EVENT */}
        {/* -------------------------------------------------------------------------------- */}
        {eventModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-sky-400" />
                  <span>{editingEvent ? 'Edit Calendar Event' : 'Add Calendar Commitment'}</span>
                </h3>
                <button
                  onClick={() => setEventModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    placeholder="e.g. Midterm Exam, Team Meeting, Doctor Appointment"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Event Type</label>
                  <select
                    value={eventForm.eventType}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, eventType: e.target.value as EventType })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="EXAM">Exam / Quiz</option>
                    <option value="APPOINTMENT">Appointment</option>
                    <option value="MEETING">Meeting / Collaboration</option>
                    <option value="COMMITMENT">Personal Commitment</option>
                    <option value="SPECIAL">Special Event</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Start Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={eventForm.startTime}
                      onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">End Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={eventForm.endTime}
                      onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={eventForm.location}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                    placeholder="e.g. Science Library Room 3"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="isAllDayCheck"
                    checked={eventForm.isAllDay}
                    onChange={(e) => setEventForm({ ...eventForm, isAllDay: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-sky-500 focus:ring-0"
                  />
                  <label htmlFor="isAllDayCheck" className="text-slate-300 cursor-pointer">
                    All-day event
                  </label>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEventModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold shadow-md shadow-sky-500/20"
                  >
                    {editingEvent ? 'Save Changes' : 'Create Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------------------- */}
        {/* MODAL: DECLARE EXCEPTION / HOLIDAY */}
        {/* -------------------------------------------------------------------------------- */}
        {exceptionModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                  <span>Declare Schedule Exception</span>
                </h3>
                <button
                  onClick={() => setExceptionModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveException} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Exception Type</label>
                  <select
                    value={exceptionForm.exceptionType}
                    onChange={(e) =>
                      setExceptionForm({
                        ...exceptionForm,
                        exceptionType: e.target.value as ExceptionType,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="CANCELLED_CLASS">Cancel Specific Class Session</option>
                    <option value="HOLIDAY">Holiday (Campus Closed / No Classes)</option>
                    <option value="EXAM">Special Exam Period</option>
                    <option value="SPECIAL_EVENT">Special Event Day</option>
                    <option value="OTHER">Other Override</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={exceptionForm.date}
                    onChange={(e) => setExceptionForm({ ...exceptionForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {exceptionForm.exceptionType === 'CANCELLED_CLASS' && (
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Select Class to Cancel
                    </label>
                    <select
                      value={exceptionForm.timetableSessionId}
                      onChange={(e) =>
                        setExceptionForm({ ...exceptionForm, timetableSessionId: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Choose session...</option>
                      {timetable?.sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {DAYS_OF_WEEK.find((d) => d.num === s.dayOfWeek)?.short} - {s.title} (
                          {s.startTime} - {s.endTime})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Label / Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={exceptionForm.title}
                    onChange={(e) => setExceptionForm({ ...exceptionForm, title: e.target.value })}
                    placeholder="e.g. Professor on Leave, Diwali Holiday, Sports Day"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {exceptionForm.exceptionType === 'HOLIDAY' && (
                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="checkbox"
                      id="isFullDayExc"
                      checked={exceptionForm.isFullDay}
                      onChange={(e) =>
                        setExceptionForm({ ...exceptionForm, isFullDay: e.target.checked })
                      }
                      className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0"
                    />
                    <label htmlFor="isFullDayExc" className="text-slate-300 cursor-pointer">
                      Full day holiday (all classes cancelled for this day)
                    </label>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setExceptionModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                  >
                    Apply Exception
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
