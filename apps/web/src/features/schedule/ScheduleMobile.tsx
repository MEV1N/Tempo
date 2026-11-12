import { useState } from 'react';
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
  ChevronDown,
  ChevronUp,
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
import { MobileAnimation } from '../../components/MobileAnimation';
import { UseScheduleReturn } from './useSchedule';
import { ScheduleModals } from './ScheduleModals';

export function ScheduleMobile(props: UseScheduleReturn) {
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

  const [showMobileMetrics, setShowMobileMetrics] = useState<boolean>(false);
  const [showUnscheduled, setShowUnscheduled] = useState<boolean>(false);

  const metrics = schedule?.metrics || null;
  const unscheduled = (schedule?.unscheduledTasks as any[]) || [];

  const getBlockStyle = (block: ScheduleBlockDTO) => {
    if (block.isLocked) {
      return {
        border: 'border-amber-500/50',
        bg: 'bg-amber-950/10',
        badge: 'bg-amber-500/20 text-amber-800 border-amber-500/30',
        icon: <Lock className="w-3.5 h-3.5 text-amber-600" />,
      };
    }

    switch (block.blockType) {
      case 'COLLEGE':
        return {
          border: 'border-[#080808]',
          bg: 'bg-[#FFFFFF]',
          badge: 'bg-[#080808] text-[#FFFFFF]',
          icon: <BookOpen className="w-3.5 h-3.5 text-[#080808]" />,
        };
      case 'EVENT':
        return {
          border: 'border-[#080808]',
          bg: 'bg-[#FAFAFA]',
          badge: 'bg-[#171717] text-[#FFFFFF]',
          icon: <Calendar className="w-3.5 h-3.5 text-[#080808]" />,
        };
      case 'TASK':
        return {
          border: 'border-[#D9D9D9]',
          bg: 'bg-[#FFFFFF]',
          badge: 'bg-[#F5F5F5] text-[#080808] border border-[#D9D9D9]',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#080808]" />,
        };
      case 'MEAL':
        return {
          border: 'border-dashed border-[#D9D9D9]',
          bg: 'bg-[#F5F5F5]',
          badge: 'bg-[#EFEFEF] text-[#404040]',
          icon: <Coffee className="w-3.5 h-3.5 text-[#404040]" />,
        };
      case 'ROUTINE': {
        const cat = block.metadata?.category;
        let icon = <Clock className="w-3.5 h-3.5 text-[#080808]" />;
        if (cat === 'EXERCISE') icon = <Activity className="w-3.5 h-3.5 text-[#080808]" />;
        else if (cat === 'MORNING_ROUTINE') icon = <Sun className="w-3.5 h-3.5 text-[#080808]" />;
        else if (cat === 'EVENING_ROUTINE' || cat === 'SLEEP')
          icon = <Moon className="w-3.5 h-3.5 text-[#080808]" />;

        return {
          border: 'border-[#404040]',
          bg: 'bg-[#FAFAFA]',
          badge: 'bg-[#404040] text-[#FFFFFF]',
          icon,
        };
      }
      case 'BREAK':
        return {
          border: 'border-[#E5E5E5]',
          bg: 'bg-[#F5F5F5]',
          badge: 'bg-[#EFEFEF] text-[#777777]',
          icon: <Coffee className="w-3.5 h-3.5 text-[#777777]" />,
        };
      case 'LEISURE':
        return {
          border: 'border-[#D9D9D9]',
          bg: 'bg-[#FAFAFA]',
          badge: 'bg-[#F5F5F5] text-[#404040]',
          icon: <Smile className="w-3.5 h-3.5 text-[#404040]" />,
        };
      case 'FREE_TIME':
      default:
        return {
          border: 'border-dashed border-[#D9D9D9]',
          bg: 'bg-transparent',
          badge: 'text-[#777777] border border-[#D9D9D9]',
          icon: <Clock className="w-3.5 h-3.5 text-[#777777]" />,
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#181818] text-[#080808] dark:text-[#F5F5F5] font-interface pb-28 transition-colors">
      <Navbar />

      <main className="max-w-xl mx-auto px-5 py-5 space-y-4">
        {/* 1. Page Title */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-[#080808]">Schedule</h1>
          {schedule && (
            <div className="flex items-center space-x-1.5">
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                  schedule.status === 'CONFIRMED'
                    ? 'bg-[#080808] text-[#FFFFFF]'
                    : 'bg-[#F5F5F5] text-[#080808] border border-[#D9D9D9]'
                }`}
              >
                {schedule.status}
              </span>
              <span className="text-[10px] text-[#777777] font-mono">v{schedule.version}</span>
            </div>
          )}
        </div>

        {/* 2. Selected Date with Prev/Next Controls & Today Action */}
        <div className="flex items-center justify-between gap-2 bg-[#FFFFFF] border border-[#D9D9D9] p-1.5 rounded-xl shadow-2xs">
          <div className="flex items-center space-x-1">
            <button
              onClick={handlePrevDay}
              className="p-1.5 text-[#777777] hover:text-[#080808] hover:bg-[#F5F5F5] rounded-lg transition min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-transparent text-xs text-[#080808] font-mono font-medium outline-none px-1"
            />
            <button
              onClick={handleNextDay}
              className="p-1.5 text-[#777777] hover:text-[#080808] hover:bg-[#F5F5F5] rounded-lg transition min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="Next day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3 py-1.5 bg-[#FAFAFA] hover:bg-[#F0F0F0] border border-[#D9D9D9] text-[#080808] rounded-lg text-xs font-medium transition min-h-[36px]"
          >
            Today
          </button>
        </div>

        {/* 3. One Prominent Generate Schedule Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleGenerate(false)}
            disabled={generating}
            className="flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 bg-[#080808] hover:bg-[#171717] text-[#FFFFFF] rounded-xl text-xs font-semibold shadow-xs transition disabled:opacity-50 min-h-[44px]"
          >
            <Sparkles className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Calculating Schedule...' : 'Generate Schedule'}</span>
          </button>

          {schedule && (
            <button
              onClick={handleOpenReschedule}
              className="p-2.5 bg-[#FFFFFF] hover:bg-[#F5F5F5] text-[#080808] border border-[#080808] rounded-xl transition min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
              title="Intelligent Reschedule"
              aria-label="Intelligent Reschedule"
            >
              <Zap className="w-4 h-4 text-[#080808]" />
            </button>
          )}

          {schedule && schedule.version > 1 && (
            <button
              onClick={handleQuickUndo}
              disabled={actionLoading}
              className="p-2.5 bg-[#FFFFFF] hover:bg-[#F5F5F5] text-[#777777] hover:text-[#080808] border border-[#D9D9D9] rounded-xl transition min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
              title={`Undo to v${schedule.version - 1}`}
              aria-label="Undo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {schedule && (
            <button
              onClick={handleOpenVersions}
              className="p-2.5 bg-[#FFFFFF] hover:bg-[#F5F5F5] text-[#777777] hover:text-[#080808] border border-[#D9D9D9] rounded-xl transition min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
              title="Version History"
              aria-label="Version History"
            >
              <History className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Schedule Proposal Approval (if PROPOSED) */}
        {schedule && schedule.status === 'PROPOSED' && (
          <div className="p-3 bg-[#FFFFFF] border border-[#080808] rounded-xl flex items-center justify-between gap-2 shadow-2xs">
            <span className="text-xs text-[#080808] font-medium">New proposed plan:</span>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleConfirmSchedule}
                disabled={actionLoading}
                className="flex items-center space-x-1 px-3 py-1.5 bg-[#080808] text-[#FFFFFF] rounded-lg text-xs font-semibold"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm</span>
              </button>
              <button
                onClick={handleRejectSchedule}
                disabled={actionLoading}
                className="px-2.5 py-1.5 bg-[#FFFFFF] border border-[#D9D9D9] text-[#080808] rounded-lg text-xs"
              >
                Reject
              </button>
            </div>
          </div>
        )}

        {/* Notifications */}
        {error && (
          <div className="p-3 bg-[#F5F5F5] border border-[#080808] rounded-xl text-[#080808] text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-[#FAFAFA] border border-[#080808] rounded-xl text-[#080808] text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Compact Metrics Bar with Expandable Details */}
        {metrics && (
          <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-xl p-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs">
                <span className="font-semibold text-[#080808] font-mono">
                  {formatMinutes(metrics.totalScheduledWorkMinutes || 0)} work
                </span>
                <span className="text-[#D9D9D9]">•</span>
                <span className="text-[#404040] font-mono">
                  {formatMinutes(metrics.freeTimeRemainingMinutes || 0)} free
                </span>
                <span className="text-[#D9D9D9]">•</span>
                <span className="text-[#777777] font-mono">{metrics.efficiencyScore}%</span>
              </div>
              <button
                onClick={() => setShowMobileMetrics(!showMobileMetrics)}
                className="text-xs text-[#777777] hover:text-[#080808] flex items-center gap-1 font-medium px-2 py-0.5 rounded hover:bg-[#F5F5F5]"
                aria-label="Toggle details"
              >
                <span>{showMobileMetrics ? 'Less' : 'Details'}</span>
                {showMobileMetrics ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            {showMobileMetrics && (
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#EFEFEF] text-xs">
                <div className="p-2 bg-[#FAFAFA] rounded-lg">
                  <span className="text-[10px] text-[#777777] block">Available Work</span>
                  <span className="font-bold font-mono text-[#080808]">
                    {formatMinutes(metrics.totalAvailableWorkMinutes || 0)}
                  </span>
                </div>
                <div className="p-2 bg-[#FAFAFA] rounded-lg">
                  <span className="text-[10px] text-[#777777] block">Scheduled</span>
                  <span className="font-bold font-mono text-[#080808]">
                    {formatMinutes(metrics.totalScheduledWorkMinutes || 0)}
                  </span>
                </div>
                <div className="p-2 bg-[#FAFAFA] rounded-lg">
                  <span className="text-[10px] text-[#777777] block">Downtime</span>
                  <span className="font-bold font-mono text-[#080808]">
                    {formatMinutes(metrics.freeTimeRemainingMinutes || 0)}
                  </span>
                </div>
                <div className="p-2 bg-[#FAFAFA] rounded-lg">
                  <span className="text-[10px] text-[#777777] block">Efficiency</span>
                  <span className="font-bold font-mono text-[#080808]">
                    {metrics.efficiencyScore}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Compact Loading State */}
        {loading || generating ? (
          <div className="py-8 px-4 bg-[#FFFFFF] dark:bg-[#181818] border border-[#EAEAEA] dark:border-[#383838] rounded-2xl flex flex-col items-center justify-center space-y-2 text-center shadow-xs">
            <MobileAnimation
              name="clock"
              alt="Schedule clock animation"
              size={90}
              eager
              fallback={<Clock className="w-8 h-8 animate-spin text-[#080808] dark:text-[#F5F5F5]" />}
            />
            <p className="text-xs font-semibold text-[#080808] dark:text-[#F5F5F5]">
              {generating ? 'Generating your schedule...' : 'Loading your schedule...'}
            </p>
          </div>
        ) : !schedule || schedule.blocks.length === 0 ? (
          <div className="p-8 text-center bg-[#FFFFFF] border border-[#D9D9D9] rounded-2xl space-y-3">
            <Sparkles className="w-6 h-6 text-[#080808] mx-auto opacity-40" />
            <h3 className="text-sm font-semibold text-[#080808]">No schedule for today</h3>
            <p className="text-xs text-[#777777] max-w-xs mx-auto">
              Tap Generate Schedule above to construct your optimized daily plan.
            </p>
          </div>
        ) : (
          /* 4. Daily Timeline Agenda */
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-[#080808] uppercase tracking-wider">
                Timeline Agenda
              </span>
              <span className="text-[11px] text-[#777777] font-mono">
                {schedule.blocks.length} blocks
              </span>
            </div>

            <div className="space-y-1.5">
              {schedule.blocks.map((block) => {
                const style = getBlockStyle(block);
                const isNow = isCurrentBlock(block);

                return (
                  <div
                    key={block.id}
                    className={`p-3 rounded-xl border ${
                      isNow
                        ? 'border-[#080808] ring-1 ring-[#080808] shadow-xs bg-[#FFFFFF]'
                        : `${style.border} ${style.bg}`
                    } transition`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2 flex-1 min-w-0">
                        <div className="pt-0.5 shrink-0 flex items-center justify-center w-4 h-4">
                          {style.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-[#080808] leading-tight">
                              {block.title}
                            </span>
                            {isNow && (
                              <span className="text-[9px] px-1 py-0.2 rounded font-black tracking-wider bg-[#080808] text-[#FFFFFF] animate-pulse">
                                NOW
                              </span>
                            )}
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${style.badge}`}
                            >
                              {block.blockType}
                            </span>
                            {block.isLocked && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#F5F5F5] text-[#080808] border border-[#080808] font-semibold flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" /> Locked
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 text-[11px] text-[#404040] font-mono mt-1">
                            <span className="font-semibold text-[#080808]">
                              {formatTimeRange(block.startTime, block.endTime)}
                            </span>
                            <span>•</span>
                            <span className="text-[#777777]">
                              {formatMinutes(block.durationMinutes)}
                            </span>
                          </div>

                          {block.metadata?.location && (
                            <p className="text-[10px] text-[#777777] mt-0.5 truncate">
                              📍 {block.metadata.location}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Compact Block Action */}
                      <div className="flex items-center space-x-1 shrink-0">
                        {!block.isFixed && block.blockType === 'TASK' && (
                          <button
                            onClick={() => handleToggleLock(block)}
                            className={`p-1.5 rounded-lg text-xs min-w-[34px] min-h-[34px] flex items-center justify-center ${
                              block.isLocked
                                ? 'text-[#080808] bg-[#F5F5F5] border border-[#080808]'
                                : 'text-[#777777] hover:text-[#080808]'
                            }`}
                            aria-label={block.isLocked ? 'Unlock block' : 'Lock block'}
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
                            className="p-1.5 rounded-lg text-[#777777] hover:text-[#080808] min-w-[34px] min-h-[34px] flex items-center justify-center"
                            aria-label="Edit time"
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
          </div>
        )}

        {/* 5. Collapsible Unscheduled Tasks (Shown only if > 0) */}
        {unscheduled.length > 0 && (
          <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-xl p-3 shadow-2xs">
            <button
              onClick={() => setShowUnscheduled(!showUnscheduled)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-[#080808]" />
                <span className="text-xs font-semibold text-[#080808] uppercase tracking-wider">
                  Unscheduled Tasks
                </span>
                <span className="text-[11px] font-mono text-[#777777]">
                  ({unscheduled.length})
                </span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-[#777777]">
                <span>{showUnscheduled ? 'Hide' : 'Inspect'}</span>
                {showUnscheduled ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </div>
            </button>

            {showUnscheduled && (
              <div className="space-y-2 mt-3 pt-3 border-t border-[#EFEFEF]">
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
                    <div className="text-[10px] text-[#777777] flex justify-between font-mono">
                      <span>Needed: {u.estimatedMinutes}m</span>
                      <span>Left: {u.remainingMinutes}m</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <ScheduleModals {...props} />
      </main>
    </div>
  );
}
