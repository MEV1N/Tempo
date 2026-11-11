import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from '../components/Navbar';
import { apiRequest } from '../api/client';
import {
  ActivitySessionDTO,
  PlannedVsActualSummaryDTO,
  ProductivityHeatmapDTO,
  ProductivityAnalyticsDTO,
  ActivityCategory,
  CreateActivityInput,
  HeatmapDayDTO,
} from '@tempo/shared';
import {
  BarChart3,
  Flame,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Sparkles,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  X,
  PieChart,
  ArrowRight,
} from 'lucide-react';

const CATEGORY_COLORS: Record<ActivityCategory, { bg: string; text: string; border: string }> = {
  STUDY: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  COLLEGE: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
  WORK: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  PERSONAL: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  EXERCISE: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  LEISURE: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  OTHER: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
};

const HEATMAP_INTENSITY_CLASSES: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-slate-900 border-slate-800/80',
  1: 'bg-sky-950/80 border-sky-800/40 text-sky-400',
  2: 'bg-sky-800/80 border-sky-600/50 text-sky-300',
  3: 'bg-sky-600 border-sky-400 text-sky-100',
  4: 'bg-sky-400 border-sky-200 text-slate-950 font-bold',
};

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'log' | 'heatmap' | 'trends'>('log');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'week' | 'month'>('week');

  // Data states
  const [activities, setActivities] = useState<ActivitySessionDTO[]>([]);
  const [plannedVsActual, setPlannedVsActual] = useState<PlannedVsActualSummaryDTO | null>(null);
  const [heatmap, setHeatmap] = useState<ProductivityHeatmapDTO | null>(null);
  const [analytics, setAnalytics] = useState<ProductivityAnalyticsDTO | null>(null);
  const [availableTasks, setAvailableTasks] = useState<{ id: string; title: string }[]>([]);

  // UI & Modal states
  const [loading, setLoading] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivitySessionDTO | null>(null);
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState<HeatmapDayDTO | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateActivityInput>({
    title: '',
    category: 'STUDY',
    taskId: null,
    startTime: `${new Date().toISOString().substring(0, 10)}T09:00:00.000Z`,
    endTime: `${new Date().toISOString().substring(0, 10)}T10:00:00.000Z`,
    durationMinutes: 60,
    date: new Date().toISOString().substring(0, 10),
    notes: '',
    completedAsPlanned: true,
  });

  const [formStartTimeStr, setFormStartTimeStr] = useState('09:00');
  const [formEndTimeStr, setFormEndTimeStr] = useState('10:00');

  // Initial load
  useEffect(() => {
    loadAllData();
  }, [selectedDate, analyticsPeriod]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [actRes, pvaRes, heatRes, analRes, taskRes] = await Promise.all([
        apiRequest<ActivitySessionDTO[]>(`/api/activities?date=${selectedDate}`).catch(() => []),
        apiRequest<PlannedVsActualSummaryDTO>(
          `/api/analytics/planned-vs-actual?date=${selectedDate}`
        ).catch(() => null),
        apiRequest<ProductivityHeatmapDTO>('/api/analytics/heatmap').catch(() => null),
        apiRequest<ProductivityAnalyticsDTO>(
          `/api/analytics/summary?period=${analyticsPeriod}`
        ).catch(() => null),
        apiRequest<{ tasks: { id: string; title: string }[] }>('/api/tasks?limit=50').catch(() => ({
          tasks: [],
        })),
      ]);

      if (actRes) setActivities(actRes);
      if (pvaRes) setPlannedVsActual(pvaRes);
      if (heatRes) setHeatmap(heatRes);
      if (analRes) setAnalytics(analRes);
      if (taskRes?.tasks) setAvailableTasks(taskRes.tasks);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingActivity(null);
    setFormStartTimeStr('09:00');
    setFormEndTimeStr('10:00');
    setFormData({
      title: '',
      category: 'STUDY',
      taskId: null,
      startTime: `${selectedDate}T09:00:00.000Z`,
      endTime: `${selectedDate}T10:00:00.000Z`,
      durationMinutes: 60,
      date: selectedDate,
      notes: '',
      completedAsPlanned: true,
    });
    setShowLogModal(true);
  };

  const handleOpenEditModal = (activity: ActivitySessionDTO) => {
    setEditingActivity(activity);
    const sStr = activity.startTime.substring(11, 16);
    const eStr = activity.endTime.substring(11, 16);
    setFormStartTimeStr(sStr);
    setFormEndTimeStr(eStr);
    setFormData({
      title: activity.title,
      category: activity.category,
      taskId: activity.taskId || null,
      startTime: activity.startTime,
      endTime: activity.endTime,
      durationMinutes: activity.durationMinutes,
      date: activity.date,
      notes: activity.notes || '',
      completedAsPlanned: activity.completedAsPlanned,
    });
    setShowLogModal(true);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const fullStart = `${formData.date}T${formStartTimeStr}:00.000Z`;
      const fullEnd = `${formData.date}T${formEndTimeStr}:00.000Z`;

      const startMs = new Date(fullStart).getTime();
      const endMs = new Date(fullEnd).getTime();
      let calculatedMins = Math.round((endMs - startMs) / 60000);
      if (calculatedMins <= 0) calculatedMins = 60;

      const payload = {
        ...formData,
        startTime: fullStart,
        endTime: fullEnd,
        durationMinutes: calculatedMins,
      };

      if (editingActivity) {
        await apiRequest(`/api/activities/${editingActivity.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/api/activities', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setShowLogModal(false);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to save activity session');
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (!confirm('Are you sure you want to delete this activity record?')) return;
    try {
      await apiRequest(`/api/activities/${id}`, { method: 'DELETE' });
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete activity');
    }
  };

  // Group heatmap into 52 weeks (7 days each)
  const heatmapWeeks = useMemo(() => {
    if (!heatmap?.days) return [];
    const weeks: HeatmapDayDTO[][] = [];
    let currentWeek: HeatmapDayDTO[] = [];

    heatmap.days.forEach((day, index) => {
      currentWeek.push(day);
      if (currentWeek.length === 7 || index === heatmap.days.length - 1) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    return weeks;
  }, [heatmap]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phase 5: Activity Tracking & Productivity Analytics</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Activity & Productivity
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Log focused sessions, inspect planned vs. actual schedule execution, and track 365-day
              streaks.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {loading && <span className="text-xs text-sky-400 animate-pulse">Syncing...</span>}
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Log Activity</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 space-x-8">
          <button
            onClick={() => setActiveTab('log')}
            className={`pb-3 text-xs sm:text-sm font-semibold flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'log'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Activity Log & Planned vs Actual</span>
          </button>

          <button
            onClick={() => setActiveTab('heatmap')}
            className={`pb-3 text-xs sm:text-sm font-semibold flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'heatmap'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>365-Day Heatmap</span>
          </button>

          <button
            onClick={() => setActiveTab('trends')}
            className={`pb-3 text-xs sm:text-sm font-semibold flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'trends'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Productivity Trends & Breakdown</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: ACTIVITY LOG & PLANNED VS ACTUAL                   */}
        {/* ======================================================== */}
        {activeTab === 'log' && (
          <div className="space-y-6">
            {/* Date Picker Bar */}
            <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center space-x-3">
                <CalendarIcon className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-semibold text-slate-300">Selected Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                onClick={() => setSelectedDate(new Date().toISOString().substring(0, 10))}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium"
              >
                Today
              </button>
            </div>

            {/* Planned vs Actual Summary Cards */}
            {plannedVsActual && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-sky-400" />
                      <span>Planned vs. Actual Schedule Execution</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Compares your generated schedule blocks with logged activity sessions.
                    </p>
                  </div>

                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                    <span className="text-slate-400">Ratio:</span>
                    <span
                      className={`font-bold ${
                        plannedVsActual.plannedVsActualRatio >= 0.9 &&
                        plannedVsActual.plannedVsActualRatio <= 1.1
                          ? 'text-emerald-400'
                          : plannedVsActual.plannedVsActualRatio > 1.1
                            ? 'text-amber-400'
                            : 'text-sky-400'
                      }`}
                    >
                      {Math.round(plannedVsActual.plannedVsActualRatio * 100)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <p className="text-[11px] text-slate-400">Planned Minutes</p>
                    <p className="text-xl font-bold text-white mt-1">
                      {plannedVsActual.totalPlannedMinutes}m
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <p className="text-[11px] text-slate-400">Actual Recorded</p>
                    <p className="text-xl font-bold text-sky-400 mt-1">
                      {plannedVsActual.totalActualMinutes}m
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <p className="text-[11px] text-slate-400">On Track</p>
                    <p className="text-xl font-bold text-emerald-400 mt-1">
                      {plannedVsActual.tasksCompletedAsPlanned}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <p className="text-[11px] text-slate-400">Unplanned Items</p>
                    <p className="text-xl font-bold text-amber-400 mt-1">
                      {plannedVsActual.unplannedActivitiesCount}
                    </p>
                  </div>
                </div>

                {/* Planned vs Actual Breakdown List */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-300">Detailed Comparison</h3>
                  {plannedVsActual.items.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">
                      No schedule or activities recorded for this date.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                      {plannedVsActual.items.map((item, idx) => {
                        let statusColor = 'bg-slate-800 text-slate-300';
                        if (item.status === 'ON_TRACK')
                          statusColor =
                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                        if (item.status === 'EXCEEDED')
                          statusColor = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                        if (item.status === 'SHORT')
                          statusColor = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                        if (item.status === 'UNPLANNED')
                          statusColor =
                            'bg-purple-500/10 text-purple-400 border border-purple-500/20';
                        if (item.status === 'NOT_STARTED')
                          statusColor = 'bg-slate-800 text-slate-400 border border-slate-700';

                        return (
                          <div
                            key={idx}
                            className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-900/40 transition"
                          >
                            <div>
                              <p className="text-xs font-semibold text-white">{item.title}</p>
                              <p className="text-[11px] text-slate-400">
                                Planned: {item.plannedMinutes}m | Actual: {item.actualMinutes}m
                                {item.deltaMinutes !== 0 && (
                                  <span
                                    className={`ml-2 font-mono ${
                                      item.deltaMinutes > 0 ? 'text-amber-400' : 'text-slate-500'
                                    }`}
                                  >
                                    (
                                    {item.deltaMinutes > 0
                                      ? `+${item.deltaMinutes}`
                                      : item.deltaMinutes}
                                    m)
                                  </span>
                                )}
                              </p>
                            </div>

                            <span
                              className={`self-start sm:self-auto px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${statusColor}`}
                            >
                              {item.status.replace('_', ' ')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recorded Activities List */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>Activity Sessions for {selectedDate}</span>
                </h2>
                <span className="text-xs text-slate-500 font-mono">
                  {activities.length} session{activities.length !== 1 ? 's' : ''}
                </span>
              </div>

              {activities.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-xs text-slate-400">
                    No activity sessions logged for {selectedDate}.
                  </p>
                  <button
                    onClick={handleOpenAddModal}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-medium hover:bg-sky-500/20 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log First Session</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {activities.map((act) => {
                    const col = CATEGORY_COLORS[act.category] || CATEGORY_COLORS.OTHER;
                    return (
                      <div
                        key={act.id}
                        className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${col.bg} ${col.text} border ${col.border}`}
                            >
                              {act.category}
                            </span>
                            <span className="text-xs font-bold text-white">{act.title}</span>
                            {act.completedAsPlanned && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                            <span>{act.timeDisplay}</span>
                            <span>•</span>
                            <span className="font-mono text-slate-300">
                              {act.durationMinutes} mins
                            </span>
                            {act.taskTitle && (
                              <>
                                <span>•</span>
                                <span className="text-sky-400 truncate max-w-[200px]">
                                  Task: {act.taskTitle}
                                </span>
                              </>
                            )}
                          </div>

                          {act.notes && (
                            <p className="text-xs text-slate-400 italic pt-1">{act.notes}</p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 self-end sm:self-auto">
                          <button
                            onClick={() => handleOpenEditModal(act)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition"
                            title="Edit Session"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteActivity(act.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 transition"
                            title="Delete Session"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: 365-DAY PRODUCTIVITY HEATMAP                       */}
        {/* ======================================================== */}
        {activeTab === 'heatmap' && heatmap && (
          <div className="space-y-6">
            {/* Streak & Aggregate Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-2">
                <div className="flex items-center space-x-2 text-amber-400">
                  <Flame className="w-5 h-5" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Current Streak
                  </span>
                </div>
                <p className="text-2xl font-black text-white">
                  {heatmap.currentStreakDays}{' '}
                  <span className="text-xs font-normal text-slate-400">days</span>
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-2">
                <div className="flex items-center space-x-2 text-indigo-400">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Longest Streak
                  </span>
                </div>
                <p className="text-2xl font-black text-white">
                  {heatmap.longestStreakDays}{' '}
                  <span className="text-xs font-normal text-slate-400">days</span>
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-2">
                <div className="flex items-center space-x-2 text-sky-400">
                  <Clock className="w-5 h-5" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Total Hours
                  </span>
                </div>
                <p className="text-2xl font-black text-white">
                  {heatmap.totalRecordedHours}{' '}
                  <span className="text-xs font-normal text-slate-400">hrs</span>
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Active Days
                  </span>
                </div>
                <p className="text-2xl font-black text-white">
                  {heatmap.activeDaysCount}{' '}
                  <span className="text-xs font-normal text-slate-400">/ 365</span>
                </p>
              </div>
            </div>

            {/* Heatmap Grid Visualizer */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 overflow-x-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-sky-400" />
                  <span>365-Day Activity Heatmap</span>
                </h2>
                <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                  <span>Less</span>
                  <div className="w-3 h-3 rounded bg-slate-900 border border-slate-800" />
                  <div className="w-3 h-3 rounded bg-sky-950 border border-sky-800/40" />
                  <div className="w-3 h-3 rounded bg-sky-800 border border-sky-600/50" />
                  <div className="w-3 h-3 rounded bg-sky-600 border border-sky-400" />
                  <div className="w-3 h-3 rounded bg-sky-400 border border-sky-200" />
                  <span>More</span>
                </div>
              </div>

              {/* 52-week grid container */}
              <div className="pt-2">
                <div className="flex gap-1.5 min-w-[760px] pb-2">
                  {heatmapWeeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-1.5">
                      {week.map((day) => (
                        <button
                          key={day.date}
                          onClick={() => {
                            setSelectedHeatmapDay(day);
                            setSelectedDate(day.date);
                          }}
                          className={`w-3.5 h-3.5 rounded-sm border transition hover:scale-125 focus:outline-none focus:ring-1 focus:ring-sky-400 ${
                            HEATMAP_INTENSITY_CLASSES[day.intensity]
                          } ${selectedDate === day.date ? 'ring-2 ring-white' : ''}`}
                          title={`${day.date}: ${day.totalMinutes}m (${day.count} sessions)`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Day Info Callout */}
              {selectedHeatmapDay && (
                <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-white">
                      Day Breakdown: {selectedHeatmapDay.date}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedHeatmapDay.totalMinutes} minutes recorded across{' '}
                      {selectedHeatmapDay.count} session{selectedHeatmapDay.count !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab('log')}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-medium hover:bg-sky-500/20 transition self-start sm:self-auto"
                  >
                    <span>View in Log</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PRODUCTIVITY TRENDS & BREAKDOWN                   */}
        {/* ======================================================== */}
        {activeTab === 'trends' && analytics && (
          <div className="space-y-6">
            {/* Period Selector Bar */}
            <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs font-semibold text-slate-300">Analysis Timeframe:</span>
              <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  onClick={() => setAnalyticsPeriod('week')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    analyticsPeriod === 'week'
                      ? 'bg-sky-500 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setAnalyticsPeriod('month')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    analyticsPeriod === 'month'
                      ? 'bg-sky-500 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Last 30 Days
                </button>
              </div>
            </div>

            {/* Comparison Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-2">
                <p className="text-xs font-medium text-slate-400">Total Recorded Time</p>
                <div className="flex items-baseline space-x-2">
                  <p className="text-2xl font-black text-white">{analytics.totalHours} hrs</p>
                  <span className="text-xs text-slate-400">({analytics.totalMinutes}m)</span>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-2">
                <p className="text-xs font-medium text-slate-400">Vs. Previous {analyticsPeriod}</p>
                <div className="flex items-center space-x-2">
                  {analytics.percentageChange >= 0 ? (
                    <div className="inline-flex items-center space-x-1 text-emerald-400 font-bold text-lg">
                      <TrendingUp className="w-5 h-5" />
                      <span>+{analytics.percentageChange}%</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center space-x-1 text-rose-400 font-bold text-lg">
                      <TrendingDown className="w-5 h-5" />
                      <span>{analytics.percentageChange}%</span>
                    </div>
                  )}
                  <span className="text-xs text-slate-400">
                    ({analytics.previousPeriodDeltaMinutes > 0 ? `+` : ''}
                    {analytics.previousPeriodDeltaMinutes}m)
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-2">
                <p className="text-xs font-medium text-slate-400">Rhythm Consistency</p>
                <div className="flex items-baseline space-x-2">
                  <p className="text-2xl font-black text-white">
                    {analytics.consistency.consistencyPercentage}%
                  </p>
                  <span className="text-xs text-slate-400">
                    ({analytics.consistency.activeDays}/{analytics.consistency.totalDaysInPeriod}{' '}
                    days)
                  </span>
                </div>
              </div>
            </div>

            {/* Category Distribution Grid */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-sky-400" />
                <span>Time Distribution by Category</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {analytics.categories.map((cat) => {
                  const col = CATEGORY_COLORS[cat.category] || CATEGORY_COLORS.OTHER;
                  return (
                    <div
                      key={cat.category}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${col.bg} ${col.text} border ${col.border}`}
                        >
                          {cat.category}
                        </span>
                        <span className="text-xs font-bold text-white">{cat.percentage}%</span>
                      </div>

                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-500 rounded-full transition-all duration-500"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>

                      <p className="text-[11px] text-slate-400">
                        {cat.totalHours} hrs ({cat.totalMinutes} mins)
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily Rhythm Trends */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span>Daily Minutes Trend</span>
              </h2>

              <div className="space-y-2">
                {analytics.dailyTrends.map((d) => (
                  <div
                    key={d.date}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-slate-400">{d.date}</span>
                      {d.primaryCategory && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-semibold">
                          {d.primaryCategory}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 font-mono">
                      <span className="text-slate-400">{d.sessionCount} sessions</span>
                      <span className="font-bold text-sky-400">{d.totalMinutes}m</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* LOG ACTIVITY MODAL                                       */}
        {/* ======================================================== */}
        {showLogModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white">
                  {editingActivity ? 'Edit Activity Session' : 'Log Focused Activity'}
                </h3>
                <button
                  onClick={() => setShowLogModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveActivity} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Activity Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Operating Systems Paging Study"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value as ActivityCategory })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="STUDY">Study</option>
                      <option value="COLLEGE">College</option>
                      <option value="WORK">Work</option>
                      <option value="PERSONAL">Personal</option>
                      <option value="EXERCISE">Exercise</option>
                      <option value="LEISURE">Leisure</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      required
                      value={formStartTimeStr}
                      onChange={(e) => setFormStartTimeStr(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      required
                      value={formEndTimeStr}
                      onChange={(e) => setFormEndTimeStr(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Associated Task (Optional)
                  </label>
                  <select
                    value={formData.taskId || ''}
                    onChange={(e) => setFormData({ ...formData, taskId: e.target.value || null })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="">None (General Activity)</option>
                    {availableTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Key concepts covered, solved problems..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="completedAsPlanned"
                    checked={formData.completedAsPlanned}
                    onChange={(e) =>
                      setFormData({ ...formData, completedAsPlanned: e.target.checked })
                    }
                    className="rounded border-slate-800 bg-slate-950 text-sky-500 focus:ring-sky-500"
                  />
                  <label htmlFor="completedAsPlanned" className="text-xs text-slate-300">
                    Completed as planned (marks task complete if linked)
                  </label>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowLogModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition shadow-md shadow-sky-500/20"
                  >
                    {editingActivity ? 'Update Session' : 'Save Session'}
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
