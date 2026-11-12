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
  MapPin,
  Sun,
  Moon,
} from 'lucide-react';
import { formatTimeRange } from '@tempo/shared';
import { PWAInstallBanner } from '../../components/PWAInstallBanner';
import { TempoAnimation } from '../../components/TempoAnimation';
import { UseDashboardReturn } from './useDashboard';

export function DashboardDesktop(props: UseDashboardReturn) {
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
  } = props;

  const { resolvedTheme } = useTheme();
  // Connected directly to automatic day/night theme system
  const isDaytime = resolvedTheme === 'light';

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#121212] text-[#080808] dark:text-[#F3F3F3] font-interface transition-colors">
      <Navbar />

      <div className="md:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 max-w-5xl w-full mx-auto px-8 py-8 space-y-6 pb-12">
          {/* Header Greeting & Day/Night Celestial Rhythm Animation */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-[11px] font-semibold text-[#777777] dark:text-[#A3A3A3] uppercase tracking-wider">
                {todayFormatted}
              </p>
              <h1 className="font-brand text-4xl font-bold text-[#080808] dark:text-[#F3F3F3] tracking-tight">
                Hello, {user?.name ? user.name.split(' ')[0] : 'there'}.
              </h1>
            </div>

            <div
              className="shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FFFFFF] dark:bg-[#1A1A1A] border border-[#EAEAEA] dark:border-[#2E2E2E] p-1.5 shadow-xs"
              title={isDaytime ? 'Daytime rhythm' : 'Nighttime rhythm'}
            >
              <TempoAnimation
                name={isDaytime ? 'sun' : 'moon'}
                alt={isDaytime ? 'Daytime sun animation' : 'Nighttime moon animation'}
                size={40}
                fallback={
                  isDaytime ? (
                    <Sun className="w-6 h-6 text-[#080808] dark:text-[#F3F3F3]" />
                  ) : (
                    <Moon className="w-6 h-6 text-[#080808] dark:text-[#F3F3F3]" />
                  )
                }
              />
            </div>
          </div>

          {/* Tomorrow's Plan Banner */}
          {planningStatus?.tomorrowPlanStatus === 'READY' && (
            <div className="bg-[#FFFFFF] dark:bg-[#181818] border border-[#080808] dark:border-[#383838] rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[#080808] dark:bg-[#F3F3F3] text-[#FFFFFF] dark:text-[#080808] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#080808] dark:text-[#F3F3F3] flex items-center gap-1.5">
                    <span>Tomorrow's Plan Ready ({planningStatus.tomorrowDate})</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#F5F5F5] dark:bg-[#262626] text-[#080808] dark:text-[#F3F3F3] font-semibold border border-[#D9D9D9] dark:border-[#383838]">
                      PROPOSED
                    </span>
                  </p>
                  <p className="text-[11px] text-[#777777] dark:text-[#A3A3A3]">
                    Calculated optimal rhythm for tomorrow based on your timetable & deadlines.
                  </p>
                </div>
              </div>

              <Link
                to="/schedule"
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#080808] dark:bg-[#F3F3F3] hover:bg-[#171717] dark:hover:bg-[#E5E5E5] text-[#FFFFFF] dark:text-[#080808] text-xs font-semibold shrink-0 transition"
              >
                <span>Review Schedule</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Primary Anchor Card: Next Upcoming Activity */}
          <div className="bg-[#FFFFFF] dark:bg-[#181818] border border-[#080808] dark:border-[#333333] rounded-2xl p-5 shadow-xs">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#777777] dark:text-[#A3A3A3] block">
                  Next Upcoming Activity
                </span>
                {nextActivity ? (
                  <>
                    <h2 className="text-xl font-bold text-[#080808] dark:text-[#F3F3F3] truncate">
                      {nextActivity.title}
                    </h2>
                    <div className="flex items-center space-x-3 text-xs text-[#404040] dark:text-[#A3A3A3]">
                      <span className="flex items-center gap-1 font-mono font-medium">
                        <Clock className="w-3.5 h-3.5 text-[#080808] dark:text-[#F3F3F3]" />
                        {nextActivity.timeDisplay ||
                          formatTimeRange(nextActivity.startTime, nextActivity.endTime)}
                      </span>
                      {nextActivity.location && (
                        <span className="flex items-center gap-1 truncate text-[#777777] dark:text-[#888888]">
                          <MapPin className="w-3.5 h-3.5" />
                          {nextActivity.location}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-bold text-[#080808] dark:text-[#F3F3F3]">No upcoming activities</h2>
                    <p className="text-xs text-[#777777] dark:text-[#A3A3A3]">
                      Your schedule is clear for the rest of today.
                    </p>
                  </>
                )}
              </div>

              <Link
                to="/schedule"
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#080808] dark:bg-[#F3F3F3] hover:bg-[#171717] dark:hover:bg-[#E5E5E5] text-[#FFFFFF] dark:text-[#080808] text-xs font-semibold shrink-0 transition shadow-xs"
              >
                <span>Open Daily Schedule</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Progress & Focus Section */}
          <div className="bg-[#FFFFFF] dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#2A2A2A] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#080808] dark:text-[#F3F3F3] flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[#080808] dark:text-[#F3F3F3]" />
                  <span>Today's Task Focus</span>
                </h3>
                <p className="text-[11px] text-[#777777] dark:text-[#A3A3A3] mt-0.5">
                  {taskOverview.completed} of {totalTasksCount} tasks completed ({taskProgressPercent}%)
                </p>
              </div>

              <Link
                to="/tasks"
                className="text-xs font-semibold text-[#080808] dark:text-[#F3F3F3] hover:underline inline-flex items-center gap-1"
              >
                <span>All Tasks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="w-full bg-[#EFEFEF] dark:bg-[#262626] h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#080808] dark:bg-[#F3F3F3] rounded-full transition-all duration-500"
                style={{ width: `${taskProgressPercent}%` }}
              />
            </div>

            <div className="divide-y divide-[#EFEFEF] dark:divide-[#262626] pt-1">
              {recentTasks.length === 0 ? (
                <div className="py-6 text-center text-[#777777] dark:text-[#888888] text-xs">
                  All caught up! No active tasks for today.
                </div>
              ) : (
                recentTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="py-3 flex items-center justify-between gap-3 first:pt-1 last:pb-1"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <div className="w-2 h-2 rounded-full bg-[#080808] dark:bg-[#F3F3F3] shrink-0" />
                      <span className="text-xs font-semibold text-[#080808] dark:text-[#F3F3F3] truncate">
                        {task.title}
                      </span>
                      {task.priority === 'URGENT' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-[#080808] dark:bg-[#F3F3F3] text-white dark:text-[#080808] shrink-0">
                          Urgent
                        </span>
                      )}
                      {task.priority === 'HIGH' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-[#F5F5F5] dark:bg-[#262626] text-[#080808] dark:text-[#F3F3F3] border border-[#080808] dark:border-[#555555] shrink-0">
                          High
                        </span>
                      )}
                    </div>

                    {task.dueDate && (
                      <span className="text-[11px] text-[#777777] dark:text-[#888888] font-mono shrink-0">
                        {new Date(task.dueDate).toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Desktop Two-Column: Upcoming Day Flow & Rhythm Snapshot */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#FFFFFF] dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#2A2A2A] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#080808] dark:text-[#F3F3F3] uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#080808] dark:text-[#F3F3F3]" />
                  <span>Upcoming Day Flow</span>
                </span>
                <Link to="/calendar" className="text-xs text-[#777777] dark:text-[#888888] hover:text-[#080808] dark:hover:text-[#F3F3F3] font-medium">
                  Full Calendar →
                </Link>
              </div>

              <div className="space-y-2">
                {upcomingSchedulePreview.length === 0 ? (
                  <p className="text-xs text-[#777777] dark:text-[#888888] py-4 text-center">
                    No further classes or events scheduled today.
                  </p>
                ) : (
                  upcomingSchedulePreview.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-[#FAFAFA] dark:bg-[#222222] border border-[#D9D9D9] dark:border-[#333333] text-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#080808] dark:text-[#F3F3F3] truncate">{item.title}</p>
                        {item.location && (
                          <p className="text-[10px] text-[#777777] dark:text-[#888888] truncate">📍 {item.location}</p>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-[#404040] dark:text-[#A3A3A3] shrink-0 font-medium">
                        {item.timeDisplay || formatTimeRange(item.startTime, item.endTime)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-[#FFFFFF] dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#2A2A2A] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#080808] dark:text-[#F3F3F3] uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-[#080808] dark:text-[#F3F3F3]" />
                  <span>Productivity Streak</span>
                </span>
                <span className="text-xs font-mono font-bold text-[#080808] dark:text-[#F3F3F3]">
                  {heatmapStats?.currentStreakDays || 0} days
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-[#FAFAFA] dark:bg-[#222222] rounded-xl border border-[#D9D9D9] dark:border-[#333333]">
                  <span className="text-[10px] text-[#777777] dark:text-[#888888] block">Wake Time</span>
                  <span className="font-bold text-[#080808] dark:text-[#F3F3F3] font-mono mt-0.5 block">
                    {preference?.wakeTime || '07:00'}
                  </span>
                </div>
                <div className="p-3 bg-[#FAFAFA] dark:bg-[#222222] rounded-xl border border-[#D9D9D9] dark:border-[#333333]">
                  <span className="text-[10px] text-[#777777] dark:text-[#888888] block">Sleep Target</span>
                  <span className="font-bold text-[#080808] dark:text-[#F3F3F3] font-mono mt-0.5 block">
                    {preference?.sleepTime || '23:00'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <PWAInstallBanner />
        </main>
      </div>
    </div>
  );
}
