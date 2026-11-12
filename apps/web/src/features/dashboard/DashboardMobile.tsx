import { Link } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { useTheme } from '../../context/ThemeContext';
import {
  Clock,
  ArrowRight,
  CheckSquare,
  Calendar,
  Sparkles,
  Flame,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
} from 'lucide-react';
import { formatTimeRange } from '@tempo/shared';
import { PWAInstallBanner } from '../../components/PWAInstallBanner';
import { TempoAnimation } from '../../components/TempoAnimation';
import { UseDashboardReturn } from './useDashboard';

export function DashboardMobile(props: UseDashboardReturn) {
  const {
    user,
    preference,
    taskOverview,
    recentTasks,
    heatmapStats,
    planningStatus,
    todayFormatted,
    nextActivity,
    upcomingSchedulePreview,
    totalTasksCount,
    taskProgressPercent,
    showRhythmDetails,
    setShowRhythmDetails,
  } = props;

  const { isDaytime } = useTheme();

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#181818] text-[#080808] dark:text-[#F5F5F5] font-interface transition-colors">
      <Navbar />

      <main className="flex-1 max-w-lg mx-auto px-5 py-6 space-y-5 pb-28">
        {/* Header Greeting & Day/Night Celestial Rhythm Animation */}
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <p className="text-[11px] font-semibold text-[#777777] dark:text-[#929292] uppercase tracking-wider">
              {todayFormatted}
            </p>
            <h1 className="font-brand text-2xl font-bold text-[#080808] dark:text-[#F5F5F5] tracking-tight truncate">
              Hello, {user?.name ? user.name.split(' ')[0] : 'there'}.
            </h1>
          </div>
          <div
            className="shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-[#FFFFFF] dark:bg-[#181818] border border-[#EAEAEA] dark:border-[#383838] p-1 shadow-2xs"
            title={isDaytime ? 'Daytime rhythm' : 'Nighttime rhythm'}
          >
            <TempoAnimation
              name={isDaytime ? 'sun' : 'moon'}
              alt={isDaytime ? 'Daytime sun animation' : 'Nighttime moon animation'}
              size={52}
              fallback={
                isDaytime ? (
                  <Sun className="w-7 h-7 text-[#080808] dark:text-[#F5F5F5]" />
                ) : (
                  <Moon className="w-7 h-7 text-[#080808] dark:text-[#F5F5F5]" />
                )
              }
            />
          </div>
        </div>

        {/* Tomorrow's Plan Banner (if ready) */}
        {planningStatus?.tomorrowPlanStatus === 'READY' && (
          <div className="bg-[#FFFFFF] dark:bg-[#181818] border border-[#080808] dark:border-[#383838] rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#080808] dark:bg-[#F5F5F5] shrink-0" />
              <p className="text-xs font-semibold text-[#080808] dark:text-[#F5F5F5] truncate">
                Tomorrow's schedule is prepared
              </p>
            </div>
            <Link
              to="/schedule"
              className="text-xs font-bold underline shrink-0 hover:opacity-75 transition-opacity py-1 px-2 text-[#080808] dark:text-[#F5F5F5]"
            >
              Review
            </Link>
          </div>
        )}

        {/* Next Activity Hero Card */}
        {nextActivity ? (
          <div className="bg-[#FFFFFF] dark:bg-[#181818] border border-[#080808] dark:border-[#383838] rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs text-[#777777] dark:text-[#929292]">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Up Next
              </span>
              <span className="font-mono font-medium">
                {nextActivity.timeDisplay || formatTimeRange(nextActivity.startTime, nextActivity.endTime)}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#080808] dark:text-[#F5F5F5] leading-snug">
                {nextActivity.title}
              </h2>
              {nextActivity.location && (
                <p className="text-xs text-[#555555] dark:text-[#BDBDBD] mt-1 line-clamp-2">
                  📍 {nextActivity.location}
                </p>
              )}
            </div>
            <div className="pt-1 flex items-center justify-between">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F5F5F5] dark:bg-[#202020] text-[#555555] dark:text-[#BDBDBD] border border-[#EAEAEA] dark:border-[#383838] uppercase tracking-wider">
                {nextActivity.sourceType || 'Event'}
              </span>
              <Link
                to="/schedule"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#080808] dark:text-[#F5F5F5] hover:opacity-75 transition-opacity py-1"
              >
                <span>Open Daily Schedule</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-[#FFFFFF] dark:bg-[#181818] border border-[#EAEAEA] dark:border-[#383838] rounded-2xl p-5 text-center space-y-2">
            <Clock className="w-6 h-6 mx-auto text-[#777777] dark:text-[#929292]" />
            <p className="text-sm font-semibold text-[#080808] dark:text-[#F5F5F5]">
              No upcoming events right now
            </p>
            <p className="text-xs text-[#777777] dark:text-[#929292]">
              Generate or review your daily schedule to start your rhythm.
            </p>
            <div className="pt-2">
              <Link
                to="/schedule"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-[#080808] dark:bg-[#282828] hover:bg-[#171717] dark:hover:bg-[#303030] text-[#FFFFFF] dark:text-[#F5F5F5] border border-transparent dark:border-[#383838] text-xs font-semibold rounded-xl transition-colors"
              >
                Go to Schedule
              </Link>
            </div>
          </div>
        )}

        {/* Progress & Focus Summary */}
        <div className="bg-[#FFFFFF] dark:bg-[#181818] border border-[#EAEAEA] dark:border-[#383838] rounded-2xl p-4 divide-y divide-[#EFEFEF] dark:divide-[#303030] shadow-xs">
          {/* Progress bar item */}
          <div className="pb-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#080808] dark:text-[#F5F5F5]">Task Progress</span>
              <span className="font-mono text-[#777777] dark:text-[#929292]">
                {taskOverview.completed} / {totalTasksCount} completed ({taskProgressPercent}%)
              </span>
            </div>
            <div className="w-full bg-[#EAEAEA] dark:bg-[#202020] rounded-full h-1.5 overflow-hidden border border-transparent dark:border-[#383838]">
              <div
                className="bg-[#080808] dark:bg-[#F5F5F5] h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${taskProgressPercent}%` }}
              />
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="pt-3.5 grid grid-cols-2 gap-3">
            <Link
              to="/tasks"
              className="p-3 rounded-xl bg-[#FAFAFA] dark:bg-[#202020] border border-[#EAEAEA] dark:border-[#383838] hover:border-[#080808] dark:hover:border-[#929292] transition-colors flex flex-col"
            >
              <div className="flex items-center justify-between text-[#777777] dark:text-[#929292] mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  Active
                </span>
                <CheckSquare className="w-3.5 h-3.5 text-[#080808] dark:text-[#F5F5F5]" />
              </div>
              <span className="text-xl font-bold font-mono text-[#080808] dark:text-[#F5F5F5]">
                {taskOverview.totalActive}
              </span>
              <span className="text-[11px] text-[#777777] dark:text-[#929292] mt-0.5">
                {taskOverview.overdue > 0 ? `${taskOverview.overdue} overdue` : 'On track'}
              </span>
            </Link>

            <Link
              to="/calendar"
              className="p-3 rounded-xl bg-[#FAFAFA] dark:bg-[#202020] border border-[#EAEAEA] dark:border-[#383838] hover:border-[#080808] dark:hover:border-[#929292] transition-colors flex flex-col"
            >
              <div className="flex items-center justify-between text-[#777777] dark:text-[#929292] mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  Today
                </span>
                <Calendar className="w-3.5 h-3.5 text-[#080808] dark:text-[#F5F5F5]" />
              </div>
              <span className="text-xl font-bold font-mono text-[#080808] dark:text-[#F5F5F5]">
                {upcomingSchedulePreview.length + (nextActivity ? 1 : 0)}
              </span>
              <span className="text-[11px] text-[#777777] dark:text-[#929292] mt-0.5">
                Scheduled items
              </span>
            </Link>
          </div>
        </div>

        {/* Day Flow Preview (Next upcoming commitments) */}
        {upcomingSchedulePreview.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-[#080808] dark:text-[#F5F5F5] uppercase tracking-wider">
                Upcoming Today
              </h3>
              <Link
                to="/schedule"
                className="text-xs text-[#777777] dark:text-[#929292] hover:text-[#080808] dark:hover:text-[#F5F5F5] transition-colors"
              >
                View all
              </Link>
            </div>
            <div className="bg-[#FFFFFF] dark:bg-[#181818] border border-[#EAEAEA] dark:border-[#383838] rounded-2xl divide-y divide-[#EFEFEF] dark:divide-[#303030] overflow-hidden shadow-xs">
              {upcomingSchedulePreview.map((item, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#080808] dark:text-[#F5F5F5] truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-[#777777] dark:text-[#929292] font-mono mt-0.5">
                      {item.timeDisplay || formatTimeRange(item.startTime, item.endTime)}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase font-semibold text-[#777777] dark:text-[#929292] bg-[#FAFAFA] dark:bg-[#202020] border border-[#EAEAEA] dark:border-[#383838] px-2 py-0.5 rounded shrink-0">
                    {item.sourceType || 'Event'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Priority Focus Tasks */}
        {recentTasks.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-[#080808] dark:text-[#F5F5F5] uppercase tracking-wider">
                Priority Tasks
              </h3>
              <Link
                to="/tasks"
                className="text-xs text-[#777777] dark:text-[#929292] hover:text-[#080808] dark:hover:text-[#F5F5F5] transition-colors"
              >
                All tasks
              </Link>
            </div>
            <div className="bg-[#FFFFFF] dark:bg-[#181818] border border-[#EAEAEA] dark:border-[#383838] rounded-2xl divide-y divide-[#EFEFEF] dark:divide-[#303030] overflow-hidden shadow-xs">
              {recentTasks.slice(0, 3).map((task) => (
                <Link
                  key={task.id}
                  to="/tasks"
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#FAFAFA] dark:hover:bg-[#202020] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#080808] dark:text-[#F5F5F5] truncate">
                      {task.title}
                    </p>
                    <p className="text-[11px] text-[#777777] dark:text-[#929292] mt-0.5">
                      {task.category?.name || 'General'} · {task.estimatedMinutes}m
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase shrink-0 ${
                      task.priority === 'URGENT'
                        ? 'bg-[#080808] dark:bg-[#282828] text-[#FFFFFF] dark:text-[#F5F5F5] border-transparent dark:border-[#383838]'
                        : task.priority === 'HIGH'
                        ? 'bg-[#F5F5F5] dark:bg-[#282828] text-[#080808] dark:text-[#F5F5F5] border-[#CCCCCC] dark:border-[#383838]'
                        : 'bg-[#FAFAFA] dark:bg-[#202020] text-[#777777] dark:text-[#929292] border-[#EAEAEA] dark:border-[#383838]'
                    }`}
                  >
                    {task.priority}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Rhythm Baseline / Streak (Collapsible on mobile) */}
        <div className="bg-[#FFFFFF] dark:bg-[#181818] border border-[#EAEAEA] dark:border-[#383838] rounded-2xl overflow-hidden shadow-xs">
          <button
            onClick={() => setShowRhythmDetails(!showRhythmDetails)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-[#FAFAFA] dark:hover:bg-[#202020] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[#080808] dark:text-[#F5F5F5]" />
              <div>
                <p className="text-xs font-bold text-[#080808] dark:text-[#F5F5F5]">Rhythm & Streak</p>
                <p className="text-[11px] text-[#777777] dark:text-[#929292]">
                  {heatmapStats ? `${heatmapStats.currentStreakDays} day streak` : 'Daily habits'}
                </p>
              </div>
            </div>
            {showRhythmDetails ? (
              <ChevronUp className="w-4 h-4 text-[#777777] dark:text-[#929292]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#777777] dark:text-[#929292]" />
            )}
          </button>

          {showRhythmDetails && (
            <div className="p-4 pt-1 border-t border-[#EFEFEF] dark:border-[#303030] space-y-3 bg-[#FAFAFA]/50 dark:bg-[#202020]/50">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-[#FFFFFF] dark:bg-[#181818] rounded-xl border border-[#EAEAEA] dark:border-[#383838]">
                  <span className="text-[10px] text-[#777777] dark:text-[#929292] uppercase font-semibold">
                    Current Streak
                  </span>
                  <p className="text-lg font-bold font-mono text-[#080808] dark:text-[#F5F5F5] mt-0.5 flex items-center gap-1">
                    <Flame className="w-4 h-4 text-[#080808] dark:text-[#F5F5F5]" />
                    {heatmapStats?.currentStreakDays || 0}d
                  </p>
                </div>
                <div className="p-2.5 bg-[#FFFFFF] dark:bg-[#181818] rounded-xl border border-[#EAEAEA] dark:border-[#383838]">
                  <span className="text-[10px] text-[#777777] dark:text-[#929292] uppercase font-semibold">
                    Longest Streak
                  </span>
                  <p className="text-lg font-bold font-mono text-[#080808] dark:text-[#F5F5F5] mt-0.5">
                    {heatmapStats?.longestStreakDays || 0}d
                  </p>
                </div>
              </div>

              {preference && (
                <div className="p-3 bg-[#FFFFFF] dark:bg-[#181818] rounded-xl border border-[#EAEAEA] dark:border-[#383838] space-y-1.5 text-xs">
                  <span className="text-[10px] text-[#777777] dark:text-[#929292] uppercase font-semibold tracking-wider">
                    Routine Baseline
                  </span>
                  <div className="flex justify-between text-[#555555] dark:text-[#BDBDBD]">
                    <span>Wake & Sleep</span>
                    <span className="font-mono text-[#080808] dark:text-[#F5F5F5]">
                      {preference.wakeTime} – {preference.sleepTime}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#555555] dark:text-[#BDBDBD]">
                    <span>Work Window</span>
                    <span className="font-mono text-[#080808] dark:text-[#F5F5F5]">
                      {preference.workStartTime} – {preference.workEndTime}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <PWAInstallBanner />
      </main>
    </div>
  );
}
