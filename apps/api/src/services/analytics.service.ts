import { prisma } from '../db';
import {
  PlannedVsActualSummaryDTO,
  PlannedVsActualItemDTO,
  ProductivityHeatmapDTO,
  HeatmapDayDTO,
  ProductivityAnalyticsDTO,
  CategoryBreakdownDTO,
  DailyTrendDTO,
  ActivityCategory,
} from '@tempo/shared';

export class AnalyticsService {
  /**
   * Compares scheduled/planned blocks against actual recorded activity sessions for a given date.
   */
  async getPlannedVsActual(userId: string, date: string): Promise<PlannedVsActualSummaryDTO> {
    // 1. Fetch user schedule for the date
    const schedule = await prisma.schedule.findFirst({
      where: {
        userId,
        date,
        status: { in: ['CONFIRMED', 'PROPOSED'] },
      },
      orderBy: { status: 'asc' }, // CONFIRMED precedes PROPOSED alphabetically
      include: {
        blocks: {
          where: {
            blockType: { notIn: ['FREE_TIME', 'BUFFER'] },
          },
          include: {
            task: true,
          },
        },
      },
    });

    // 2. Fetch all recorded activity sessions for this date
    const activities = await prisma.activitySession.findMany({
      where: { userId, date },
      include: { task: true },
    });

    const plannedBlocks = schedule?.blocks || [];

    // Map to track matched activities
    const matchedActivityIds = new Set<string>();
    const items: PlannedVsActualItemDTO[] = [];

    // Process planned blocks
    for (const block of plannedBlocks) {
      // Find matching activities: by scheduleBlockId, or by taskId, or by title
      const matching = activities.filter((act: any) => {
        if (matchedActivityIds.has(act.id)) return false;
        if (act.scheduleBlockId && act.scheduleBlockId === block.id) return true;
        if (block.taskId && act.taskId && act.taskId === block.taskId) return true;
        if (act.title.toLowerCase() === block.title.toLowerCase()) return true;
        return false;
      });

      matching.forEach((m: any) => matchedActivityIds.add(m.id));

      const actualMinutes = matching.reduce((sum: number, m: any) => sum + m.durationMinutes, 0);
      const plannedMinutes = block.durationMinutes;
      const deltaMinutes = actualMinutes - plannedMinutes;

      let status: 'ON_TRACK' | 'EXCEEDED' | 'SHORT' | 'NOT_STARTED' = 'NOT_STARTED';
      if (actualMinutes === 0) {
        status = 'NOT_STARTED';
      } else if (actualMinutes >= plannedMinutes * 0.9 && actualMinutes <= plannedMinutes * 1.1) {
        status = 'ON_TRACK';
      } else if (actualMinutes > plannedMinutes * 1.1) {
        status = 'EXCEEDED';
      } else {
        status = 'SHORT';
      }

      items.push({
        title: block.title,
        category: block.task?.categoryId || block.blockType,
        plannedMinutes,
        actualMinutes,
        deltaMinutes,
        status,
        taskId: block.taskId,
      });
    }

    // Process remaining unplanned activities
    const unplannedActivities = activities.filter((act: any) => !matchedActivityIds.has(act.id));
    for (const act of unplannedActivities) {
      items.push({
        title: act.title,
        category: act.category,
        plannedMinutes: 0,
        actualMinutes: act.durationMinutes,
        deltaMinutes: act.durationMinutes,
        status: 'UNPLANNED',
        taskId: act.taskId,
      });
    }

    const totalPlannedMinutes = items.reduce((sum, i) => sum + i.plannedMinutes, 0);
    const totalActualMinutes = items.reduce((sum, i) => sum + i.actualMinutes, 0);
    const differenceMinutes = totalActualMinutes - totalPlannedMinutes;
    const plannedVsActualRatio =
      totalPlannedMinutes > 0
        ? Math.round((totalActualMinutes / totalPlannedMinutes) * 100) / 100
        : 0;

    return {
      date,
      totalPlannedMinutes,
      totalActualMinutes,
      differenceMinutes,
      plannedVsActualRatio,
      tasksCompletedAsPlanned: items.filter((i) => i.status === 'ON_TRACK').length,
      tasksExceeded: items.filter((i) => i.status === 'EXCEEDED').length,
      tasksNotCompleted: items.filter((i) => i.status === 'NOT_STARTED' || i.status === 'SHORT')
        .length,
      unplannedActivitiesCount: items.filter((i) => i.status === 'UNPLANNED').length,
      items,
    };
  }

  /**
   * Generates a 365-day productivity heatmap with session counts, intensity levels, and streak metrics.
   */
  async getProductivityHeatmap(userId: string): Promise<ProductivityHeatmapDTO> {
    const today = new Date();
    // 365 days range ending today
    const startDateObj = new Date(today);
    startDateObj.setDate(startDateObj.getDate() - 364);

    const startDateStr = startDateObj.toISOString().substring(0, 10);
    const endDateStr = today.toISOString().substring(0, 10);

    const activities = await prisma.activitySession.findMany({
      where: {
        userId,
        date: {
          gte: startDateStr,
          lte: endDateStr,
        },
      },
      select: {
        date: true,
        category: true,
        durationMinutes: true,
      },
    });

    // Map aggregated data by date
    const dayMap = new Map<
      string,
      { count: number; totalMinutes: number; categories: Record<string, number> }
    >();

    for (const act of activities) {
      let entry = dayMap.get(act.date);
      if (!entry) {
        entry = { count: 0, totalMinutes: 0, categories: {} };
        dayMap.set(act.date, entry);
      }
      entry.count += 1;
      entry.totalMinutes += act.durationMinutes;
      entry.categories[act.category] = (entry.categories[act.category] || 0) + act.durationMinutes;
    }

    const days: HeatmapDayDTO[] = [];
    let totalRecordedMinutes = 0;
    let totalSessions = 0;
    let activeDaysCount = 0;

    const curr = new Date(startDateObj);
    while (curr <= today) {
      const dStr = curr.toISOString().substring(0, 10);
      const entry = dayMap.get(dStr);

      const count = entry ? entry.count : 0;
      const totalMinutes = entry ? entry.totalMinutes : 0;
      const categories = entry ? entry.categories : {};

      // Intensity level: 0 = 0m, 1 = 1-60m, 2 = 61-180m, 3 = 181-360m, 4 = >360m
      let intensity: 0 | 1 | 2 | 3 | 4 = 0;
      if (totalMinutes > 360) intensity = 4;
      else if (totalMinutes > 180) intensity = 3;
      else if (totalMinutes > 60) intensity = 2;
      else if (totalMinutes > 0) intensity = 1;

      if (totalMinutes > 0) activeDaysCount++;
      totalRecordedMinutes += totalMinutes;
      totalSessions += count;

      days.push({
        date: dStr,
        count,
        totalMinutes,
        intensity,
        categories,
      });

      curr.setDate(curr.getDate() + 1);
    }

    // Compute streaks
    let longestStreak = 0;
    let currentStreakCounter = 0;

    for (const day of days) {
      if (day.totalMinutes > 0) {
        currentStreakCounter++;
        if (currentStreakCounter > longestStreak) {
          longestStreak = currentStreakCounter;
        }
      } else {
        currentStreakCounter = 0;
      }
    }

    // Current streak ending today (or yesterday if today has not been logged yet)
    let currentStreak = 0;
    const lastDay = days[days.length - 1];
    let checkIdx = days.length - 1;

    if (lastDay && lastDay.totalMinutes === 0 && days.length > 1) {
      checkIdx = days.length - 2; // Check if streak continues from yesterday
    }

    while (checkIdx >= 0 && days[checkIdx].totalMinutes > 0) {
      currentStreak++;
      checkIdx--;
    }

    return {
      startDate: startDateStr,
      endDate: endDateStr,
      totalRecordedMinutes,
      totalRecordedHours: Math.round((totalRecordedMinutes / 60) * 10) / 10,
      totalSessions,
      activeDaysCount,
      currentStreakDays: currentStreak,
      longestStreakDays: longestStreak,
      days,
    };
  }

  /**
   * Generates productivity analytics for weekly or monthly periods.
   */
  async getProductivityAnalytics(
    userId: string,
    period: 'week' | 'month' = 'week'
  ): Promise<ProductivityAnalyticsDTO> {
    const daysInPeriod = period === 'week' ? 7 : 30;
    const today = new Date();

    const endDateStr = today.toISOString().substring(0, 10);
    const startDateObj = new Date(today);
    startDateObj.setDate(startDateObj.getDate() - (daysInPeriod - 1));
    const startDateStr = startDateObj.toISOString().substring(0, 10);

    // Previous period range
    const prevEndDateObj = new Date(startDateObj);
    prevEndDateObj.setDate(prevEndDateObj.getDate() - 1);
    const prevEndDateStr = prevEndDateObj.toISOString().substring(0, 10);

    const prevStartDateObj = new Date(prevEndDateObj);
    prevStartDateObj.setDate(prevStartDateObj.getDate() - (daysInPeriod - 1));
    const prevStartDateStr = prevStartDateObj.toISOString().substring(0, 10);

    // Query current period activities
    const currentActivities = await prisma.activitySession.findMany({
      where: {
        userId,
        date: { gte: startDateStr, lte: endDateStr },
      },
    });

    // Query previous period activities
    const prevActivities = await prisma.activitySession.findMany({
      where: {
        userId,
        date: { gte: prevStartDateStr, lte: prevEndDateStr },
      },
    });

    const totalMinutes = currentActivities.reduce(
      (sum: number, a: any) => sum + a.durationMinutes,
      0
    );
    const prevMinutes = prevActivities.reduce((sum: number, a: any) => sum + a.durationMinutes, 0);
    const deltaMinutes = totalMinutes - prevMinutes;
    const percentageChange =
      prevMinutes > 0
        ? Math.round(((totalMinutes - prevMinutes) / prevMinutes) * 100)
        : totalMinutes > 0
          ? 100
          : 0;

    // Categories breakdown
    const allCategories: ActivityCategory[] = [
      'STUDY',
      'COLLEGE',
      'WORK',
      'PERSONAL',
      'EXERCISE',
      'LEISURE',
      'OTHER',
    ];
    const catMinutesMap = new Map<ActivityCategory, number>();
    for (const c of allCategories) catMinutesMap.set(c, 0);

    for (const act of currentActivities) {
      const cat = act.category as ActivityCategory;
      catMinutesMap.set(cat, (catMinutesMap.get(cat) || 0) + act.durationMinutes);
    }

    const categories: CategoryBreakdownDTO[] = allCategories.map((category) => {
      const mins = catMinutesMap.get(category) || 0;
      return {
        category,
        totalMinutes: mins,
        totalHours: Math.round((mins / 60) * 10) / 10,
        percentage: totalMinutes > 0 ? Math.round((mins / totalMinutes) * 100) : 0,
      };
    });

    // Daily trends
    const dailyMap = new Map<
      string,
      { totalMinutes: number; sessionCount: number; catMap: Record<string, number> }
    >();
    const curr = new Date(startDateObj);
    while (curr <= today) {
      const d = curr.toISOString().substring(0, 10);
      dailyMap.set(d, { totalMinutes: 0, sessionCount: 0, catMap: {} });
      curr.setDate(curr.getDate() + 1);
    }

    for (const act of currentActivities) {
      const dayEntry = dailyMap.get(act.date);
      if (dayEntry) {
        dayEntry.totalMinutes += act.durationMinutes;
        dayEntry.sessionCount += 1;
        dayEntry.catMap[act.category] = (dayEntry.catMap[act.category] || 0) + act.durationMinutes;
      }
    }

    const dailyTrends: DailyTrendDTO[] = [];
    let activeDays = 0;

    dailyMap.forEach((val, dateKey) => {
      if (val.totalMinutes > 0) activeDays++;

      let primaryCategory: string | undefined = undefined;
      let maxCatMins = 0;
      for (const [c, m] of Object.entries(val.catMap)) {
        if (m > maxCatMins) {
          maxCatMins = m;
          primaryCategory = c;
        }
      }

      dailyTrends.push({
        date: dateKey,
        totalMinutes: val.totalMinutes,
        sessionCount: val.sessionCount,
        primaryCategory,
      });
    });

    // Task performance metrics
    const completedTasksCount = await prisma.task.count({
      where: {
        userId,
        status: 'COMPLETED',
        completedAt: {
          gte: new Date(startDateStr + 'T00:00:00.000Z'),
          lte: new Date(endDateStr + 'T23:59:59.999Z'),
        },
      },
    });

    const plannedSessions = currentActivities.filter((a: any) => a.completedAsPlanned).length;
    const completionRatePercentage =
      currentActivities.length > 0
        ? Math.round((plannedSessions / currentActivities.length) * 100)
        : 0;

    const averageSessionMinutes =
      currentActivities.length > 0 ? Math.round(totalMinutes / currentActivities.length) : 0;

    return {
      period,
      startDate: startDateStr,
      endDate: endDateStr,
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      previousPeriodMinutes: prevMinutes,
      previousPeriodDeltaMinutes: deltaMinutes,
      percentageChange,
      categories,
      dailyTrends,
      taskPerformance: {
        tasksCompleted: completedTasksCount,
        averageSessionMinutes,
        completionRatePercentage,
      },
      consistency: {
        activeDays,
        totalDaysInPeriod: daysInPeriod,
        consistencyPercentage: Math.round((activeDays / daysInPeriod) * 100),
        averageDailyMinutes: Math.round(totalMinutes / daysInPeriod),
      },
    };
  }
}
