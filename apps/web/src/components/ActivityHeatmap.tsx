import { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../api/client';
import { ProductivityHeatmapDTO, HeatmapDayDTO } from '@tempo/shared';
import { Flame, TrendingUp, Clock, CheckCircle2, Loader2 } from 'lucide-react';

export const HEATMAP_INTENSITY_CLASSES: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-[#F5F5F5] dark:bg-[#202020] border border-[#E5E5E5] dark:border-[#383838]',
  1: 'bg-[#D9D9D9] dark:bg-[#404040] border border-[#CCCCCC] dark:border-[#555555]',
  2: 'bg-[#777777] dark:bg-[#777777] border border-[#666666] dark:border-[#888888]',
  3: 'bg-[#404040] dark:bg-[#B0B0B0] border border-[#333333] dark:border-[#CCCCCC]',
  4: 'bg-[#080808] dark:bg-[#F5F5F5] border border-[#000000] dark:border-[#FFFFFF]',
};

interface ActivityHeatmapProps {
  onSelectDate?: (date: string) => void;
  selectedDate?: string;
  className?: string;
}

export function ActivityHeatmap({ onSelectDate, selectedDate, className = '' }: ActivityHeatmapProps) {
  const [heatmap, setHeatmap] = useState<ProductivityHeatmapDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState<HeatmapDayDTO | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    apiRequest<ProductivityHeatmapDTO>('/api/analytics/heatmap')
      .then((data) => {
        if (isMounted && data) {
          setHeatmap(data);
        }
      })
      .catch(() => {
        // Fallback gracefully on network / offline error
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

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

  if (loading) {
    return (
      <div className={`bg-white dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#383838] rounded-2xl p-6 shadow-sm flex items-center justify-center min-h-[220px] ${className}`}>
        <div className="flex items-center space-x-2 text-[#777777] dark:text-[#929292] text-xs">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading activity heatmap...</span>
        </div>
      </div>
    );
  }

  if (!heatmap) {
    return (
      <div className={`bg-white dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#383838] rounded-2xl p-6 shadow-sm text-center py-8 ${className}`}>
        <p className="text-xs text-[#777777] dark:text-[#929292]">No activity data recorded yet.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Streak & Aggregate Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#383838] rounded-2xl p-4 sm:p-5 space-y-1.5 shadow-xs">
          <div className="flex items-center space-x-2 text-[#080808] dark:text-[#F5F5F5]">
            <Flame className="w-4 h-4 text-[#080808] dark:text-[#F5F5F5]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#777777] dark:text-[#929292]">
              Current Streak
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#080808] dark:text-[#F5F5F5]">
            {heatmap.currentStreakDays}{' '}
            <span className="text-xs font-normal text-[#777777] dark:text-[#929292]">days</span>
          </p>
        </div>

        <div className="bg-white dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#383838] rounded-2xl p-4 sm:p-5 space-y-1.5 shadow-xs">
          <div className="flex items-center space-x-2 text-[#080808] dark:text-[#F5F5F5]">
            <TrendingUp className="w-4 h-4 text-[#080808] dark:text-[#F5F5F5]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#777777] dark:text-[#929292]">
              Longest Streak
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#080808] dark:text-[#F5F5F5]">
            {heatmap.longestStreakDays}{' '}
            <span className="text-xs font-normal text-[#777777] dark:text-[#929292]">days</span>
          </p>
        </div>

        <div className="bg-white dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#383838] rounded-2xl p-4 sm:p-5 space-y-1.5 shadow-xs">
          <div className="flex items-center space-x-2 text-[#080808] dark:text-[#F5F5F5]">
            <Clock className="w-4 h-4 text-[#080808] dark:text-[#F5F5F5]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#777777] dark:text-[#929292]">
              Total Hours
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#080808] dark:text-[#F5F5F5]">
            {heatmap.totalRecordedHours}{' '}
            <span className="text-xs font-normal text-[#777777] dark:text-[#929292]">hrs</span>
          </p>
        </div>

        <div className="bg-white dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#383838] rounded-2xl p-4 sm:p-5 space-y-1.5 shadow-xs">
          <div className="flex items-center space-x-2 text-[#080808] dark:text-[#F5F5F5]">
            <CheckCircle2 className="w-4 h-4 text-[#080808] dark:text-[#F5F5F5]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#777777] dark:text-[#929292]">
              Active Days
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#080808] dark:text-[#F5F5F5]">
            {heatmap.activeDaysCount}{' '}
            <span className="text-xs font-normal text-[#777777] dark:text-[#929292]">/ 365</span>
          </p>
        </div>
      </div>

      {/* Heatmap Grid Visualizer */}
      <div className="bg-white dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#383838] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs overflow-x-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EFEFEF] dark:border-[#383838] gap-2">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <h2 className="text-sm font-bold text-[#080808] dark:text-[#F5F5F5] flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#080808] dark:text-[#F5F5F5]" />
              <span>365-Day Activity Heatmap</span>
            </h2>
            <span className="sm:hidden text-[10px] text-[#777777] dark:text-[#929292] font-medium">Swipe &rarr;</span>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] text-[#777777] dark:text-[#929292] self-end sm:self-auto">
            <span>Less</span>
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-[#F5F5F5] dark:bg-[#282828] border border-[#E5E5E5] dark:border-[#383838]" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-[#D9D9D9] dark:bg-[#404040] border border-[#CCCCCC] dark:border-[#555555]" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-[#777777] dark:bg-[#777777] border border-[#666666] dark:border-[#888888]" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-[#404040] dark:bg-[#B3B3B3] border border-[#333333] dark:border-[#CCCCCC]" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-[#080808] dark:bg-[#F2F2F2] border border-[#000000] dark:border-[#FFFFFF]" />
            <span>More</span>
          </div>
        </div>

        {/* 52-week grid container */}
        <div className="pt-1 overflow-x-auto pb-2 touch-pan-x">
          <div className="flex gap-1.5 min-w-[740px] pb-1">
            {heatmapWeeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1.5">
                {week.map((day) => (
                  <button
                    key={day.date}
                    onClick={() => {
                      setSelectedHeatmapDay(day);
                      if (onSelectDate) onSelectDate(day.date);
                    }}
                    className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-xs transition hover:scale-125 focus:outline-hidden ${
                      HEATMAP_INTENSITY_CLASSES[day.intensity]
                    } ${
                      selectedDate === day.date || selectedHeatmapDay?.date === day.date
                        ? 'ring-2 ring-[#080808] dark:ring-[#F5F5F5]'
                        : ''
                    }`}
                    title={`${day.date}: ${day.totalMinutes}m (${day.count} sessions)`}
                    aria-label={`${day.date}: ${day.totalMinutes} minutes`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Selected Day Info Callout */}
        {selectedHeatmapDay && (
          <div className="mt-3 p-3.5 rounded-xl bg-[#FAFAFA] dark:bg-[#282828] border border-[#D9D9D9] dark:border-[#383838] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <p className="font-bold text-[#080808] dark:text-[#F5F5F5]">
                Day Breakdown: {selectedHeatmapDay.date}
              </p>
              <p className="text-[#777777] dark:text-[#929292] mt-0.5">
                {selectedHeatmapDay.totalMinutes} minutes recorded across {selectedHeatmapDay.count} session
                {selectedHeatmapDay.count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

