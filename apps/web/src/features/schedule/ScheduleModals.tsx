import {
  X,
  Edit2,
  Zap,
  ArrowRight,
  History,
} from 'lucide-react';
import {
  formatTimeTo12Hour,
  formatTimeDisplayString,
} from '@tempo/shared';
import { UseScheduleReturn } from './useSchedule';

export function ScheduleModals(props: UseScheduleReturn) {
  const {
    schedule,
    actionLoading,
    editBlock,
    setEditBlock,
    editStartTime,
    setEditStartTime,
    editEndTime,
    setEditEndTime,
    editTitle,
    setEditTitle,
    handleSaveBlockEdit,
    showRescheduleModal,
    setShowRescheduleModal,
    rescheduleReason,
    setRescheduleReason,
    additionalMinutes,
    setAdditionalMinutes,
    selectedTaskToExtend,
    setSelectedTaskToExtend,
    newMeetingTitle,
    setNewMeetingTitle,
    newMeetingStart,
    setNewMeetingStart,
    newMeetingEnd,
    setNewMeetingEnd,
    rescheduleDiff,
    changelog,
    handleExecuteReschedule,
    showVersionsModal,
    setShowVersionsModal,
    versions,
    handleRestoreVersion,
  } = props;

  return (
    <>
      {/* Block Edit Modal */}
      {editBlock && (
        <div className="fixed inset-0 z-50 bg-[#080808]/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#FFFFFF] border-t sm:border border-[#D9D9D9] rounded-t-3xl sm:rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl text-[#080808] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#080808] flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-[#080808]" />
                <span>Edit Schedule Block</span>
              </h3>
              <button
                onClick={() => setEditBlock(null)}
                className="text-[#777777] hover:text-[#080808] p-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#404040] font-medium">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full mt-1 bg-[#FAFAFA] border border-[#D9D9D9] rounded-xl px-3 py-2 text-[#080808] outline-none focus:border-[#080808]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[#404040] font-medium text-xs">Start Time</label>
                    <span className="text-[11px] font-mono text-[#080808] font-bold">
                      {formatTimeTo12Hour(editStartTime)}
                    </span>
                  </div>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full mt-1 bg-[#FAFAFA] border border-[#D9D9D9] rounded-xl px-3 py-2 text-[#080808] outline-none font-mono focus:border-[#080808]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[#404040] font-medium text-xs">End Time</label>
                    <span className="text-[11px] font-mono text-[#080808] font-bold">
                      {formatTimeTo12Hour(editEndTime)}
                    </span>
                  </div>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full mt-1 bg-[#FAFAFA] border border-[#D9D9D9] rounded-xl px-3 py-2 text-[#080808] outline-none font-mono focus:border-[#080808]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setEditBlock(null)}
                className="px-3.5 py-1.5 text-xs text-[#777777] hover:text-[#080808] border border-[#D9D9D9] rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBlockEdit}
                disabled={actionLoading}
                className="px-4 py-1.5 bg-[#080808] hover:bg-[#171717] text-[#FFFFFF] rounded-xl text-xs font-semibold shadow-xs transition disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 bg-[#080808]/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#FFFFFF] border-t sm:border border-[#D9D9D9] rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl text-[#080808] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#080808] flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#080808]" />
                <span>Intelligent Reschedule</span>
              </h3>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="text-[#777777] hover:text-[#080808] p-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#777777] leading-relaxed">
              Tempo uses minimal change to adapt your day. Locked blocks and unaffected sessions
              remain untouched.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#404040] font-medium">Reason for Rescheduling</label>
                <select
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full mt-1 bg-[#FAFAFA] border border-[#D9D9D9] rounded-xl px-3 py-2 text-[#080808] outline-none focus:border-[#080808]"
                >
                  <option value="Task taking longer than expected">
                    Task taking longer than expected
                  </option>
                  <option value="New commitment conflicts with routine">
                    New commitment conflicts with routine
                  </option>
                  <option value="Finished task earlier than expected">
                    Finished task earlier than expected
                  </option>
                  <option value="General routine shift / optimization">
                    General routine shift / optimization
                  </option>
                </select>
              </div>

              {rescheduleReason.includes('longer') && (
                <div className="p-3 bg-[#FAFAFA] border border-[#D9D9D9] rounded-xl space-y-2">
                  <label className="text-[#080808] font-medium block">
                    Select Task & Extra Time
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={selectedTaskToExtend}
                      onChange={(e) => setSelectedTaskToExtend(e.target.value)}
                      className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg px-2 py-1.5 text-[#080808] outline-none"
                    >
                      {schedule?.blocks
                        .filter((b) => b.blockType === 'TASK' && b.taskId)
                        .map((b) => (
                          <option key={b.id} value={b.taskId!}>
                            {b.title}
                          </option>
                        ))}
                    </select>

                    <input
                      type="number"
                      step={15}
                      min={15}
                      value={additionalMinutes}
                      onChange={(e) => setAdditionalMinutes(Number(e.target.value))}
                      placeholder="+Minutes"
                      className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg px-2 py-1.5 text-[#080808] outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {rescheduleReason.includes('commitment') && (
                <div className="p-3 bg-[#FAFAFA] border border-[#D9D9D9] rounded-xl space-y-2">
                  <label className="text-[#080808] font-medium block">
                    Add Sudden Commitment
                  </label>
                  <input
                    type="text"
                    value={newMeetingTitle}
                    onChange={(e) => setNewMeetingTitle(e.target.value)}
                    placeholder="e.g. Department Meeting"
                    className="w-full bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg px-2 py-1.5 text-[#080808] outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      value={newMeetingStart}
                      onChange={(e) => setNewMeetingStart(e.target.value)}
                      className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg px-2 py-1.5 text-[#080808] outline-none font-mono"
                    />
                    <input
                      type="time"
                      value={newMeetingEnd}
                      onChange={(e) => setNewMeetingEnd(e.target.value)}
                      className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg px-2 py-1.5 text-[#080808] outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Diff & Changelog result */}
              {rescheduleDiff && rescheduleDiff.length > 0 && (
                <div className="p-3 bg-[#FAFAFA] border border-[#080808] rounded-xl space-y-2 max-h-48 overflow-y-auto">
                  <h4 className="font-bold text-[#080808] text-xs">Reschedule Diff & Impact</h4>
                  <div className="space-y-1.5">
                    {rescheduleDiff.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-[11px] bg-[#FFFFFF] p-1.5 rounded border border-[#D9D9D9]"
                      >
                        <span className="font-medium text-[#080808] truncate">{d.title}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                            d.type === 'PRESERVED'
                              ? 'bg-[#F5F5F5] text-[#777777] border border-[#D9D9D9]'
                              : d.type === 'MOVED'
                                ? 'bg-[#080808] text-[#FFFFFF]'
                                : d.type === 'ADDED'
                                  ? 'bg-[#171717] text-[#FFFFFF]'
                                  : 'bg-[#F5F5F5] text-[#080808] border border-[#080808]'
                          }`}
                        >
                          {d.type} {d.newTime ? `(${formatTimeDisplayString(d.newTime)})` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {changelog.length > 0 && (
                <div className="p-3 bg-[#FAFAFA] border border-[#D9D9D9] rounded-xl space-y-2">
                  <h4 className="font-bold text-[#080808] text-xs">Summary of Changes</h4>
                  <ul className="space-y-1 text-[11px] text-[#404040]">
                    {changelog.map((c, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <ArrowRight className="w-3 h-3 text-[#080808] flex-shrink-0" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="px-3.5 py-1.5 text-xs text-[#777777] hover:text-[#080808] border border-[#D9D9D9] rounded-xl"
              >
                Close
              </button>
              <button
                onClick={handleExecuteReschedule}
                disabled={actionLoading}
                className="px-4 py-1.5 bg-[#080808] hover:bg-[#171717] text-[#FFFFFF] rounded-xl text-xs font-semibold shadow-xs transition disabled:opacity-50"
              >
                {actionLoading ? 'Calculating...' : 'Run Rescheduler'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionsModal && (
        <div className="fixed inset-0 z-50 bg-[#080808]/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#FFFFFF] border-t sm:border border-[#D9D9D9] rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl text-[#080808] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#080808] flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#080808]" />
                <span>Schedule Version History</span>
              </h3>
              <button
                onClick={() => setShowVersionsModal(false)}
                className="text-[#777777] hover:text-[#080808] p-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {versions.length === 0 ? (
                <p className="text-xs text-[#777777]">No version history available.</p>
              ) : (
                versions.map((v) => (
                  <div
                    key={v.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                      v.versionNumber === schedule?.version
                        ? 'border-[#080808] bg-[#F5F5F5]'
                        : 'border-[#D9D9D9] bg-[#FFFFFF]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#080808] font-mono">
                          v{v.versionNumber}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                            v.status === 'CONFIRMED'
                              ? 'bg-[#080808] text-[#FFFFFF]'
                              : 'bg-[#FAFAFA] text-[#080808] border border-[#D9D9D9]'
                          }`}
                        >
                          {v.status}
                        </span>
                        {v.versionNumber === schedule?.version && (
                          <span className="text-[10px] text-[#080808] font-semibold">
                            (Current)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#404040] mt-0.5">{v.changeReason}</p>
                      <span className="text-[10px] text-[#777777] font-mono">
                        {new Date(v.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    {v.versionNumber !== schedule?.version && (
                      <button
                        onClick={() => handleRestoreVersion(v.versionNumber)}
                        disabled={actionLoading}
                        className="px-2.5 py-1 bg-[#FFFFFF] hover:bg-[#F5F5F5] border border-[#D9D9D9] text-[#080808] rounded-lg text-xs font-medium transition"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
