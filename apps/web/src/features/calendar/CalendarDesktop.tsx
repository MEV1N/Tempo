import { Navbar } from '../../components/Navbar';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Trash2,
  Edit2,
  BookOpen,
  CalendarCheck,
  AlertCircle,
} from 'lucide-react';
import { formatTimeRange } from '@tempo/shared';
import { UseCalendarReturn, DAYS_OF_WEEK } from './useCalendar';
import { CalendarModals } from './CalendarModals';

export function CalendarDesktop(props: UseCalendarReturn) {
  const {
    activeTab,
    setActiveTab,
    calendarSubView,
    setCalendarSubView,
    currentDate,
    timetable,
    calendarItems,
    exceptions,
    error,
    handleNavigate,
    openNewSessionModal,
    openEditSessionModal,
    handleDeleteSession,
    openNewEventModal,
    handleDeleteEvent,
    setExceptionModalOpen,
    handleDeleteException,
    weekDaysData,
  } = props;

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#101010] text-[#080808] dark:text-[#F5F5F5] font-interface transition-colors">
      <Navbar />

      <div className="md:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 max-w-6xl w-full mx-auto px-6 lg:px-8 py-8 space-y-6 pb-12">
          {/* Desktop Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#080808] flex items-baseline gap-2">
                <CalendarIcon className="w-6 h-6 text-[#080808] self-center" />
                <span>Calendar & Timetable</span>
                <span className="font-handwritten text-3xl font-normal text-[#777777]">
                  commitments
                </span>
              </h1>
              <p className="text-[#777777] text-xs sm:text-sm mt-1">
                Manage your college rhythm, exams, commitments, and calendar exceptions.
              </p>
            </div>

            <div className="bg-white border border-[#D9D9D9] p-1 rounded-xl flex items-center shadow-sm">
              <button
                onClick={() => setActiveTab('CALENDAR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'CALENDAR'
                    ? 'bg-[#080808] text-white shadow-sm'
                    : 'text-[#777777] hover:text-[#080808]'
                }`}
              >
                Calendar View
              </button>
              <button
                onClick={() => setActiveTab('TIMETABLE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'TIMETABLE'
                    ? 'bg-[#080808] text-white shadow-sm'
                    : 'text-[#777777] hover:text-[#080808]'
                }`}
              >
                Weekly Timetable
              </button>
              <button
                onClick={() => setActiveTab('EXCEPTIONS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === 'EXCEPTIONS'
                    ? 'bg-[#080808] text-white shadow-sm'
                    : 'text-[#777777] hover:text-[#080808]'
                }`}
              >
                Exceptions & Overrides
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-white border border-[#080808] text-[#080808] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: CALENDAR VIEW */}
          {activeTab === 'CALENDAR' && (
            <div className="space-y-4">
              {/* Date Navigation & Subview Bar */}
              <div className="flex items-center justify-between bg-white border border-[#D9D9D9] p-4 rounded-2xl shadow-sm">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleNavigate('prev')}
                    className="p-1.5 rounded-lg bg-[#FAFAFA] border border-[#D9D9D9] text-[#404040] hover:text-[#080808] hover:border-[#080808] transition"
                    title="Previous"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleNavigate('today')}
                    className="px-3 py-1 rounded-lg text-xs font-medium bg-[#FAFAFA] border border-[#D9D9D9] text-[#404040] hover:text-[#080808] hover:border-[#080808] transition"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => handleNavigate('next')}
                    className="p-1.5 rounded-lg bg-[#FAFAFA] border border-[#D9D9D9] text-[#404040] hover:text-[#080808] hover:border-[#080808] transition"
                    title="Next"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <span className="text-sm font-bold text-[#080808] ml-2">
                    {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="bg-[#FAFAFA] border border-[#D9D9D9] rounded-xl p-0.5 flex text-xs">
                    {(['WEEK', 'MONTH', 'DAY'] as const).map((view) => (
                      <button
                        key={view}
                        onClick={() => setCalendarSubView(view)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                          calendarSubView === view
                            ? 'bg-[#080808] text-white shadow-sm'
                            : 'text-[#777777] hover:text-[#080808]'
                        }`}
                      >
                        {view.charAt(0) + view.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={openNewEventModal}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-[#080808] hover:bg-[#171717] text-white font-medium text-xs transition shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Event</span>
                  </button>
                </div>
              </div>

              {/* WEEK VIEW: 7 Columns */}
              {calendarSubView === 'WEEK' && (
                <div className="grid grid-cols-7 gap-3">
                  {weekDaysData.map((d) => (
                    <div
                      key={d.dateStr}
                      className={`rounded-2xl border p-3 min-h-[260px] flex flex-col space-y-2.5 transition ${
                        d.isToday
                          ? 'bg-white border-[#080808] shadow-sm'
                          : 'bg-white border-[#D9D9D9]'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-2">
                        <span className="text-xs font-semibold text-[#777777]">{d.dayName}</span>
                        <span
                          className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                            d.isToday ? 'bg-[#080808] text-white' : 'text-[#080808]'
                          }`}
                        >
                          {new Date(d.dateStr).getDate()}
                        </span>
                      </div>

                      <div className="flex-1 space-y-2 overflow-y-auto">
                        {d.items.length === 0 ? (
                          <p className="text-[11px] text-[#777777] text-center py-6 font-handwriting text-base">
                            Free day
                          </p>
                        ) : (
                          d.items.map((item) => (
                            <div
                              key={item.id}
                              className="p-2.5 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-xs space-y-1 hover:border-[#080808] transition shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="font-bold text-xs truncate leading-tight text-[#080808]">
                                  {item.title}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase tracking-wider shrink-0 bg-white border border-[#D9D9D9] text-[#404040]">
                                  {item.itemType}
                                </span>
                              </div>
                              <p className="text-[10px] text-[#404040] flex items-center">
                                <Clock className="w-2.5 h-2.5 mr-1 text-[#777777]" />
                                {item.timeDisplay}
                              </p>
                              {item.location && (
                                <p className="text-[10px] text-[#777777] flex items-center truncate">
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
                <div className="bg-white border border-[#D9D9D9] rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-[#D9D9D9]">
                    <h3 className="text-base font-bold text-[#080808] flex items-center gap-2">
                      <CalendarCheck className="w-5 h-5 text-[#080808]" />
                      <span>
                        {currentDate.toLocaleDateString(undefined, {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </h3>
                    <span className="text-xs text-[#777777]">
                      {calendarItems.length} items scheduled
                    </span>
                  </div>

                  <div className="space-y-3">
                    {calendarItems.length === 0 ? (
                      <p className="text-sm text-[#777777] text-center py-12 font-handwriting text-lg">
                        No commitments, classes, or events scheduled for this day.
                      </p>
                    ) : (
                      calendarItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] flex items-center justify-between hover:border-[#080808] transition"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-bold text-[#080808]">{item.title}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-white border border-[#D9D9D9] text-[#404040]">
                                {item.itemType}
                              </span>
                            </div>
                            <p className="text-xs text-[#404040] flex items-center gap-3">
                              <span className="inline-flex items-center">
                                <Clock className="w-3.5 h-3.5 mr-1 text-[#777777]" />
                                {item.timeDisplay}
                              </span>
                              {item.location && (
                                <span className="inline-flex items-center">
                                  <MapPin className="w-3.5 h-3.5 mr-1 text-[#777777]" />
                                  {item.location}
                                </span>
                              )}
                            </p>
                            {item.description && (
                              <p className="text-xs text-[#777777]">{item.description}</p>
                            )}
                          </div>

                          {item.sourceType === 'CALENDAR_EVENT' && (
                            <button
                              onClick={() => handleDeleteEvent(item.id.replace('event-', ''))}
                              className="p-2 rounded-lg text-[#777777] hover:text-[#080808] hover:bg-white border border-transparent hover:border-[#D9D9D9] transition"
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
                <div className="bg-white border border-[#D9D9D9] rounded-2xl p-6 space-y-4 shadow-sm">
                  <p className="text-xs text-[#777777]">
                    Showing schedule overview for{' '}
                    {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}.
                  </p>
                  <div className="grid grid-cols-7 gap-2">
                    {calendarItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-xs space-y-1 hover:border-[#080808] transition"
                      >
                        <span className="text-[10px] text-[#777777] font-mono block">
                          {item.date}
                        </span>
                        <p className="font-semibold text-[#080808] truncate">{item.title}</p>
                        <p className="text-[10px] text-[#404040]">{item.timeDisplay}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WEEKLY TIMETABLE */}
          {activeTab === 'TIMETABLE' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4 bg-white border border-[#D9D9D9] p-4 rounded-2xl shadow-sm">
                <div>
                  <h2 className="text-base font-bold text-[#080808] flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#080808]" />
                    <span>{timetable?.name || 'Weekly College Schedule'}</span>
                  </h2>
                  <p className="text-xs text-[#777777] mt-0.5">
                    Your recurring classes, labs, and study blocks automatically projected across
                    the semester.
                  </p>
                </div>

                <button
                  onClick={() => openNewSessionModal(1)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#080808] hover:bg-[#171717] text-white font-medium text-xs transition shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Class / Session</span>
                </button>
              </div>

              {/* Desktop Timetable Grid */}
              <div className="grid grid-cols-7 gap-3">
                {DAYS_OF_WEEK.map(({ num, name }) => {
                  const daySessions = timetable?.sessions.filter((s) => s.dayOfWeek === num) || [];

                  return (
                    <div
                      key={num}
                      className="bg-white border border-[#D9D9D9] rounded-2xl p-3 flex flex-col space-y-2.5 min-h-[300px] shadow-sm"
                    >
                      <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-2">
                        <span className="text-xs font-bold text-[#080808]">{name}</span>
                        <button
                          onClick={() => openNewSessionModal(num)}
                          className="p-1 rounded text-[#777777] hover:text-[#080808]"
                          title={`Add session to ${name}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex-1 space-y-2 overflow-y-auto">
                        {daySessions.length === 0 ? (
                          <p className="text-[11px] text-[#777777] text-center py-8 font-handwriting text-base">
                            Free day
                          </p>
                        ) : (
                          daySessions.map((s) => (
                            <div
                              key={s.id}
                              className="p-2.5 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-xs space-y-1 relative group hover:border-[#080808] transition shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="font-bold text-[#080808] leading-tight">
                                  {s.title}
                                </span>
                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                                  <button
                                    onClick={() => openEditSessionModal(s)}
                                    className="text-[#777777] hover:text-[#080808]"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSession(s.id)}
                                    className="text-[#777777] hover:text-[#080808]"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              <p className="text-[10px] text-[#404040] flex items-center">
                                <Clock className="w-2.5 h-2.5 mr-1 text-[#777777]" />
                                {formatTimeRange(s.startTime, s.endTime)}
                              </p>

                              {s.location && (
                                <p className="text-[10px] text-[#777777] flex items-center">
                                  <MapPin className="w-2.5 h-2.5 mr-1 shrink-0" />
                                  {s.location}
                                </p>
                              )}

                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider mt-1 bg-white border border-[#D9D9D9] text-[#404040]">
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

          {/* TAB 3: EXCEPTIONS */}
          {activeTab === 'EXCEPTIONS' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4 bg-white border border-[#D9D9D9] p-4 rounded-2xl shadow-sm">
                <div>
                  <h2 className="text-base font-bold text-[#080808] flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-[#080808]" />
                    <span>Calendar Exceptions & Schedule Overrides</span>
                  </h2>
                  <p className="text-xs text-[#777777] mt-0.5">
                    Cancel classes for specific dates or declare holidays without altering your
                    regular timetable.
                  </p>
                </div>

                <button
                  onClick={() => setExceptionModalOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#080808] hover:bg-[#171717] text-white font-medium text-xs transition shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Declare Exception</span>
                </button>
              </div>

              <div className="space-y-3">
                {exceptions.length === 0 ? (
                  <div className="p-12 text-center bg-white border border-[#D9D9D9] rounded-2xl space-y-2 shadow-sm">
                    <p className="text-sm font-semibold text-[#080808]">No active exceptions</p>
                    <p className="text-xs text-[#777777] max-w-sm mx-auto">
                      Your weekly timetable is active without overrides. Add an exception if a
                      professor cancels a class or for an official holiday.
                    </p>
                  </div>
                ) : (
                  exceptions.map((ex) => (
                    <div
                      key={ex.id}
                      className="p-4 rounded-xl bg-white border border-[#D9D9D9] flex items-center justify-between text-xs shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-[#080808]">
                            {ex.title ||
                              (ex.exceptionType === 'HOLIDAY'
                                ? 'Official Holiday'
                                : 'Class Cancelled')}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#F5F5F5] border border-[#D9D9D9] text-[#080808]">
                            {ex.exceptionType}
                          </span>
                          {ex.isFullDay && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#F5F5F5] text-[#777777] border border-[#D9D9D9]">
                              Full Day
                            </span>
                          )}
                        </div>

                        <p className="text-[#404040]">
                          Date: <span className="font-mono text-[#080808]">{ex.date}</span>
                          {ex.timetableSession && (
                            <span className="ml-2 text-[#777777]">
                              Cancelled: {ex.timetableSession.title} (
                              {formatTimeRange(ex.timetableSession.startTime, ex.timetableSession.endTime)})
                            </span>
                          )}
                        </p>
                        {ex.description && <p className="text-[#777777]">{ex.description}</p>}
                      </div>

                      <button
                        onClick={() => handleDeleteException(ex.id)}
                        className="p-2 rounded-lg text-[#777777] hover:text-[#080808] hover:bg-[#F5F5F5] transition"
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

          <CalendarModals {...props} />
        </main>
      </div>
    </div>
  );
}
