import { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { apiRequest } from '../api/client';
import {
  ActivitySessionDTO,
  PlannedVsActualSummaryDTO,
  ProductivityAnalyticsDTO,
  ActivityCategory,
  CreateActivityInput,
  formatTimeDisplayString,
} from '@tempo/shared';
import {
  BarChart3,
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
} from 'lucide-react';

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'log' | 'trends'>('log');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'week' | 'month'>('week');

  // Data states
  const [activities, setActivities] = useState<ActivitySessionDTO[]>([]);
  const [plannedVsActual, setPlannedVsActual] = useState<PlannedVsActualSummaryDTO | null>(null);
  const [analytics, setAnalytics] = useState<ProductivityAnalyticsDTO | null>(null);
  const [availableTasks, setAvailableTasks] = useState<{ id: string; title: string }[]>([]);

  // UI & Modal states
  const [loading, setLoading] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivitySessionDTO | null>(null);

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
      const [actRes, pvaRes, analRes, taskRes] = await Promise.all([
        apiRequest<ActivitySessionDTO[]>(`/api/activities?date=${selectedDate}`).catch(() => []),
        apiRequest<PlannedVsActualSummaryDTO>(
          `/api/analytics/planned-vs-actual?date=${selectedDate}`
        ).catch(() => null),
        apiRequest<ProductivityAnalyticsDTO>(
          `/api/analytics/summary?period=${analyticsPeriod}`
        ).catch(() => null),
        apiRequest<{ tasks: { id: string; title: string }[] }>('/api/tasks?limit=50').catch(() => ({
          tasks: [],
        })),
      ]);

      if (actRes) setActivities(actRes);
      if (pvaRes) setPlannedVsActual(pvaRes);
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

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#101010] text-[#080808] dark:text-[#F2F2F2] font-interface transition-colors">
      <Navbar />

      <div className="md:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 md:pb-12 space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9D9D9] dark:border-[#353535] pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#080808] dark:text-[#F2F2F2] tracking-tight flex items-baseline gap-2">
                <span>Activity & Productivity</span>
                <span className="font-handwritten text-2xl sm:text-3xl font-normal text-[#777777] dark:text-[#858585]">
                  insights
                </span>
              </h1>
              <p className="text-[#777777] dark:text-[#858585] text-xs sm:text-sm mt-1">
                Log focused sessions, inspect planned vs. actual schedule execution, and review productivity trends.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {loading && <span className="text-xs text-[#777777] dark:text-[#858585] animate-pulse">Syncing...</span>}
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#080808] dark:bg-[#F5F5F5] hover:bg-[#171717] dark:hover:bg-[#E5E5E5] text-white dark:text-[#101010] text-xs font-medium shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Log Activity</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-[#D9D9D9] dark:border-[#353535] space-x-6">
            <button
              onClick={() => setActiveTab('log')}
              className={`pb-3 text-xs sm:text-sm font-medium flex items-center space-x-2 border-b-2 transition ${
                activeTab === 'log'
                  ? 'border-[#080808] dark:border-[#F5F5F5] text-[#080808] dark:text-[#F2F2F2] font-bold'
                  : 'border-transparent text-[#777777] dark:text-[#858585] hover:text-[#080808] dark:hover:text-[#F5F5F5]'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Activity Log & Execution</span>
            </button>

            <button
              onClick={() => setActiveTab('trends')}
              className={`pb-3 text-xs sm:text-sm font-medium flex items-center space-x-2 border-b-2 transition ${
                activeTab === 'trends'
                  ? 'border-[#080808] dark:border-[#F5F5F5] text-[#080808] dark:text-[#F2F2F2] font-bold'
                  : 'border-transparent text-[#777777] dark:text-[#858585] hover:text-[#080808] dark:hover:text-[#F5F5F5]'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Productivity Trends</span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: ACTIVITY LOG & PLANNED VS ACTUAL                   */}
          {/* ======================================================== */}
          {activeTab === 'log' && (
            <div className="space-y-6">
              {/* Date Picker Bar */}
              <div className="flex items-center justify-between bg-white border border-[#D9D9D9] p-4 rounded-2xl shadow-sm">
                <div className="flex items-center space-x-3">
                  <CalendarIcon className="w-4 h-4 text-[#080808]" />
                  <span className="text-xs font-semibold text-[#080808]">Selected Date:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-[#FAFAFA] border border-[#D9D9D9] rounded-lg px-2.5 py-1 text-xs text-[#080808] focus:outline-none focus:border-[#080808]"
                  />
                </div>

                <button
                  onClick={() => setSelectedDate(new Date().toISOString().substring(0, 10))}
                  className="text-xs text-[#080808] underline font-medium hover:text-[#404040]"
                >
                  Today
                </button>
              </div>

              {/* Planned vs Actual Summary Cards */}
              {plannedVsActual && (
                <div className="bg-white border border-[#D9D9D9] rounded-2xl p-6 space-y-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9D9D9] pb-4">
                    <div>
                      <h2 className="text-base font-bold text-[#080808] flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#080808]" />
                        <span>Planned vs. Actual Schedule Execution</span>
                      </h2>
                      <p className="text-xs text-[#777777] mt-0.5">
                        Compares your generated schedule blocks with logged activity sessions.
                      </p>
                    </div>

                    <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-xs font-mono">
                      <span className="text-[#777777]">Ratio:</span>
                      <span className="font-bold text-[#080808]">
                        {Math.round(plannedVsActual.plannedVsActualRatio * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9]">
                      <p className="text-[11px] text-[#777777]">Planned Minutes</p>
                      <p className="text-xl font-bold text-[#080808] mt-1">
                        {plannedVsActual.totalPlannedMinutes}m
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9]">
                      <p className="text-[11px] text-[#777777]">Actual Recorded</p>
                      <p className="text-xl font-bold text-[#080808] mt-1">
                        {plannedVsActual.totalActualMinutes}m
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9]">
                      <p className="text-[11px] text-[#777777]">On Track</p>
                      <p className="text-xl font-bold text-[#080808] mt-1">
                        {plannedVsActual.tasksCompletedAsPlanned}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9]">
                      <p className="text-[11px] text-[#777777]">Unplanned Items</p>
                      <p className="text-xl font-bold text-[#080808] mt-1">
                        {plannedVsActual.unplannedActivitiesCount}
                      </p>
                    </div>
                  </div>

                  {/* Planned vs Actual Breakdown List */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-[#080808]">Detailed Comparison</h3>
                    {plannedVsActual.items.length === 0 ? (
                      <p className="text-xs text-[#777777] py-4 text-center font-handwriting text-base">
                        No schedule or activities recorded for this date.
                      </p>
                    ) : (
                      <div className="divide-y divide-[#D9D9D9] border border-[#D9D9D9] rounded-xl overflow-hidden bg-white">
                        {plannedVsActual.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#FAFAFA] transition"
                          >
                            <div>
                              <p className="text-xs font-semibold text-[#080808]">{item.title}</p>
                              <p className="text-[11px] text-[#777777]">
                                Planned: {item.plannedMinutes}m | Actual: {item.actualMinutes}m
                                {item.deltaMinutes !== 0 && (
                                  <span className="ml-2 font-mono text-[#404040]">
                                    ({item.deltaMinutes > 0 ? `+` : ''}
                                    {item.deltaMinutes}m)
                                  </span>
                                )}
                              </p>
                            </div>

                            <span className="self-start sm:self-auto px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase bg-[#F5F5F5] border border-[#D9D9D9] text-[#080808]">
                              {item.status.replace('_', ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recorded Activities List */}
              <div className="bg-white border border-[#D9D9D9] rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-[#D9D9D9]">
                  <h2 className="text-base font-bold text-[#080808] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#080808]" />
                    <span>Activity Sessions for {selectedDate}</span>
                  </h2>
                  <span className="text-xs text-[#777777] font-mono">
                    {activities.length} session{activities.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {activities.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <p className="text-xs text-[#777777] font-handwriting text-base">
                      No activity sessions logged for {selectedDate}.
                    </p>
                    <button
                      onClick={handleOpenAddModal}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-white text-[#080808] border border-[#D9D9D9] text-xs font-medium hover:bg-[#F5F5F5] transition shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Log First Session</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activities.map((act) => (
                      <div
                        key={act.id}
                        className="p-4 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#080808] transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-white border border-[#D9D9D9] text-[#404040]">
                              {act.category}
                            </span>
                            <span className="text-xs font-bold text-[#080808]">{act.title}</span>
                            {act.completedAsPlanned && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#080808]" />
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#777777]">
                            <span>{formatTimeDisplayString(act.timeDisplay)}</span>
                            <span>•</span>
                            <span className="font-mono text-[#080808]">
                              {act.durationMinutes} mins
                            </span>
                            {act.taskTitle && (
                              <>
                                <span>•</span>
                                <span className="text-[#080808] truncate max-w-[200px]">
                                  Task: {act.taskTitle}
                                </span>
                              </>
                            )}
                          </div>

                          {act.notes && (
                            <p className="text-xs text-[#777777] italic pt-1">{act.notes}</p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 self-end sm:self-auto">
                          <button
                            onClick={() => handleOpenEditModal(act)}
                            className="p-1.5 rounded-lg text-[#777777] hover:text-[#080808] hover:bg-white border border-transparent hover:border-[#D9D9D9] transition"
                            title="Edit Session"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteActivity(act.id)}
                            className="p-1.5 rounded-lg text-[#777777] hover:text-[#080808] hover:bg-white border border-transparent hover:border-[#D9D9D9] transition"
                            title="Delete Session"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: PRODUCTIVITY TRENDS & BREAKDOWN                   */}
          {/* ======================================================== */}
          {activeTab === 'trends' && analytics && (
            <div className="space-y-6">
              {/* Period Selector Bar */}
              <div className="flex items-center justify-between bg-white border border-[#D9D9D9] p-4 rounded-2xl shadow-sm">
                <span className="text-xs font-semibold text-[#080808]">Analysis Timeframe:</span>
                <div className="inline-flex rounded-xl bg-[#FAFAFA] p-1 border border-[#D9D9D9]">
                  <button
                    onClick={() => setAnalyticsPeriod('week')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      analyticsPeriod === 'week'
                        ? 'bg-[#080808] text-white font-bold shadow-sm'
                        : 'text-[#777777] hover:text-[#080808]'
                    }`}
                  >
                    Last 7 Days
                  </button>
                  <button
                    onClick={() => setAnalyticsPeriod('month')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      analyticsPeriod === 'month'
                        ? 'bg-[#080808] text-white font-bold shadow-sm'
                        : 'text-[#777777] hover:text-[#080808]'
                    }`}
                  >
                    Last 30 Days
                  </button>
                </div>
              </div>

              {/* Comparison Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-[#D9D9D9] rounded-2xl p-5 space-y-2 shadow-sm">
                  <p className="text-xs font-medium text-[#777777]">Total Recorded Time</p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-2xl font-black text-[#080808]">{analytics.totalHours} hrs</p>
                    <span className="text-xs text-[#777777]">({analytics.totalMinutes}m)</span>
                  </div>
                </div>

                <div className="bg-white border border-[#D9D9D9] rounded-2xl p-5 space-y-2 shadow-sm">
                  <p className="text-xs font-medium text-[#777777]">
                    Vs. Previous {analyticsPeriod}
                  </p>
                  <div className="flex items-center space-x-2">
                    {analytics.percentageChange >= 0 ? (
                      <div className="inline-flex items-center space-x-1 text-[#080808] font-bold text-lg">
                        <TrendingUp className="w-5 h-5" />
                        <span>+{analytics.percentageChange}%</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center space-x-1 text-[#777777] font-bold text-lg">
                        <TrendingDown className="w-5 h-5" />
                        <span>{analytics.percentageChange}%</span>
                      </div>
                    )}
                    <span className="text-xs text-[#777777]">
                      ({analytics.previousPeriodDeltaMinutes > 0 ? `+` : ''}
                      {analytics.previousPeriodDeltaMinutes}m)
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-[#D9D9D9] rounded-2xl p-5 space-y-2 shadow-sm">
                  <p className="text-xs font-medium text-[#777777]">Rhythm Consistency</p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-2xl font-black text-[#080808]">
                      {analytics.consistency.consistencyPercentage}%
                    </p>
                    <span className="text-xs text-[#777777]">
                      ({analytics.consistency.activeDays}/{analytics.consistency.totalDaysInPeriod}{' '}
                      days)
                    </span>
                  </div>
                </div>
              </div>

              {/* Category Distribution Grid */}
              <div className="bg-white border border-[#D9D9D9] rounded-2xl p-6 space-y-4 shadow-sm">
                <h2 className="text-base font-bold text-[#080808] flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-[#080808]" />
                  <span>Time Distribution by Category</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {analytics.categories.map((cat) => (
                    <div
                      key={cat.category}
                      className="p-4 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-white border border-[#D9D9D9] text-[#404040]">
                          {cat.category}
                        </span>
                        <span className="text-xs font-bold text-[#080808]">{cat.percentage}%</span>
                      </div>

                      <div className="w-full bg-[#E5E5E5] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#080808] rounded-full transition-all duration-500"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>

                      <p className="text-[11px] text-[#777777]">
                        {cat.totalHours} hrs ({cat.totalMinutes} mins)
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Rhythm Trends */}
              <div className="bg-white border border-[#D9D9D9] rounded-2xl p-6 space-y-4 shadow-sm">
                <h2 className="text-base font-bold text-[#080808] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#080808]" />
                  <span>Daily Minutes Trend</span>
                </h2>

                <div className="space-y-2">
                  {analytics.dailyTrends.map((d) => (
                    <div
                      key={d.date}
                      className="p-3 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="font-mono text-[#777777]">{d.date}</span>
                        {d.primaryCategory && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-white border border-[#D9D9D9] text-[#404040] font-mono">
                            {d.primaryCategory}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 font-mono">
                        <span className="text-[#777777]">{d.sessionCount} sessions</span>
                        <span className="font-bold text-[#080808]">{d.totalMinutes}m</span>
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
            <div className="fixed inset-0 z-50 bg-[#080808]/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="bg-white border-t sm:border border-[#D9D9D9] rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl text-[#080808] max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-3">
                  <h3 className="text-base font-bold text-[#080808]">
                    {editingActivity ? 'Edit Activity Session' : 'Log Focused Activity'}
                  </h3>
                  <button
                    onClick={() => setShowLogModal(false)}
                    className="p-1 rounded-lg text-[#777777] hover:text-[#080808] hover:bg-[#F5F5F5] transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveActivity} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#404040] mb-1">
                      Activity Title
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Operating Systems Paging Study"
                      className="w-full bg-[#FAFAFA] border border-[#D9D9D9] rounded-xl px-3 py-2 text-xs text-[#080808] focus:outline-none focus:border-[#080808] focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#404040] mb-1">
                        Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value as ActivityCategory })
                        }
                        className="w-full bg-[#FAFAFA] border border-[#D9D9D9] rounded-xl px-3 py-2 text-xs text-[#080808] focus:outline-none focus:border-[#080808]"
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
                      <label className="block text-xs font-medium text-[#404040] mb-1">Date</label>
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full bg-[#FAFAFA] border border-[#D9D9D9] rounded-xl px-3 py-2 text-xs text-[#080808] focus:outline-none focus:border-[#080808]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#404040] mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        required
                        value={formStartTimeStr}
                        onChange={(e) => setFormStartTimeStr(e.target.value)}
                        className="w-full bg-[#FAFAFA] border border-[#D9D9D9] rounded-xl px-3 py-2 text-xs text-[#080808] focus:outline-none focus:border-[#080808]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#404040] mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        required
                        value={formEndTimeStr}
                        onChange={(e) => setFormEndTimeStr(e.target.value)}
                        className="w-full bg-[#FAFAFA] border border-[#D9D9D9] rounded-xl px-3 py-2 text-xs text-[#080808] focus:outline-none focus:border-[#080808]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#404040] mb-1">
                      Associated Task (Optional)
                    </label>
                    <select
                      value={formData.taskId || ''}
                      onChange={(e) => setFormData({ ...formData, taskId: e.target.value || null })}
                      className="w-full bg-[#FAFAFA] border border-[#D9D9D9] rounded-xl px-3 py-2 text-xs text-[#080808] focus:outline-none focus:border-[#080808]"
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
                    <label className="block text-xs font-medium text-[#404040] mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Key concepts covered, solved problems..."
                      className="w-full bg-[#FAFAFA] border border-[#D9D9D9] rounded-xl px-3 py-2 text-xs text-[#080808] placeholder-[#777777] focus:outline-none focus:border-[#080808] focus:bg-white"
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
                      className="rounded border-[#D9D9D9] bg-[#FAFAFA] text-[#080808] focus:ring-0"
                    />
                    <label htmlFor="completedAsPlanned" className="text-xs text-[#404040]">
                      Completed as planned (marks task complete if linked)
                    </label>
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#D9D9D9]">
                    <button
                      type="button"
                      onClick={() => setShowLogModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-[#777777] hover:text-[#080808] transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#080808] hover:bg-[#171717] text-white text-xs font-medium transition shadow-sm"
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
    </div>
  );
}
