import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../api/client';
import {
  TaskItemDTO,
  CalendarViewItemDTO,
  ActivitySessionDTO,
  ProductivityHeatmapDTO,
  PlanningStatusDTO,
} from '@tempo/shared';

export interface UseDashboardReturn {
  user: any;
  preference: any;
  taskOverview: {
    totalActive: number;
    completed: number;
    overdue: number;
    upcoming: number;
  };
  recentTasks: TaskItemDTO[];
  todaySchedule: CalendarViewItemDTO[];
  todayActivities: ActivitySessionDTO[];
  heatmapStats: ProductivityHeatmapDTO | null;
  planningStatus: PlanningStatusDTO | null;
  todayFormatted: string;
  nextActivity: CalendarViewItemDTO | null;
  upcomingSchedulePreview: CalendarViewItemDTO[];
  totalTasksCount: number;
  taskProgressPercent: number;
  showRhythmDetails: boolean;
  setShowRhythmDetails: (show: boolean | ((p: boolean) => boolean)) => void;
}

export function useDashboard(): UseDashboardReturn {
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
  const [showRhythmDetails, setShowRhythmDetails] = useState<boolean>(false);

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
      } catch {
        // Silently handle
      }
    };

    fetchDashboardData();
  }, []);

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const nextActivity = useMemo(() => {
    if (!todaySchedule || todaySchedule.length === 0) return null;
    const nowMs = Date.now();
    const sorted = [...todaySchedule].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    const upcoming = sorted.find((item) => new Date(item.endTime).getTime() > nowMs);
    return upcoming || sorted[0];
  }, [todaySchedule]);

  const upcomingSchedulePreview = useMemo(() => {
    if (!todaySchedule || todaySchedule.length === 0) return [];
    const nowMs = Date.now();
    return [...todaySchedule]
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .filter((item) => new Date(item.endTime).getTime() > nowMs)
      .slice(0, 2);
  }, [todaySchedule]);

  const totalTasksCount = taskOverview.totalActive + taskOverview.completed;
  const taskProgressPercent =
    totalTasksCount > 0 ? Math.round((taskOverview.completed / totalTasksCount) * 100) : 0;

  return {
    user,
    preference,
    taskOverview,
    recentTasks,
    todaySchedule,
    todayActivities,
    heatmapStats,
    planningStatus,
    todayFormatted,
    nextActivity,
    upcomingSchedulePreview,
    totalTasksCount,
    taskProgressPercent,
    showRhythmDetails,
    setShowRhythmDetails,
  };
}

