import { Navbar } from '../../components/Navbar';
import {
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Coffee,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Zap,
  Smile,
  ShieldAlert,
  Lock,
  Unlock,
  Edit2,
  RotateCcw,
  History,
  Check,
  X,
  Sun,
  Moon,
  Activity,
  Calendar,
} from 'lucide-react';
import {
  ScheduleBlockDTO,
  formatTimeRange,
} from '@tempo/shared';
import { TempoAnimation } from '../../components/TempoAnimation';
import { UseScheduleReturn } from './useSchedule';
import { ScheduleModals } from './ScheduleModals';

export function ScheduleDesktop(props: UseScheduleReturn) {
  const {
    targetDate,
    setTargetDate,
    schedule,
    loading,
    generating,
    actionLoading,
    error,
    setError,
    successMsg,
    setSuccessMsg,
    handleOpenEdit,
    handleOpenReschedule,
    handleOpenVersions,
    handleQuickUndo,
    handlePrevDay,
    handleNextDay,
    handleToday,
    handleGenerate,
    handleConfirmSchedule,
    handleRejectSchedule,
    handleToggleLock,
    formatMinutes,
    isCurrentBlock,
  } = props;

  const metrics = schedule?.metrics || null;
  const unscheduled = (schedule?.unscheduledTasks as any[]) || [];

  const getBlockStyle = (block: ScheduleBlockDTO) => {
    if (block.isLocked) {
      return {
        border: 'border-amber-500/50 ring-1 ring-amber-500/30',
        bg: 'bg-amber-950/20',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        icon: <Lock className="w-4 h-4 text-amber-400" />,
      };
    }

    switch (block.blockType) {
      case 'COLLEGE':
        return {
          border: 'border-2 border-[#080808]',
          bg: 'bg-[#FFFFFF]',
          badge: 'bg-[#080808] text-[#FFFFFF] font-bold border border-[#080808]',
          icon: <BookOpen className="w-4 h-4 text-[#080808]" />,
        };
      case 'EVENT':
        return {
          border: 'border border-[#080808]',
          bg: 'bg-[#FAFAFA]',
          badge: 'bg-[#171717] text-[#FFFFFF] font-medium border border-[#171717]',
          icon: <Calendar className="w-4 h-4 text-[#080808]" />,
        };
      case 'TASK':
        return {
          border: 'border border-[#D9D9D9] hover:border-[#080808]',
          bg: 'bg-[#FFFFFF]',
          badge: 'bg-[#F5F5F5] text-[#080808] border border-[#D9D9D9] font-medium',
          icon: <CheckCircle2 className="w-4 h-4 text-[#080808]" />,
        };
      case 'MEAL':
        return {
          border: 'border border-dashed border-[#D9D9D9]',
          bg: 'bg-[#F5F5F5]',
          badge: 'bg-[#EFEFEF] text-[#404040] border border-[#D9D9D9]',
          icon: <Coffee className="w-4 h-4 text-[#404040]" />,
        };
      case 'ROUTINE': {
        const cat = block.metadata?.category;
        const isFlexible = block.metadata?.classification === 'FLEXIBLE';
        let icon = <Clock className="w-4 h-4 text-[#080808]" />;
        if (cat === 'EXERCISE') icon = <Activity className="w-4 h-4 text-[#080808]" />;
        else if (cat === 'MORNING_ROUTINE') icon = <Sun className="w-4 h-4 text-[#080808]" />;
        else if (cat === 'EVENING_ROUTINE' || cat === 'SLEEP')
          icon = <Moon className="w-4 h-4 text-[#080808]" />;

        return {
          border: isFlexible
            ? 'border border-dashed border-[#777777]'
            : 'border-2 border-[#404040]',
          bg: isFlexible ? 'bg-[#FFFFFF]' : 'bg-[#FAFAFA]',
          badge: isFlexible
            ? 'bg-[#F5F5F5] text-[#404040] border border-[#D9D9D9]'
            : 'bg-[#404040] text-[#FFFFFF] border border-[#404040] font-semibold',
          icon,
        };
      }
      case 'BREAK':
        return {
          border: 'border border-[#E5E5E5]',
          bg: 'bg-[#F5F5F5]',
          badge: 'bg-[#EFEFEF] text-[#777777] border border-[#E5E5E5]',
          icon: <Coffee className="w-4 h-4 text-[#777777]" />,
        };
      case 'LEISURE':
        return {
          border: 'border border-[#D9D9D9]',
          bg: 'bg-[#FAFAFA]',
          badge: 'bg-[#F5F5F5] text-[#404040] border border-[#D9D9D9]',
          icon: <Smile className="w-4 h-4 text-[#404040]" />,
        };
      case 'FREE_TIME':
      default:
        return {
          border: 'border border-dashed border-[#D9D9D9]',
          bg: 'bg-transparent',
          badge: 'text-[#777777] border border-[#D9D9D9]',
          icon: <Clock className="w-4 h-4 text-[#777777]" />,
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#101010] text-[#080808] dark:text-[#F2F2F2] font-interface transition-colors">
      <Navbar />

      <div className="md:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 max-w-6xl w-full mx-auto px-6 lg:px-8 py-8 space-y-6 pb-12">
          {/* Desktop Header */}
          <div className="flex items-center justify-between gap-4 pb-6 border-b border-[#D9D9D9]">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#F5F5F5] text-[#080808] border border-[#D9D9D9]">
                  Intelligent Scheduler
                </span>
                <span className="text-xs text-[#777777]">
                  Approval, Editing & Rescheduling
                </span>
              </div>
              <h1 className="text-3xl font-extrabold text-[#080808] tracking-tight mt-1 flex items-baseline gap-2">
                <span>Daily Schedule</span>
                <span className="font-handwritten text-3xl font-normal text-[#777777]">
                  find your flow
                </span>
              </h1>
              <p className="text-xs text-[#777777] mt-0.5">
                Optimized daily plans with locked blocks, manual editing, and minimal-change
                rescheduling.
              </p>
            </div>

            {/* Date Controls & Prominent Generate */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[#FFFFFF] border border-[#D9D9D9] rounded-xl p-1 shadow-2xs">
                <button
                  onClick={handlePrevDay}
                  className="p-1.5 text-[#777777] hover:text-[#080808] hover:bg-[#F5F5F5] rounded-lg transition"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="bg-transparent text-xs text-[#080808] px-2 py-1 outline-none font-mono"
                />
                <button
                  onClick={handleNextDay}
                  className="p-1.5 text-[#777777] hover:text-[#080808] hover:bg-[#F5F5F5] rounded-lg transition"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleToday}
                className="px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#F5F5F5] border border-[#D9D9D9] text-[#080808] rounded-xl text-xs font-medium transition"
              >
                Today
              </button>

              <button
                onClick={() => handleGenerate(false)}
                disabled={generating}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#080808] hover:bg-[#171717] text-[#FFFFFF] rounded-xl text-xs font-semibold shadow-xs transition disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                <span>{generating ? 'Calculating...' : 'Generate Schedule'}</span>
              </button>
            </div>
          </div>

          {/* Notifications */}
          {error && (
            <div className="p-3.5 bg-[#F5F5F5] border border-[#080808] rounded-xl text-[#080808] text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-[#777777] hover:text-[#080808]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-[#FAFAFA] border border-[#080808] rounded-xl text-[#080808] text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button
                onClick={() => setSuccessMsg(null)}
                className="text-[#777777] hover:text-[#080808]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Schedule Lifecycle & Version Banner */}
          {schedule && (
            <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-2xl p-4 flex items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center space-x-3">
                <span
                  className={`text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider border ${
                    schedule.status === 'CONFIRMED'
                      ? 'bg-[#080808] text-[#FFFFFF] border-[#080808]'
                      : schedule.status === 'PROPOSED'
                        ? 'bg-[#F5F5F5] text-[#080808] border-[#080808]'
                        : 'bg-[#FAFAFA] text-[#777777] border-[#D9D9D9]'
                  }`}
                >
                  {schedule.status}
                </span>
                <span className="text-xs text-[#777777]">
                  Version <strong className="text-[#080808] font-mono">v{schedule.version}</strong>
                </span>
                {schedule.status === 'CONFIRMED' && (
                  <span className="text-[11px] text-[#404040] flex items-center gap-1 font-medium">
                    <Check className="w-3.5 h-3.5 text-[#080808]" /> Active plan for {schedule.date}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {schedule.status === 'PROPOSED' && (
                  <>
                    <button
                      onClick={handleConfirmSchedule}
                      disabled={actionLoading}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-[#080808] hover:bg-[#171717] text-[#FFFFFF] rounded-xl text-xs font-semibold shadow-xs transition disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm Schedule</span>
                    </button>
                    <button
                      onClick={handleRejectSchedule}
                      disabled={actionLoading}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#F5F5F5] text-[#080808] border border-[#D9D9D9] rounded-xl text-xs font-medium transition disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </>
                )}

                <button
                  onClick={handleOpenReschedule}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#F5F5F5] text-[#080808] border border-[#080808] rounded-xl text-xs font-medium transition"
                >
                  <Zap className="w-3.5 h-3.5 text-[#080808]" />
                  <span>Intelligent Reschedule</span>
                </button>

                {schedule.version > 1 && (
                  <button
                    onClick={handleQuickUndo}
                    disabled={actionLoading}
                    className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#FFFFFF] hover:bg-[#F5F5F5] text-[#777777] hover:text-[#080808] border border-[#D9D9D9] rounded-xl text-xs font-medium transition"
                    title={`Undo to v${schedule.version - 1}`}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#777777]" />
                    <span>Undo</span>
                  </button>
                )}

                <button
                  onClick={handleOpenVersions}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#FFFFFF] hover:bg-[#F5F5F5] text-[#777777] hover:text-[#080808] border border-[#D9D9D9] rounded-xl text-xs font-medium transition"
                >
                  <History className="w-3.5 h-3.5 text-[#777777]" />
                  <span>History</span>
                </button>
              </div>
            </div>
          )}

          {/* Desktop 4 Metrics Cards */}
          {metrics && (
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-xl p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-[#777777] text-[11px]">
                  <span>Available Time</span>
                  <Clock className="w-3.5 h-3.5 text-[#080808]" />
                </div>
                <p className="text-xl font-bold text-[#080808] mt-1 font-mono">
                  {formatMinutes(metrics.totalAvailableWorkMinutes || 0)}
                </p>
                <span className="text-[10px] text-[#777777]">Excluding sleep & routines</span>
              </div>

              <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-xl p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-[#777777] text-[11px]">
                  <span>Scheduled Work</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#080808]" />
                </div>
                <p className="text-xl font-bold text-[#080808] mt-1 font-mono">
                  {formatMinutes(metrics.totalScheduledWorkMinutes || 0)}
                </p>
                <span className="text-[10px] text-[#777777]">Tasks fitted into day</span>
              </div>

              <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-xl p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-[#777777] text-[11px]">
                  <span>Downtime & Free</span>
                  <Smile className="w-3.5 h-3.5 text-[#080808]" />
                </div>
                <p className="text-xl font-bold text-[#080808] mt-1 font-mono">
                  {formatMinutes(metrics.freeTimeRemainingMinutes || 0)}
                </p>
                <span className="text-[10px] text-[#777777]">Open buffer intervals</span>
              </div>

              <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-xl p-3.5 shadow-2xs">
                <div className="flex items-center justify-between text-[#777777] text-[11px]">
                  <span>Efficiency Score</span>
                  <Zap className="w-3.5 h-3.5 text-[#080808]" />
                </div>
                <p className="text-xl font-bold text-[#080808] mt-1 font-mono">
                  {metrics.efficiencyScore}%
                </p>
                <span className="text-[10px] text-[#777777]">Optimal utilization</span>
              </div>
            </div>
          )}

          {/* Desktop Content: Left 2 Cols Timeline, Right 1 Col Summaries */}
          <div className="grid grid-cols-3 gap-6">
            {/* Timeline */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-[#080808] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#080808]" />
                  <span>Daily Timeline ({targetDate})</span>
                </h2>
                {schedule && (
                  <span className="text-[11px] text-[#777777] font-mono">
                    {schedule.blocks.length} blocks • v{schedule.version}
                  </span>
                )}
              </div>

              {loading || generating ? (
                <div className="p-12 text-center bg-[#FFFFFF] dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#2A2A2A] rounded-2xl flex flex-col items-center justify-center space-y-3 shadow-xs">
                  <TempoAnimation
                    name="clock"
                    alt="Schedule clock animation"
                    size={64}
                    eager
                    fallback={<Clock className="w-8 h-8 mx-auto animate-spin text-[#080808] dark:text-[#F3F3F3]" />}
                  />
                  <p className="text-xs font-semibold text-[#080808] dark:text-[#F3F3F3]">
                    {generating ? 'Calculating optimized schedule...' : `Loading schedule for ${targetDate}...`}
                  </p>
                </div>
              ) : !schedule || schedule.blocks.length === 0 ? (
                <div className="p-12 text-center bg-[#FFFFFF] dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#2A2A2A] rounded-2xl space-y-3">
                  <Sparkles className="w-8 h-8 text-[#080808] dark:text-[#F3F3F3] mx-auto opacity-40" />
                  <h3 className="text-sm font-semibold text-[#080808] dark:text-[#F3F3F3]">
                    No schedule generated yet
                  </h3>
                  <p className="text-xs text-[#777777] dark:text-[#A3A3A3] max-w-md mx-auto">
                    Tempo uses your college timetable, fixed events, personal routines, and task
                    deadlines to construct a balanced plan.
                  </p>
                  <button
                    onClick={() => handleGenerate(false)}
                    disabled={generating}
                    className="mt-2 px-4 py-2 bg-[#080808] dark:bg-[#F3F3F3] hover:bg-[#171717] dark:hover:bg-[#E5E5E5] text-[#FFFFFF] dark:text-[#080808] text-xs font-semibold rounded-xl shadow-xs transition"
                  >
                    {generating ? 'Calculating...' : "Generate Today's Schedule"}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {schedule.blocks.map((block) => {
                    const style = getBlockStyle(block);
                    const isNow = isCurrentBlock(block);
                    const isRelaxationOrBreak =
                      block.blockType === 'BREAK' ||
                      block.blockType === 'LEISURE' ||
                      block.blockType === 'MEAL' ||
                      (block.blockType === 'ROUTINE' && block.metadata?.category === 'MEAL') ||
                      block.title.toLowerCase().includes('break') ||
                      block.title.toLowerCase().includes('tea');

                    return (
                      <div
                        key={block.id}
                        className={`p-3.5 rounded-xl border ${
                          isNow
                            ? 'border-[#080808] dark:border-[#F3F3F3] ring-2 ring-[#080808]/20 dark:ring-[#F3F3F3]/20 shadow-xs bg-[#FAFAFA] dark:bg-[#202020]'
                            : `${style.border} ${style.bg}`
                        } transition hover:shadow-xs group`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-24 text-right flex-shrink-0 pt-0.5">
                            <p className="text-xs font-mono font-semibold text-[#080808] dark:text-[#F3F3F3]">
                              {formatTimeRange(block.startTime, block.endTime)}
                            </p>
                            <p className="text-[10px] text-[#777777] dark:text-[#888888]">
                              {formatMinutes(block.durationMinutes)}
                            </p>
                          </div>

                          <div className="pt-0.5 flex-shrink-0 flex items-center justify-center w-5 h-5">
                            {isRelaxationOrBreak ? (
                              <TempoAnimation
                                name="tea"
                                alt="Tea break relaxation animation"
                                size={20}
                                fallback={<Coffee className="w-4 h-4 text-[#777777] dark:text-[#A3A3A3]" />}
                              />
                            ) : (
                              style.icon
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-semibold text-[#080808]">
                                {block.title}
                              </span>
                              {isNow && (
                                <span className="inline-flex text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider bg-[#080808] text-[#FFFFFF] animate-pulse">
                                  NOW
                                </span>
                              )}
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${style.badge}`}
                              >
                                {block.blockType}
                              </span>

                              {block.isLocked && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-[#F5F5F5] text-[#080808] border border-[#080808] flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5" /> Locked
                                </span>
                              )}

                              {block.metadata?.priority && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-semibold border ${
                                    block.metadata.priority === 'URGENT'
                                      ? 'bg-[#080808] text-[#FFFFFF] border-[#080808]'
                                      : block.metadata.priority === 'HIGH'
                                        ? 'bg-[#F5F5F5] text-[#080808] border-[#080808]'
                                        : 'bg-[#FAFAFA] text-[#777777] border-[#D9D9D9]'
                                  }`}
                                >
                                  {block.metadata.priority}
                                </span>
                              )}

                              {block.metadata?.sessionIndex && (
                                <span className="text-[10px] text-[#777777]">
                                  (Session {block.metadata.sessionIndex}
                                  {block.metadata.totalSessions
                                    ? ` of ${block.metadata.totalSessions}`
                                    : ''}
                                  )
                                </span>
                              )}
                            </div>

                            {block.metadata?.location && (
                              <p className="text-[11px] text-[#404040] mt-0.5">
                                📍 {block.metadata.location}
                              </p>
                            )}

                            {block.metadata?.notes && (
                              <p className="text-[11px] text-[#777777] mt-0.5 truncate">
                                {block.metadata.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center space-x-1 shrink-0 pt-0.5">
                            {!block.isFixed && block.blockType === 'TASK' && (
                              <button
                                onClick={() => handleToggleLock(block)}
                                className={`p-1.5 rounded-lg text-xs transition ${
                                  block.isLocked
                                    ? 'text-[#080808] bg-[#F5F5F5] border border-[#080808]'
                                    : 'text-[#777777] hover:text-[#080808] hover:bg-[#F5F5F5]'
                                }`}
                                title={block.isLocked ? 'Unlock block' : 'Lock block in place'}
                              >
                                {block.isLocked ? (
                                  <Lock className="w-3.5 h-3.5" />
                                ) : (
                                  <Unlock className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}

                            {!block.isFixed && block.blockType !== 'FREE_TIME' && (
                              <button
                                onClick={() => handleOpenEdit(block)}
                                className="p-1.5 text-[#777777] hover:text-[#080808] hover:bg-[#F5F5F5] rounded-lg transition"
                                title="Edit block time"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Desktop Right Column: Unscheduled & Principles */}
            <div className="space-y-6">
              {/* Unscheduled Tasks Section */}
              <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-2xl p-4 space-y-3 shadow-2xs">
                <h3 className="text-xs font-semibold text-[#080808] uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-[#080808]" />
                    <span>Unscheduled Tasks</span>
                  </span>
                  <span className="text-[11px] text-[#777777] font-mono">{unscheduled.length}</span>
                </h3>

                {unscheduled.length === 0 ? (
                  <p className="text-xs text-[#777777]">
                    All eligible tasks were successfully scheduled into today's rhythm!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {unscheduled.map((u, i) => (
                      <div
                        key={`${u.taskId}-${i}`}
                        className="p-2.5 rounded-lg bg-[#FAFAFA] border border-[#D9D9D9] text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-[#080808] truncate">{u.title}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold bg-[#F5F5F5] text-[#080808] border border-[#080808]">
                            {u.reason}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#777777]">{u.details}</p>
                        <div className="text-[10px] text-[#777777] flex justify-between">
                          <span>Needed: {u.estimatedMinutes}m</span>
                          <span>Left: {u.remainingMinutes}m</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Schedule Principles Guide */}
              <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-2xl p-4 text-xs space-y-2 text-[#777777] shadow-2xs">
                <h4 className="font-semibold text-[#080808]">Tempo Schedule Principles</h4>
                <ul className="space-y-1.5 text-[11px]">
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#080808] font-bold">•</span>
                    <span>
                      <strong>Locked Blocks:</strong> Pin tasks to an exact slot during
                      rescheduling.
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#080808] font-bold">•</span>
                    <span>
                      <strong>Intelligent Reschedule:</strong> Minimal-change algorithm moves only
                      what needs relocation.
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-[#080808] font-bold">•</span>
                    <span>
                      <strong>Version History:</strong> Every change creates an immutable snapshot
                      you can inspect or restore anytime.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <ScheduleModals {...props} />
        </main>
      </div>
    </div>
  );
}
