import {
  X,
  BookOpen,
  CalendarDays,
  AlertCircle,
} from 'lucide-react';
import {
  SessionType,
  EventType,
  ExceptionType,
  formatTimeTo12Hour,
  formatTimeRange,
} from '@tempo/shared';
import { UseCalendarReturn, DAYS_OF_WEEK } from './useCalendar';

export function CalendarModals(props: UseCalendarReturn) {
  const {
    timetable,
    sessionModalOpen,
    setSessionModalOpen,
    editingSession,
    eventModalOpen,
    setEventModalOpen,
    editingEvent,
    exceptionModalOpen,
    setExceptionModalOpen,
    sessionForm,
    setSessionForm,
    eventForm,
    setEventForm,
    exceptionForm,
    setExceptionForm,
    handleSaveSession,
    handleSaveEvent,
    handleSaveException,
  } = props;

  return (
    <>
      {/* 1. Modal: Add / Edit Timetable Session */}
      {sessionModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#080808]/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border-t sm:border border-[#D9D9D9] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl text-[#080808] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9D9D9]">
              <h3 className="text-base font-bold text-[#080808] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#080808]" />
                <span>
                  {editingSession ? 'Edit Class Session' : 'Add Weekly Class / Session'}
                </span>
              </h3>
              <button
                onClick={() => setSessionModalOpen(false)}
                className="p-1.5 rounded-lg text-[#777777] hover:text-[#080808] hover:bg-[#F5F5F5]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[#404040] mb-1">
                  Subject / Session Title *
                </label>
                <input
                  type="text"
                  required
                  value={sessionForm.title}
                  onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                  placeholder="e.g. Distributed Systems Lecture"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] placeholder-[#777777] focus:outline-none focus:border-[#080808] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#404040] mb-1">Day of Week</label>
                  <select
                    value={sessionForm.dayOfWeek}
                    onChange={(e) =>
                      setSessionForm({ ...sessionForm, dayOfWeek: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] focus:outline-none focus:border-[#080808]"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d.num} value={d.num}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#404040] mb-1">Session Type</label>
                  <select
                    value={sessionForm.sessionType}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        sessionType: e.target.value as SessionType,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] focus:outline-none focus:border-[#080808]"
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-medium text-[#404040]">Start Time</label>
                    <span className="text-[10px] font-mono font-bold text-[#080808]">
                      {formatTimeTo12Hour(sessionForm.startTime)}
                    </span>
                  </div>
                  <input
                    type="time"
                    required
                    value={sessionForm.startTime}
                    onChange={(e) =>
                      setSessionForm({ ...sessionForm, startTime: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] focus:outline-none focus:border-[#080808]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-medium text-[#404040]">End Time</label>
                    <span className="text-[10px] font-mono font-bold text-[#080808]">
                      {formatTimeTo12Hour(sessionForm.endTime)}
                    </span>
                  </div>
                  <input
                    type="time"
                    required
                    value={sessionForm.endTime}
                    onChange={(e) =>
                      setSessionForm({ ...sessionForm, endTime: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] focus:outline-none focus:border-[#080808]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#404040] mb-1">
                  Location / Classroom
                </label>
                <input
                  type="text"
                  value={sessionForm.location}
                  onChange={(e) => setSessionForm({ ...sessionForm, location: e.target.value })}
                  placeholder="e.g. Hall B-102 or Online"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] placeholder-[#777777] focus:outline-none focus:border-[#080808] focus:bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSessionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#D9D9D9] hover:bg-[#F5F5F5] text-[#404040] font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#080808] hover:bg-[#171717] text-white font-medium transition shadow-sm"
                >
                  {editingSession ? 'Save Changes' : 'Add Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal: Add / Edit Calendar Event */}
      {eventModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#080808]/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border-t sm:border border-[#D9D9D9] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl text-[#080808] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9D9D9]">
              <h3 className="text-base font-bold text-[#080808] flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#080808]" />
                <span>{editingEvent ? 'Edit Calendar Event' : 'Add Calendar Commitment'}</span>
              </h3>
              <button
                onClick={() => setEventModalOpen(false)}
                className="p-1.5 rounded-lg text-[#777777] hover:text-[#080808] hover:bg-[#F5F5F5]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[#404040] mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="e.g. Midterm Exam, Team Meeting, Doctor Appointment"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] placeholder-[#777777] focus:outline-none focus:border-[#080808] focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-medium text-[#404040] mb-1">Event Type</label>
                <select
                  value={eventForm.eventType}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, eventType: e.target.value as EventType })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] focus:outline-none focus:border-[#080808]"
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
                  <label className="block font-medium text-[#404040] mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.startTime}
                    onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] focus:outline-none focus:border-[#080808]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#404040] mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.endTime}
                    onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] focus:outline-none focus:border-[#080808]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#404040] mb-1">Location</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  placeholder="e.g. Science Library Room 3"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] placeholder-[#777777] focus:outline-none focus:border-[#080808] focus:bg-white"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isAllDayCheck"
                  checked={eventForm.isAllDay}
                  onChange={(e) => setEventForm({ ...eventForm, isAllDay: e.target.checked })}
                  className="rounded bg-[#FAFAFA] border-[#D9D9D9] text-[#080808] focus:ring-0"
                />
                <label htmlFor="isAllDayCheck" className="text-[#404040] cursor-pointer">
                  All-day event
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEventModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#D9D9D9] hover:bg-[#F5F5F5] text-[#404040] font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#080808] hover:bg-[#171717] text-white font-medium transition shadow-sm"
                >
                  {editingEvent ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Declare Exception / Holiday */}
      {exceptionModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#080808]/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border-t sm:border border-[#D9D9D9] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl text-[#080808] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9D9D9]">
              <h3 className="text-base font-bold text-[#080808] flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#080808]" />
                <span>Declare Schedule Exception</span>
              </h3>
              <button
                onClick={() => setExceptionModalOpen(false)}
                className="p-1.5 rounded-lg text-[#777777] hover:text-[#080808] hover:bg-[#F5F5F5]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveException} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[#404040] mb-1">Exception Type</label>
                <select
                  value={exceptionForm.exceptionType}
                  onChange={(e) =>
                    setExceptionForm({
                      ...exceptionForm,
                      exceptionType: e.target.value as ExceptionType,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] focus:outline-none focus:border-[#080808]"
                >
                  <option value="CANCELLED_CLASS">Cancel Specific Class Session</option>
                  <option value="HOLIDAY">Holiday (Campus Closed / No Classes)</option>
                  <option value="EXAM">Special Exam Period</option>
                  <option value="SPECIAL_EVENT">Special Event Day</option>
                  <option value="OTHER">Other Override</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#404040] mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={exceptionForm.date}
                  onChange={(e) => setExceptionForm({ ...exceptionForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] focus:outline-none focus:border-[#080808]"
                />
              </div>

              {exceptionForm.exceptionType === 'CANCELLED_CLASS' && (
                <div>
                  <label className="block font-medium text-[#404040] mb-1">
                    Select Class to Cancel
                  </label>
                  <select
                    value={exceptionForm.timetableSessionId}
                    onChange={(e) =>
                      setExceptionForm({ ...exceptionForm, timetableSessionId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] focus:outline-none focus:border-[#080808]"
                  >
                    <option value="">Choose session...</option>
                    {timetable?.sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {DAYS_OF_WEEK.find((d) => d.num === s.dayOfWeek)?.short} - {s.title} (
                        {formatTimeRange(s.startTime, s.endTime)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-medium text-[#404040] mb-1">
                  Label / Title (Optional)
                </label>
                <input
                  type="text"
                  value={exceptionForm.title}
                  onChange={(e) =>
                    setExceptionForm({ ...exceptionForm, title: e.target.value })
                  }
                  placeholder="e.g. Professor on Leave, Public Holiday, Sports Day"
                  className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] placeholder-[#777777] focus:outline-none focus:border-[#080808] focus:bg-white"
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
                    className="rounded bg-[#FAFAFA] border-[#D9D9D9] text-[#080808] focus:ring-0"
                  />
                  <label htmlFor="isFullDayExc" className="text-[#404040] cursor-pointer">
                    Full day holiday (all classes cancelled for this day)
                  </label>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExceptionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#D9D9D9] hover:bg-[#F5F5F5] text-[#404040] font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#080808] hover:bg-[#171717] text-white font-medium transition shadow-sm"
                >
                  Apply Exception
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
