import { useState, useEffect } from 'react';
import {
  Calendar,
  Sparkles,
  Clock,
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
  ArrowRight,
} from 'lucide-react';
import { apiRequest } from '../api/client';
import {
  ScheduleDTO,
  ScheduleBlockDTO,
  ScheduleVersionDTO,
  ScheduleDiffItemDTO,
  RescheduleResponseDTO,
} from '@tempo/shared';

export function SchedulePage() {
  const [targetDate, setTargetDate] = useState<string>(() => {
    return new Date().toISOString().substring(0, 10);
  });
  const [schedule, setSchedule] = useState<ScheduleDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [editBlock, setEditBlock] = useState<ScheduleBlockDTO | null>(null);
  const [editStartTime, setEditStartTime] = useState<string>('');
  const [editEndTime, setEditEndTime] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');

  const [showRescheduleModal, setShowRescheduleModal] = useState<boolean>(false);
  const [rescheduleReason, setRescheduleReason] = useState<string>(
    'Task taking longer than expected'
  );
  const [additionalMinutes, setAdditionalMinutes] = useState<number>(30);
  const [selectedTaskToExtend, setSelectedTaskToExtend] = useState<string>('');
  const [newMeetingTitle, setNewMeetingTitle] = useState<string>('');
  const [newMeetingStart, setNewMeetingStart] = useState<string>('14:00');
  const [newMeetingEnd, setNewMeetingEnd] = useState<string>('15:00');

  const [rescheduleDiff, setRescheduleDiff] = useState<ScheduleDiffItemDTO[] | null>(null);
  const [changelog, setChangelog] = useState<string[]>([]);

  const [showVersionsModal, setShowVersionsModal] = useState<boolean>(false);
  const [versions, setVersions] = useState<ScheduleVersionDTO[]>([]);

  const fetchSchedule = async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<ScheduleDTO | null>(`/api/schedule?date=${date}`);
      setSchedule(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule(targetDate);
  }, [targetDate]);

  const handleGenerate = async (replaceConfirmed = false) => {
    setGenerating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const data = await apiRequest<ScheduleDTO>('/api/schedule/generate', {
        method: 'POST',
        body: JSON.stringify({
          targetDate,
          replaceConfirmed,
          options: {
            includeMeals: true,
            includeLeisure: true,
            includeFreeTimeBlocks: true,
          },
        }),
      });
      if (data) {
        setSchedule(data);
        setSuccessMsg('Schedule generated successfully.');
      }
    } catch (err: any) {
      if (err.code === 'CONFIRMED_SCHEDULE_EXISTS') {
        if (
          window.confirm(
            'A confirmed schedule already exists for this date. Would you like to generate a new replacement proposal and archive the confirmed schedule?'
          )
        ) {
          handleGenerate(true);
          return;
        }
      }
      setError(err.message || 'Failed to generate schedule');
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirmSchedule = async () => {
    if (!schedule) return;
    setActionLoading(true);
    setError(null);
    try {
      const data = await apiRequest<ScheduleDTO>(`/api/schedule/${schedule.id}/confirm`, {
        method: 'POST',
      });
      setSchedule(data);
      setSuccessMsg('Schedule successfully confirmed! You are all set for the day.');
    } catch (err: any) {
      setError(err.message || 'Failed to confirm schedule');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSchedule = async () => {
    if (!schedule) return;
    if (!window.confirm('Are you sure you want to reject and discard this proposed schedule?')) {
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await apiRequest(`/api/schedule/${schedule.id}/reject`, {
        method: 'POST',
      });
      setSchedule(null);
      setSuccessMsg('Proposal rejected and removed.');
    } catch (err: any) {
      setError(err.message || 'Failed to reject schedule');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleLock = async (block: ScheduleBlockDTO) => {
    try {
      const updatedBlock = await apiRequest<ScheduleBlockDTO>(
        `/api/schedule/blocks/${block.id}/lock`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isLocked: !block.isLocked }),
        }
      );

      if (schedule) {
        setSchedule({
          ...schedule,
          blocks: schedule.blocks.map((b) => (b.id === block.id ? updatedBlock : b)),
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to toggle lock');
    }
  };

  const handleOpenEdit = (block: ScheduleBlockDTO) => {
    setEditBlock(block);
    setEditStartTime(block.startTime);
    setEditEndTime(block.endTime);
    setEditTitle(block.title);
  };

  const handleSaveBlockEdit = async () => {
    if (!editBlock) return;
    setActionLoading(true);
    setError(null);
    try {
      const updatedSchedule = await apiRequest<ScheduleDTO>(
        `/api/schedule/blocks/${editBlock.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            startTime: editStartTime,
            endTime: editEndTime,
            title: editTitle,
          }),
        }
      );
      setSchedule(updatedSchedule);
      setEditBlock(null);
      setSuccessMsg(`Block "${editTitle}" updated.`);
    } catch (err: any) {
      setError(err.message || 'Failed to update block');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReschedule = () => {
    setShowRescheduleModal(true);
    setRescheduleDiff(null);
    setChangelog([]);
    // Select first task as default
    const firstTask = schedule?.blocks.find((b) => b.blockType === 'TASK' && b.taskId);
    if (firstTask?.taskId) {
      setSelectedTaskToExtend(firstTask.taskId);
    }
  };

  const handleExecuteReschedule = async () => {
    if (!schedule) return;
    setActionLoading(true);
    setError(null);
    try {
      const taskModifications: any[] = [];
      const newEvents: any[] = [];

      if (selectedTaskToExtend && additionalMinutes !== 0) {
        taskModifications.push({
          taskId: selectedTaskToExtend,
          additionalMinutes,
        });
      }

      if (newMeetingTitle.trim()) {
        newEvents.push({
          title: newMeetingTitle.trim(),
          startTime: newMeetingStart,
          endTime: newMeetingEnd,
          blockType: 'EVENT',
        });
      }

      const res = await apiRequest<RescheduleResponseDTO>(
        `/api/schedule/${schedule.id}/reschedule`,
        {
          method: 'POST',
          body: JSON.stringify({
            reason: rescheduleReason,
            taskModifications,
            newEvents,
          }),
        }
      );

      setSchedule(res.schedule);
      setRescheduleDiff(res.diff);
      setChangelog(res.changelog);
      setSuccessMsg('Intelligent rescheduling complete! Unaffected tasks were preserved.');
    } catch (err: any) {
      setError(err.message || 'Failed to reschedule');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenVersions = async () => {
    if (!schedule) return;
    setShowVersionsModal(true);
    try {
      const list = await apiRequest<ScheduleVersionDTO[]>(`/api/schedule/${schedule.id}/versions`);
      setVersions(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load versions');
    }
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    if (!schedule) return;
    if (!window.confirm(`Are you sure you want to restore schedule to Version ${versionNumber}?`)) {
      return;
    }
    setActionLoading(true);
    try {
      const restored = await apiRequest<ScheduleDTO>(`/api/schedule/${schedule.id}/restore`, {
        method: 'POST',
        body: JSON.stringify({ versionNumber }),
      });
      setSchedule(restored);
      setShowVersionsModal(false);
      setSuccessMsg(`Restored schedule to version ${versionNumber}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to restore version');
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickUndo = async () => {
    if (!schedule || schedule.version <= 1) return;
    await handleRestoreVersion(schedule.version - 1);
  };

  const handlePrevDay = () => {
    const d = new Date(targetDate);
    d.setDate(d.getDate() - 1);
    setTargetDate(d.toISOString().substring(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(targetDate);
    d.setDate(d.getDate() + 1);
    setTargetDate(d.toISOString().substring(0, 10));
  };

  const handleToday = () => {
    setTargetDate(new Date().toISOString().substring(0, 10));
  };

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

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
          border: 'border-indigo-500/30',
          bg: 'bg-indigo-950/20',
          badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
          icon: <BookOpen className="w-4 h-4 text-indigo-400" />,
        };
      case 'EVENT':
        return {
          border: 'border-amber-500/30',
          bg: 'bg-amber-950/20',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          icon: <Calendar className="w-4 h-4 text-amber-400" />,
        };
      case 'TASK':
        return {
          border: 'border-sky-500/30',
          bg: 'bg-sky-950/20',
          badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
          icon: <CheckCircle2 className="w-4 h-4 text-sky-400" />,
        };
      case 'MEAL':
        return {
          border: 'border-orange-500/30',
          bg: 'bg-orange-950/20',
          badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
          icon: <Coffee className="w-4 h-4 text-orange-400" />,
        };
      case 'BREAK':
        return {
          border: 'border-slate-700',
          bg: 'bg-slate-900/40',
          badge: 'bg-slate-800 text-slate-300 border-slate-700',
          icon: <Coffee className="w-4 h-4 text-slate-400" />,
        };
      case 'LEISURE':
        return {
          border: 'border-purple-500/30',
          bg: 'bg-purple-950/20',
          badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          icon: <Smile className="w-4 h-4 text-purple-400" />,
        };
      case 'FREE_TIME':
      default:
        return {
          border: 'border-dashed border-sky-500/20',
          bg: 'bg-sky-500/5',
          badge: 'bg-sky-500/10 text-sky-400/80 border-sky-500/20',
          icon: <Clock className="w-4 h-4 text-sky-400/60" />,
        };
    }
  };

  const metrics = schedule?.metrics || null;
  const unscheduled = (schedule?.unscheduledTasks as any[]) || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header and Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
              Phase 4 Active
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Approval, Editing & Rescheduling
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
            Intelligent Daily Schedule
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your daily plan with locked blocks, manual editing, and minimal-change
            rescheduling.
          </p>
        </div>

        {/* Date Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              onClick={handlePrevDay}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-transparent text-xs text-slate-200 px-2 py-1 outline-none font-mono"
            />
            <button
              onClick={handleNextDay}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
          >
            Today
          </button>

          <button
            onClick={() => handleGenerate(false)}
            disabled={generating}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-sky-500/20 transition disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Calculating...' : 'Generate Schedule'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Schedule Lifecycle & Version Banner */}
      {schedule && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${
                schedule.status === 'CONFIRMED'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : schedule.status === 'PROPOSED'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {schedule.status}
            </span>
            <span className="text-xs text-slate-400">
              Version <strong className="text-white font-mono">v{schedule.version}</strong>
            </span>
            {schedule.status === 'CONFIRMED' && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Active plan for {schedule.date}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {schedule.status === 'PROPOSED' && (
              <>
                <button
                  onClick={handleConfirmSchedule}
                  disabled={actionLoading}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Schedule</span>
                </button>
                <button
                  onClick={handleRejectSchedule}
                  disabled={actionLoading}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-medium transition disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              </>
            )}

            <button
              onClick={handleOpenReschedule}
              className="flex items-center space-x-1 px-3 py-1.5 bg-sky-600/80 hover:bg-sky-600 text-white rounded-lg text-xs font-medium transition"
            >
              <Zap className="w-3.5 h-3.5 text-sky-300" />
              <span>Intelligent Reschedule</span>
            </button>

            {schedule.version > 1 && (
              <button
                onClick={handleQuickUndo}
                disabled={actionLoading}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
                title={`Undo to v${schedule.version - 1}`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Undo</span>
              </button>
            )}

            <button
              onClick={handleOpenVersions}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
            >
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span>History</span>
            </button>
          </div>
        </div>
      )}

      {/* Metrics Banner */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Available Time</span>
              <Clock className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <p className="text-xl font-bold text-white mt-1">
              {formatMinutes(metrics.totalAvailableWorkMinutes || 0)}
            </p>
            <span className="text-[10px] text-slate-500">Excluding sleep & fixed sessions</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Scheduled Work</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-emerald-400 mt-1">
              {formatMinutes(metrics.totalScheduledWorkMinutes || 0)}
            </p>
            <span className="text-[10px] text-slate-500">Tasks fitted into the day</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Free Time</span>
              <Smile className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <p className="text-xl font-bold text-purple-300 mt-1">
              {formatMinutes(metrics.freeTimeRemainingMinutes || 0)}
            </p>
            <span className="text-[10px] text-slate-500">Open unscheduled buffer</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Efficiency Score</span>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-xl font-bold text-amber-400 mt-1">{metrics.efficiencyScore}%</p>
            <span className="text-[10px] text-slate-500">Optimal utilization</span>
          </div>
        </div>
      )}

      {/* Main Content: Timeline & Task Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Chronological Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>Daily Timeline ({targetDate})</span>
            </h2>
            {schedule && (
              <span className="text-[11px] text-slate-500 font-mono">
                {schedule.blocks.length} blocks • v{schedule.version}
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs bg-slate-900/20 border border-slate-800 rounded-xl">
              <Clock className="w-6 h-6 mx-auto mb-2 animate-spin text-sky-500" />
              Loading schedule for {targetDate}...
            </div>
          ) : !schedule || schedule.blocks.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
              <Sparkles className="w-8 h-8 text-sky-400 mx-auto opacity-60" />
              <h3 className="text-sm font-semibold text-slate-200">No schedule generated yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Tempo uses your college timetable, fixed events, and task deadlines to construct a
                balanced plan.
              </p>
              <button
                onClick={() => handleGenerate(false)}
                disabled={generating}
                className="mt-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold rounded-lg shadow-md transition"
              >
                {generating ? 'Calculating...' : "Generate Today's Schedule"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {schedule.blocks.map((block) => {
                const style = getBlockStyle(block);
                return (
                  <div
                    key={block.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border ${style.border} ${style.bg} transition hover:border-slate-600 group`}
                  >
                    {/* Time Column */}
                    <div className="w-24 text-right flex-shrink-0 pt-0.5">
                      <p className="text-xs font-mono font-semibold text-slate-200">
                        {block.startTime} - {block.endTime}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {formatMinutes(block.durationMinutes)}
                      </p>
                    </div>

                    {/* Indicator Icon */}
                    <div className="pt-0.5 flex-shrink-0">{style.icon}</div>

                    {/* Block Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-100 truncate">
                          {block.title}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${style.badge}`}
                        >
                          {block.blockType}
                        </span>

                        {block.isLocked && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Locked
                          </span>
                        )}

                        {block.metadata?.priority && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                              block.metadata.priority === 'URGENT'
                                ? 'bg-rose-500/20 text-rose-300'
                                : block.metadata.priority === 'HIGH'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {block.metadata.priority}
                          </span>
                        )}

                        {block.metadata?.sessionIndex && (
                          <span className="text-[10px] text-slate-400">
                            (Session {block.metadata.sessionIndex}
                            {block.metadata.totalSessions
                              ? ` of ${block.metadata.totalSessions}`
                              : ''}
                            )
                          </span>
                        )}
                      </div>

                      {block.metadata?.location && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          📍 {block.metadata.location}
                        </p>
                      )}

                      {block.metadata?.notes && (
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {block.metadata.notes}
                        </p>
                      )}
                    </div>

                    {/* Interactive Block Actions */}
                    <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition">
                      {!block.isFixed && block.blockType === 'TASK' && (
                        <button
                          onClick={() => handleToggleLock(block)}
                          className={`p-1.5 rounded-lg text-xs transition ${
                            block.isLocked
                              ? 'text-amber-400 hover:bg-amber-500/20'
                              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
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
                          className="p-1.5 text-slate-500 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition"
                          title="Edit block time"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Unscheduled / Work Summary */}
        <div className="space-y-6">
          {/* Unscheduled Tasks Section */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Unscheduled Tasks</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">{unscheduled.length}</span>
            </h3>

            {unscheduled.length === 0 ? (
              <p className="text-xs text-slate-500">
                All eligible tasks were successfully scheduled or completed!
              </p>
            ) : (
              <div className="space-y-2">
                {unscheduled.map((u, i) => (
                  <div
                    key={`${u.taskId}-${i}`}
                    className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-200 truncate">{u.title}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {u.reason}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{u.details}</p>
                    <div className="text-[10px] text-slate-500 flex justify-between">
                      <span>Needed: {u.estimatedMinutes}m</span>
                      <span>Left: {u.remainingMinutes}m</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Schedule Principles Guide */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 text-xs space-y-2 text-slate-400">
            <h4 className="font-semibold text-slate-300">Phase 4 Schedule Features</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400">•</span>
                <span>
                  <strong>Locked Blocks:</strong> Click the lock icon on tasks you must keep at an
                  exact time during rescheduling.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-sky-400">•</span>
                <span>
                  <strong>Intelligent Reschedule:</strong> Minimal-change algorithm moves only what
                  needs relocation.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400">•</span>
                <span>
                  <strong>Version Restoration:</strong> Every change creates an immutable version
                  you can inspect or restore anytime.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Edit Block Modal */}
      {editBlock && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-sky-400" />
                <span>Edit Schedule Block</span>
              </h3>
              <button
                onClick={() => setEditBlock(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-medium">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 font-medium">Start Time (HH:mm)</label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none font-mono focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium">End Time (HH:mm)</label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none font-mono focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setEditBlock(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBlockEdit}
                disabled={actionLoading}
                className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-xs font-semibold shadow transition disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-sky-400" />
                <span>Intelligent Reschedule</span>
              </h3>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Tempo uses minimal change to adapt your day. Locked blocks and unaffected sessions
              remain untouched.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-medium">Reason for Rescheduling</label>
                <select
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-sky-500"
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
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <label className="text-slate-300 font-medium block">
                    Select Task & Extra Time
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={selectedTaskToExtend}
                      onChange={(e) => setSelectedTaskToExtend(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-white outline-none"
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
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-white outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {rescheduleReason.includes('commitment') && (
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                  <label className="text-slate-300 font-medium block">Add Sudden Event</label>
                  <input
                    type="text"
                    value={newMeetingTitle}
                    onChange={(e) => setNewMeetingTitle(e.target.value)}
                    placeholder="e.g. Surprise Department Meeting"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-white outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      value={newMeetingStart}
                      onChange={(e) => setNewMeetingStart(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-white outline-none font-mono"
                    />
                    <input
                      type="time"
                      value={newMeetingEnd}
                      onChange={(e) => setNewMeetingEnd(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-white outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Diff & Changelog result */}
              {rescheduleDiff && rescheduleDiff.length > 0 && (
                <div className="p-3 bg-slate-950 border border-sky-500/30 rounded-xl space-y-2 max-h-48 overflow-y-auto">
                  <h4 className="font-bold text-sky-400 text-xs">Reschedule Diff & Impact</h4>
                  <div className="space-y-1.5">
                    {rescheduleDiff.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-[11px] bg-slate-900/60 p-1.5 rounded border border-slate-800"
                      >
                        <span className="font-medium text-slate-200 truncate">{d.title}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            d.type === 'PRESERVED'
                              ? 'bg-slate-800 text-slate-400'
                              : d.type === 'MOVED'
                                ? 'bg-amber-500/20 text-amber-300'
                                : d.type === 'ADDED'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {d.type} {d.newTime ? `(${d.newTime})` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {changelog.length > 0 && (
                <div className="p-3 bg-slate-950 border border-sky-500/30 rounded-xl space-y-2">
                  <h4 className="font-bold text-sky-400 text-xs">Summary of Changes</h4>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {changelog.map((c, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <ArrowRight className="w-3 h-3 text-sky-400 flex-shrink-0" />
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
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={handleExecuteReschedule}
                disabled={actionLoading}
                className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-xs font-semibold shadow transition disabled:opacity-50"
              >
                {actionLoading ? 'Calculating...' : 'Run Rescheduler'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <History className="w-4 h-4 text-sky-400" />
                <span>Schedule Version History</span>
              </h3>
              <button
                onClick={() => setShowVersionsModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {versions.length === 0 ? (
                <p className="text-xs text-slate-500">No version history available.</p>
              ) : (
                versions.map((v) => (
                  <div
                    key={v.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                      v.versionNumber === schedule?.version
                        ? 'border-sky-500/50 bg-sky-950/20'
                        : 'border-slate-800 bg-slate-950/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono">v{v.versionNumber}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                            v.status === 'CONFIRMED'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {v.status}
                        </span>
                        {v.versionNumber === schedule?.version && (
                          <span className="text-[10px] text-sky-400 font-semibold">(Current)</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{v.changeReason}</p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(v.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    {v.versionNumber !== schedule?.version && (
                      <button
                        onClick={() => handleRestoreVersion(v.versionNumber)}
                        disabled={actionLoading}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
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
    </div>
  );
}
