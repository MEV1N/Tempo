import { Navbar } from '../../components/Navbar';
import {
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Trash2,
  CalendarCheck,
  AlertCircle,
  Edit2,
} from 'lucide-react';
import { formatTimeRange } from '@tempo/shared';
import { UseCalendarReturn, DAYS_OF_WEEK } from './useCalendar';
import { CalendarModals } from './CalendarModals';

export function CalendarMobile(props: UseCalendarReturn) {
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
    selectedMobileDay,
    setSelectedMobileDay,
    selectedMobileWeekDayIndex,
    setSelectedMobileWeekDayIndex,
  } = props;

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#101010] text-[#080808] dark:text-[#F5F5F5] font-interface pb-28 transition-colors">
      <Navbar />

      <main className="max-w-xl mx-auto px-5 py-5 space-y-3.5">
        {/* 1. Header: Simple Title + Short Description */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#080808]">Calendar</h1>
            <p className="text-xs text-[#777777]">Commitments, college timetable, and exceptions.</p>
          </div>
        </div>

        {/* 2. Compact Primary Tab Switcher */}
        <div className="bg-[#FFFFFF] border border-[#D9D9D9] p-1 rounded-xl flex items-center shadow-2xs">
          <button
            onClick={() => setActiveTab('CALENDAR')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition text-center min-h-[36px] ${
              activeTab === 'CALENDAR'
                ? 'bg-[#080808] text-white font-semibold shadow-xs'
                : 'text-[#777777] hover:text-[#080808]'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveTab('TIMETABLE')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition text-center min-h-[36px] ${
              activeTab === 'TIMETABLE'
                ? 'bg-[#080808] text-white font-semibold shadow-xs'
                : 'text-[#777777] hover:text-[#080808]'
            }`}
          >
            Timetable
          </button>
          <button
            onClick={() => setActiveTab('EXCEPTIONS')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition text-center min-h-[36px] ${
              activeTab === 'EXCEPTIONS'
                ? 'bg-[#080808] text-white font-semibold shadow-xs'
                : 'text-[#777777] hover:text-[#080808]'
            }`}
          >
            Exceptions
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-white border border-[#080808] text-[#080808] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: CALENDAR VIEW                                                      */}
        {/* ========================================================================= */}
        {activeTab === 'CALENDAR' && (
          <div className="space-y-3">
            {/* Compact Navigation & Sub-view Row */}
            <div className="bg-[#FFFFFF] border border-[#D9D9D9] p-2 rounded-xl space-y-2 shadow-2xs">
              {/* Row 1: Date Navigation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleNavigate('prev')}
                    className="p-1.5 rounded-lg text-[#777777] hover:text-[#080808] hover:bg-[#F5F5F5] min-w-[36px] min-h-[36px] flex items-center justify-center"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleNavigate('today')}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] hover:bg-[#F0F0F0] min-h-[36px]"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => handleNavigate('next')}
                    className="p-1.5 rounded-lg text-[#777777] hover:text-[#080808] hover:bg-[#F5F5F5] min-w-[36px] min-h-[36px] flex items-center justify-center"
                    aria-label="Next"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <span className="text-xs font-bold text-[#080808] font-mono">
                  {currentDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                </span>
              </div>

              {/* Row 2: Sub-view Switcher & Add Event Action */}
              <div className="flex items-center justify-between pt-1 border-t border-[#EFEFEF]">
                <div className="bg-[#FAFAFA] border border-[#D9D9D9] rounded-lg p-0.5 flex text-xs">
                  {(['WEEK', 'MONTH', 'DAY'] as const).map((view) => (
                    <button
                      key={view}
                      onClick={() => setCalendarSubView(view)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                        calendarSubView === view
                          ? 'bg-[#080808] text-white shadow-2xs'
                          : 'text-[#777777] hover:text-[#080808]'
                      }`}
                    >
                      {view.charAt(0) + view.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>

                <button
                  onClick={openNewEventModal}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#080808] hover:bg-[#171717] text-white text-xs font-medium shadow-xs min-h-[36px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Event</span>
                </button>
              </div>
            </div>

            {/* WEEK VIEW: Compact 7-Day Pill Strip + Selected Day Agenda */}
            {calendarSubView === 'WEEK' && (
              <div className="space-y-3">
                {/* 7-Day Strip */}
                <div className="grid grid-cols-7 gap-1 bg-[#FFFFFF] border border-[#D9D9D9] p-1.5 rounded-xl shadow-2xs">
                  {weekDaysData.map((d, idx) => {
                    const isSelected = selectedMobileWeekDayIndex === idx;
                    const dayDate = new Date(d.dateStr).getDate();
                    return (
                      <button
                        key={d.dateStr}
                        onClick={() => setSelectedMobileWeekDayIndex(idx)}
                        className={`flex flex-col items-center py-1.5 px-0.5 rounded-lg transition ${
                          isSelected
                            ? 'bg-[#080808] text-[#FFFFFF] shadow-xs'
                            : d.isToday
                              ? 'bg-[#F5F5F5] text-[#080808] border border-[#080808]'
                              : 'text-[#777777] hover:bg-[#F5F5F5]'
                        }`}
                      >
                        <span className="text-[9px] font-semibold tracking-wider uppercase leading-tight">
                          {d.dayName.slice(0, 3)}
                        </span>
                        <span className="text-xs font-bold font-mono mt-0.5 leading-tight">
                          {dayDate}
                        </span>
                        {d.items.length > 0 && (
                          <span
                            className={`w-1 h-1 rounded-full mt-1 ${
                              isSelected ? 'bg-[#FFFFFF]' : 'bg-[#080808]'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Day Agenda Entries */}
                {(() => {
                  const activeDay =
                    weekDaysData[selectedMobileWeekDayIndex] || weekDaysData[0];
                  if (!activeDay) return null;
                  return (
                    <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-2xl p-4 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between border-b border-[#EFEFEF] pb-2">
                        <div>
                          <h3 className="text-xs font-bold text-[#080808]">
                            {activeDay.dayName},{' '}
                            {new Date(activeDay.dateStr).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </h3>
                          <span className="text-[10px] text-[#777777]">
                            {activeDay.items.length}{' '}
                            {activeDay.items.length === 1 ? 'commitment' : 'commitments'}
                          </span>
                        </div>
                        {activeDay.isToday && (
                          <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 bg-[#080808] text-[#FFFFFF] rounded">
                            Today
                          </span>
                        )}
                      </div>

                      {activeDay.items.length === 0 ? (
                        <div className="py-8 text-center text-[#777777]">
                          <p className="font-handwriting text-lg text-[#080808]">Free day</p>
                          <p className="text-xs text-[#777777] mt-0.5">
                            No classes or scheduled events for this date.
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-[#EFEFEF]">
                          {activeDay.items.map((item) => (
                            <div key={item.id} className="py-2.5 first:pt-1 last:pb-1 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold text-xs text-[#080808] leading-snug">
                                  {item.title}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase tracking-wider shrink-0 bg-[#F5F5F5] border border-[#D9D9D9] text-[#404040]">
                                  {item.itemType}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-[#777777]">
                                <span className="flex items-center gap-1 font-mono">
                                  <Clock className="w-2.5 h-2.5 text-[#080808]" />
                                  {item.timeDisplay}
                                </span>
                                {item.location && (
                                  <span className="flex items-center gap-1 truncate">
                                    <MapPin className="w-2.5 h-2.5 text-[#777777]" />
                                    {item.location}
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-[11px] text-[#777777] line-clamp-2 mt-0.5">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* DAY VIEW */}
            {calendarSubView === 'DAY' && (
              <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-2xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-[#EFEFEF] pb-2">
                  <h3 className="text-xs font-bold text-[#080808] flex items-center gap-1.5">
                    <CalendarCheck className="w-4 h-4 text-[#080808]" />
                    <span>
                      {currentDate.toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </h3>
                  <span className="text-[10px] text-[#777777] font-mono">
                    {calendarItems.length} items
                  </span>
                </div>

                {calendarItems.length === 0 ? (
                  <p className="text-xs text-[#777777] text-center py-8">
                    No commitments scheduled for this day.
                  </p>
                ) : (
                  <div className="divide-y divide-[#EFEFEF]">
                    {calendarItems.map((item) => (
                      <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-bold text-[#080808] truncate">
                              {item.title}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-[#F5F5F5] border border-[#D9D9D9] text-[#404040]">
                              {item.itemType}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#404040] flex items-center gap-2">
                            <span className="flex items-center font-mono">
                              <Clock className="w-2.5 h-2.5 mr-1" />
                              {item.timeDisplay}
                            </span>
                            {item.location && (
                              <span className="truncate">📍 {item.location}</span>
                            )}
                          </p>
                        </div>
                        {item.sourceType === 'CALENDAR_EVENT' && (
                          <button
                            onClick={() => handleDeleteEvent(item.id.replace('event-', ''))}
                            className="p-1.5 text-[#777777] hover:text-[#080808] min-w-[36px] min-h-[36px] flex items-center justify-center"
                            aria-label="Delete event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MONTH VIEW */}
            {calendarSubView === 'MONTH' && (
              <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-2xl p-4 space-y-3 shadow-2xs">
                <span className="text-xs text-[#777777] block font-mono">
                  {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {calendarItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-xs space-y-0.5"
                    >
                      <span className="text-[9px] text-[#777777] font-mono block">{item.date}</span>
                      <p className="font-semibold text-[#080808] truncate text-[11px]">{item.title}</p>
                      <p className="text-[10px] text-[#404040]">{item.timeDisplay}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: WEEKLY TIMETABLE                                                   */}
        {/* ========================================================================= */}
        {activeTab === 'TIMETABLE' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#080808]">Weekly College Timetable</span>
              <button
                onClick={() => openNewSessionModal(selectedMobileDay)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#080808] text-white text-xs font-medium shadow-xs min-h-[36px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Class</span>
              </button>
            </div>

            {/* Mobile Timetable Day Selector Strip */}
            <div className="grid grid-cols-7 gap-1 bg-[#FFFFFF] border border-[#D9D9D9] p-1.5 rounded-xl shadow-2xs">
              {DAYS_OF_WEEK.map(({ num, short }) => {
                const daySessionsCount =
                  timetable?.sessions.filter((s) => s.dayOfWeek === num).length || 0;
                const isSelected = selectedMobileDay === num;
                return (
                  <button
                    key={num}
                    onClick={() => setSelectedMobileDay(num)}
                    className={`flex flex-col items-center py-1.5 px-0.5 rounded-lg transition ${
                      isSelected
                        ? 'bg-[#080808] text-[#FFFFFF] shadow-xs'
                        : 'text-[#404040] hover:bg-[#F5F5F5]'
                    }`}
                  >
                    <span className="text-[9px] uppercase font-semibold">{short}</span>
                    <span className="text-xs font-mono font-bold mt-0.5">{daySessionsCount}</span>
                  </button>
                );
              })}
            </div>

            {/* Sessions for Selected Day */}
            {(() => {
              const currentDayObj = DAYS_OF_WEEK.find((d) => d.num === selectedMobileDay);
              const sessionsForDay =
                timetable?.sessions.filter((s) => s.dayOfWeek === selectedMobileDay) || [];

              return (
                <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-2xl p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-[#EFEFEF] pb-2">
                    <span className="text-xs font-bold text-[#080808]">
                      {currentDayObj?.name} Schedule
                    </span>
                    <span className="text-[10px] text-[#777777] font-mono">
                      {sessionsForDay.length} {sessionsForDay.length === 1 ? 'class' : 'classes'}
                    </span>
                  </div>

                  {sessionsForDay.length === 0 ? (
                    <div className="py-6 text-center text-[#777777]">
                      <p className="font-handwriting text-lg text-[#080808]">No classes</p>
                      <p className="text-xs text-[#777777] mt-0.5">
                        Free day for {currentDayObj?.name}.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#EFEFEF]">
                      {sessionsForDay.map((s) => (
                        <div key={s.id} className="py-2.5 flex items-start justify-between gap-2">
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs font-bold text-[#080808] leading-tight">
                                {s.title}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-[#F5F5F5] border border-[#D9D9D9] text-[#404040]">
                                {s.sessionType}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#404040] flex items-center gap-1 font-mono">
                              <Clock className="w-2.5 h-2.5 text-[#777777]" />
                              {formatTimeRange(s.startTime, s.endTime)}
                            </p>
                            {s.location && (
                              <p className="text-[10px] text-[#777777] truncate">
                                📍 {s.location}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              onClick={() => openEditSessionModal(s)}
                              className="p-1.5 rounded text-[#777777] hover:text-[#080808] min-w-[34px] min-h-[34px] flex items-center justify-center"
                              aria-label="Edit class"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSession(s.id)}
                              className="p-1.5 rounded text-[#777777] hover:text-[#080808] min-w-[34px] min-h-[34px] flex items-center justify-center"
                              aria-label="Delete class"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: EXCEPTIONS & OVERRIDES                                             */}
        {/* ========================================================================= */}
        {activeTab === 'EXCEPTIONS' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#080808]">Schedule Exceptions</span>
              <button
                onClick={() => setExceptionModalOpen(true)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#080808] text-white text-xs font-medium shadow-xs min-h-[36px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Declare Exception</span>
              </button>
            </div>

            <div className="space-y-2">
              {exceptions.length === 0 ? (
                <div className="p-8 text-center bg-white border border-[#D9D9D9] rounded-2xl space-y-1">
                  <p className="text-xs font-semibold text-[#080808]">No active exceptions</p>
                  <p className="text-[11px] text-[#777777]">
                    Timetable runs normally without cancellations.
                  </p>
                </div>
              ) : (
                exceptions.map((ex) => (
                  <div
                    key={ex.id}
                    className="p-3 rounded-xl bg-white border border-[#D9D9D9] flex items-center justify-between text-xs shadow-2xs"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-[#080808] truncate">
                          {ex.title || (ex.exceptionType === 'HOLIDAY' ? 'Holiday' : 'Cancelled Class')}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-[#F5F5F5] border border-[#D9D9D9]">
                          {ex.exceptionType}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#777777] font-mono">Date: {ex.date}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteException(ex.id)}
                      className="p-1.5 rounded text-[#777777] hover:text-[#080808] min-w-[34px] min-h-[34px] flex items-center justify-center shrink-0"
                      aria-label="Remove exception"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
  );
}
