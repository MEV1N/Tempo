import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { apiRequest } from '../api/client';
import {
  Sun,
  Briefcase,
  Coffee,
  Clock,
  ArrowRight,
  CheckSquare,
  Calendar,
  Sparkles,
  Flame,
  BarChart3,
} from 'lucide-react';
import {
  TaskItemDTO,
  CalendarViewItemDTO,
  ActivitySessionDTO,
  ProductivityHeatmapDTO,
  PlanningStatusDTO,
} from '@tempo/shared';
import { PWAInstallBanner } from '../components/PWAInstallBanner';

export function DashboardPage() {
  const { user, preference } = useAuth();
  const [taskOverview, setTaskOverview] = useState<{
    totalActive: number;
    completed: number;
    overdue: number;
    upcoming: number;
  }>({ totalActive: 0, completed: 0, overdue: 0, upcoming: 0 });

  const [recentTasks, setRecentTasks] = useState<TaskItemDTO[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<CalendarViewItemDTO[]>([]);
  const [todayActivities, setTodayActivities] = useState<ActivitySessionDTO[]>([]);
  const [heatmapStats, setHeatmapStats] = useState<ProductivityHeatmapDTO | null>(null);
  const [planningStatus, setPlanningStatus] = useState<PlanningStatusDTO | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const [overviewRes, tasksRes, calRes, actRes, heatRes, planRes] = await Promise.all([
          apiRequest<any>('/api/tasks/overview').catch(() => null),
          apiRequest<{ tasks: TaskItemDTO[] }>('/api/tasks?limit=4&status=TODO').catch(() => null),
          apiRequest<CalendarViewItemDTO[]>(
            `/api/calendar/view?startDate=${todayStr}T00:00:00.000Z&endDate=${todayStr}T23:59:59.999Z`
          ).catch(() => null),
          apiRequest<ActivitySessionDTO[]>(`/api/activities?date=${todayStr}`).catch(() => []),
          apiRequest<ProductivityHeatmapDTO>('/api/analytics/heatmap').catch(() => null),
          apiRequest<PlanningStatusDTO>('/api/planning/status').catch(() => null),
        ]);

        if (overviewRes) setTaskOverview(overviewRes);
        if (tasksRes?.tasks) setRecentTasks(tasksRes.tasks);
        if (calRes) setTodaySchedule(calRes);
        if (actRes) setTodayActivities(actRes);
        if (heatRes) setHeatmapStats(heatRes);
        if (planRes) setPlanningStatus(planRes);
      } catch (err) {
        // Silently handle if initial load
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Welcome Hero */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-sky-950/30 border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phase 6: PWA, Nightly Planning & Push Notifications Active</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Welcome back, {user?.name || 'Friend'}!
            </h1>

            <p className="text-slate-400 text-sm leading-relaxed">
              Find your rhythm. Organize tasks, track deadlines, manage your weekly class timetable,
              and let the intelligent scheduler calculate your optimal daily schedule.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                to="/schedule"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Schedule</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <Link
                to="/analytics"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
              >
                <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
                <span>Activity & Analytics</span>
              </Link>

              <Link
                to="/tasks"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
              >
                <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                <span>Go to Tasks</span>
              </Link>

              <Link
                to="/calendar"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
              >
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>Timetable & Calendar</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Phase 6 PWA Install Banner */}
        <PWAInstallBanner />

        {/* Phase 6 Tomorrow's Plan Indicator */}
        {planningStatus?.tomorrowPlanStatus === 'READY' && (
          <div className="bg-gradient-to-r from-sky-950/80 via-slate-900 to-indigo-950/80 border border-sky-500/30 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Tomorrow's Plan is Ready ({planningStatus.tomorrowDate})</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-300 font-semibold uppercase">
                    Proposed
                  </span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tempo has prepared your schedule blocks for tomorrow. Review, edit, or confirm
                  your day.
                </p>
              </div>
            </div>

            <Link
              to="/schedule"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition shadow-md shadow-sky-500/20 shrink-0 self-start sm:self-auto"
            >
              <span>Review Schedule</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Phase 6 PWA Install Banner */}
        <PWAInstallBanner />

        {/* Phase 6 Tomorrow's Plan Indicator */}
        {planningStatus?.tomorrowPlanStatus === 'READY' && (
          <div className="bg-gradient-to-r from-sky-950/80 via-slate-900 to-indigo-950/80 border border-sky-500/30 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Tomorrow's Plan is Ready ({planningStatus.tomorrowDate})</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-300 font-semibold uppercase">
                    Proposed
                  </span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tempo has prepared your schedule blocks for tomorrow. Review, edit, or confirm
                  your day.
                </p>
              </div>
            </div>

            <Link
              to="/schedule"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition shadow-md shadow-sky-500/20 shrink-0 self-start sm:self-auto"
            >
              <span>Review Schedule</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Phase 2 Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Tasks Snapshot */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-sky-400" />
                <span>Tasks Overview</span>
              </h2>
              <Link to="/tasks" className="text-xs text-sky-400 hover:text-sky-300 font-medium">
                View all ({taskOverview.totalActive})
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <p className="text-[11px] text-slate-400">Active</p>
                <p className="text-xl font-bold text-white mt-0.5">{taskOverview.totalActive}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <p className="text-[11px] text-emerald-400">Done</p>
                <p className="text-xl font-bold text-emerald-400 mt-0.5">
                  {taskOverview.completed}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <p className="text-[11px] text-rose-400">Overdue</p>
                <p className="text-xl font-bold text-rose-400 mt-0.5">{taskOverview.overdue}</p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-semibold text-slate-400">Next Tasks</p>
              {recentTasks.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">No pending tasks.</p>
              ) : (
                recentTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between"
                  >
                    <span className="font-medium text-slate-200 truncate">{t.title}</span>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                      {t.estimatedMinutes}m
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Today's Schedule Snapshot */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Today's Classes & Events</span>
              </h2>
              <Link
                to="/calendar"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Full Calendar
              </Link>
            </div>

            <div className="space-y-2">
              {todaySchedule.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No classes or fixed events scheduled for today.
                </p>
              ) : (
                todaySchedule.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl border text-xs flex items-center justify-between"
                    style={{
                      backgroundColor: `${item.color}10`,
                      borderColor: `${item.color}30`,
                    }}
                  >
                    <div>
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="text-[10px] text-slate-400">{item.timeDisplay}</p>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                      style={{ color: item.color }}
                    >
                      {item.itemType}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Phase 5 Activity & Productivity Snapshot */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Activity & Productivity Snapshot</span>
            </h2>
            <Link to="/analytics" className="text-xs text-sky-400 hover:text-sky-300 font-medium">
              View Analytics & Heatmap &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <p className="text-[11px] text-amber-400 font-semibold flex items-center justify-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                Current Streak
              </p>
              <p className="text-xl font-bold text-white mt-1">
                {heatmapStats?.currentStreakDays || 0}{' '}
                <span className="text-xs font-normal text-slate-400">days</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <p className="text-[11px] text-sky-400 font-semibold">Today's Sessions</p>
              <p className="text-xl font-bold text-white mt-1">{todayActivities.length}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <p className="text-[11px] text-indigo-400 font-semibold">Today's Minutes</p>
              <p className="text-xl font-bold text-white mt-1">
                {todayActivities.reduce((s, a) => s + a.durationMinutes, 0)}m
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <p className="text-[11px] text-emerald-400 font-semibold">Active Days (Year)</p>
              <p className="text-xl font-bold text-white mt-1">
                {heatmapStats?.activeDaysCount || 0}
              </p>
            </div>
          </div>
        </div>

        {/* User Routine Overview */}
        {preference && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold tracking-tight text-white">
                Calibrated Daily Rhythm
              </h2>
              <span className="text-xs font-mono text-slate-500">
                Timezone: {preference.timezone}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-medium text-slate-400">Sleep Cycle</h3>
                  <p className="text-lg font-bold text-white mt-0.5">
                    {preference.wakeTime} - {preference.sleepTime}
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-medium text-slate-400">Work Hours</h3>
                  <p className="text-lg font-bold text-white mt-0.5">
                    {preference.preferredWorkStart} - {preference.preferredWorkEnd}
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-medium text-slate-400">Meals</h3>
                  <p className="text-xs font-mono text-slate-300 mt-1">
                    B: {preference.breakfastTime} | L: {preference.lunchTime} | D:{' '}
                    {preference.dinnerTime}
                  </p>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-medium text-slate-400">Leisure & Breaks</h3>
                  <p className="text-sm font-semibold text-white mt-1">
                    {preference.dailyLeisureTarget}m leisure / {preference.preferredBreakDuration}m
                    breaks
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
