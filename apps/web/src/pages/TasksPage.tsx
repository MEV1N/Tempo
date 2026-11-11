import { useState, useEffect, useMemo } from 'react';
import { Navbar } from '../components/Navbar';
import { apiRequest } from '../api/client';
import {
  TaskItemDTO,
  TaskCategoryDTO,
  RecurringTaskSeriesDTO,
  Priority,
  TaskStatusType,
  TimeOfDay,
  EnergyLevel,
  RecurrenceFrequency,
} from '@tempo/shared';
import {
  CheckSquare,
  Plus,
  Search,
  Clock,
  Calendar,
  Tag,
  Repeat,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  Sparkles,
  ArrowUpDown,
  Flame,
} from 'lucide-react';

const PRESET_COLORS = [
  '#38bdf8', // sky
  '#818cf8', // indigo
  '#a855f7', // purple
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#64748b', // slate
];

export function TasksPage() {
  const [tasks, setTasks] = useState<TaskItemDTO[]>([]);
  const [categories, setCategories] = useState<TaskCategoryDTO[]>([]);
  const [recurringSeries, setRecurringSeries] = useState<RecurringTaskSeriesDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Overview Stats
  const [overview, setOverview] = useState<{
    totalActive: number;
    completed: number;
    overdue: number;
    upcoming: number;
    byPriority: Record<string, number>;
  }>({
    totalActive: 0,
    completed: 0,
    overdue: 0,
    upcoming: 0,
    byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
  });

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TaskStatusType>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'createdAt' | 'title'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItemDTO | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [recurringModalOpen, setRecurringModalOpen] = useState(false);

  // Form states for Task Creation / Edit
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    estimatedMinutes: 30,
    priority: 'MEDIUM' as Priority,
    status: 'TODO' as TaskStatusType,
    preferredTime: 'ANYTIME' as TimeOfDay,
    energyRequirement: 'MEDIUM' as EnergyLevel,
    canSplit: false,
    minSessionMinutes: 30,
    dueDate: '',
    isRecurring: false,
    frequency: 'DAILY' as RecurrenceFrequency,
    interval: 1,
    daysOfWeek: [1, 2, 3, 4, 5],
    recurrenceEndDate: '',
  });

  // Category Form
  const [catForm, setCatForm] = useState({ name: '', color: '#38bdf8' });
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Fetch initial data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tasksRes, catRes, overviewRes, seriesRes] = await Promise.all([
        apiRequest<{ tasks: TaskItemDTO[] }>('/api/tasks?limit=100'),
        apiRequest<TaskCategoryDTO[]>('/api/categories'),
        apiRequest<any>('/api/tasks/overview'),
        apiRequest<RecurringTaskSeriesDTO[]>('/api/recurring-tasks'),
      ]);

      setTasks(tasksRes.tasks || []);
      setCategories(catRes || []);
      setOverview(
        overviewRes || { totalActive: 0, completed: 0, overdue: 0, upcoming: 0, byPriority: {} }
      );
      setRecurringSeries(seriesRes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load task management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick Status Toggle
  const handleToggleComplete = async (task: TaskItemDTO) => {
    const nextStatus: TaskStatusType = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    try {
      const updated = await apiRequest<TaskItemDTO>(`/api/tasks/${task.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      // Refresh overview
      const ov = await apiRequest<any>('/api/tasks/overview');
      setOverview(ov);
    } catch (err: any) {
      alert(err.message || 'Failed to update task status');
    }
  };

  // Delete Task
  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await apiRequest(`/api/tasks/${id}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((t) => t.id !== id));
      const ov = await apiRequest<any>('/api/tasks/overview');
      setOverview(ov);
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    }
  };

  // Save Task (Create / Update)
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    try {
      if (taskForm.isRecurring && !editingTask) {
        // Create recurring task series
        await apiRequest('/api/recurring-tasks', {
          method: 'POST',
          body: JSON.stringify({
            title: taskForm.title.trim(),
            description: taskForm.description.trim() || undefined,
            categoryId: taskForm.categoryId || undefined,
            estimatedMinutes: Number(taskForm.estimatedMinutes),
            priority: taskForm.priority,
            preferredTime: taskForm.preferredTime,
            energyRequirement: taskForm.energyRequirement,
            canSplit: taskForm.canSplit,
            minSessionMinutes: Number(taskForm.minSessionMinutes),
            frequency: taskForm.frequency,
            interval: Number(taskForm.interval),
            daysOfWeek: taskForm.frequency === 'WEEKLY' ? taskForm.daysOfWeek : undefined,
            startDate: taskForm.dueDate
              ? new Date(taskForm.dueDate).toISOString()
              : new Date().toISOString(),
            endDate: taskForm.recurrenceEndDate
              ? new Date(taskForm.recurrenceEndDate).toISOString()
              : undefined,
          }),
        });
      } else if (editingTask) {
        // Update existing task
        await apiRequest(`/api/tasks/${editingTask.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: taskForm.title.trim(),
            description: taskForm.description.trim() || null,
            categoryId: taskForm.categoryId || null,
            estimatedMinutes: Number(taskForm.estimatedMinutes),
            priority: taskForm.priority,
            status: taskForm.status,
            preferredTime: taskForm.preferredTime,
            energyRequirement: taskForm.energyRequirement,
            canSplit: taskForm.canSplit,
            minSessionMinutes: Number(taskForm.minSessionMinutes),
            dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : null,
          }),
        });
      } else {
        // Create single task
        await apiRequest('/api/tasks', {
          method: 'POST',
          body: JSON.stringify({
            title: taskForm.title.trim(),
            description: taskForm.description.trim() || undefined,
            categoryId: taskForm.categoryId || undefined,
            estimatedMinutes: Number(taskForm.estimatedMinutes),
            priority: taskForm.priority,
            preferredTime: taskForm.preferredTime,
            energyRequirement: taskForm.energyRequirement,
            canSplit: taskForm.canSplit,
            minSessionMinutes: Number(taskForm.minSessionMinutes),
            dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : undefined,
          }),
        });
      }

      setTaskModalOpen(false);
      setEditingTask(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save task');
    }
  };

  // Open Edit Modal
  const openEditModal = (task: TaskItemDTO) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      categoryId: task.categoryId || '',
      estimatedMinutes: task.estimatedMinutes,
      priority: task.priority,
      status: task.status,
      preferredTime: task.preferredTime,
      energyRequirement: task.energyRequirement,
      canSplit: task.canSplit,
      minSessionMinutes: task.minSessionMinutes,
      dueDate: task.dueDate ? task.dueDate.slice(0, 16) : '',
      isRecurring: false,
      frequency: 'DAILY',
      interval: 1,
      daysOfWeek: [1, 2, 3, 4, 5],
      recurrenceEndDate: '',
    });
    setTaskModalOpen(true);
  };

  // Open New Task Modal
  const openNewTaskModal = () => {
    setEditingTask(null);
    setTaskForm({
      title: '',
      description: '',
      categoryId: '',
      estimatedMinutes: 30,
      priority: 'MEDIUM',
      status: 'TODO',
      preferredTime: 'ANYTIME',
      energyRequirement: 'MEDIUM',
      canSplit: false,
      minSessionMinutes: 30,
      dueDate: '',
      isRecurring: false,
      frequency: 'DAILY',
      interval: 1,
      daysOfWeek: [1, 2, 3, 4, 5],
      recurrenceEndDate: '',
    });
    setTaskModalOpen(true);
  };

  // Quick Postpone Task (+1 day or +1 week)
  const handlePostpone = async (task: TaskItemDTO, days: number) => {
    const base = task.dueDate ? new Date(task.dueDate) : new Date();
    base.setDate(base.getDate() + days);
    try {
      const updated = await apiRequest<TaskItemDTO>(`/api/tasks/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify({ dueDate: base.toISOString() }),
      });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      const ov = await apiRequest<any>('/api/tasks/overview');
      setOverview(ov);
    } catch (err: any) {
      alert(err.message || 'Failed to postpone task');
    }
  };

  // Category Save / Delete
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) return;

    try {
      if (editingCatId) {
        await apiRequest(`/api/categories/${editingCatId}`, {
          method: 'PUT',
          body: JSON.stringify(catForm),
        });
      } else {
        await apiRequest('/api/categories', {
          method: 'POST',
          body: JSON.stringify(catForm),
        });
      }
      setCatForm({ name: '', color: '#38bdf8' });
      setEditingCatId(null);
      const catRes = await apiRequest<TaskCategoryDTO[]>('/api/categories');
      setCategories(catRes);
    } catch (err: any) {
      alert(err.message || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category? Tasks in this category will become uncategorized.')) return;
    try {
      await apiRequest(`/api/categories/${id}`, { method: 'DELETE' });
      const catRes = await apiRequest<TaskCategoryDTO[]>('/api/categories');
      setCategories(catRes);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };

  // Delete Recurring Series
  const handleDeleteSeries = async (id: string) => {
    if (!confirm('Delete this recurring series? Previous completed occurrences will be kept.'))
      return;
    try {
      await apiRequest(`/api/recurring-tasks/${id}`, { method: 'DELETE' });
      const seriesRes = await apiRequest<RecurringTaskSeriesDTO[]>('/api/recurring-tasks');
      setRecurringSeries(seriesRes);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete series');
    }
  };

  // Filtered & Sorted Tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((t) => t.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'ALL') {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    // Category filter
    if (categoryFilter !== 'ALL') {
      result = result.filter((t) => t.categoryId === categoryFilter);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return sortOrder === 'asc'
          ? new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          : new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      }
      if (sortBy === 'priority') {
        const order: Record<Priority, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return sortOrder === 'asc'
          ? order[a.priority] - order[b.priority]
          : order[b.priority] - order[a.priority];
      }
      if (sortBy === 'title') {
        return sortOrder === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
      // default createdAt
      return sortOrder === 'asc'
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [tasks, search, statusFilter, priorityFilter, categoryFilter, sortBy, sortOrder]);

  const priorityBadge = (p: Priority) => {
    switch (p) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <Flame className="w-3 h-3 mr-0.5" /> Urgent
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            High
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-500/20 text-sky-400 border border-sky-500/30">
            Medium
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-normal bg-slate-800 text-slate-400 border border-slate-700">
            Low
          </span>
        );
    }
  };

  const isOverdue = (dueDate: string | null, status: TaskStatusType) => {
    if (!dueDate || status === 'COMPLETED' || status === 'CANCELED' || status === 'SKIPPED')
      return false;
    return new Date(dueDate).getTime() < Date.now();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <CheckSquare className="w-7 h-7 text-sky-400" />
              <span>Task Management</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Capture, organize, prioritize, and conquer your daily commitments.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setCategoryModalOpen(true)}
              className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 transition"
            >
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              <span>Categories</span>
            </button>
            <button
              onClick={() => setRecurringModalOpen(true)}
              className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 transition"
            >
              <Repeat className="w-3.5 h-3.5 text-sky-400" />
              <span>Recurring Series</span>
            </button>
            <button
              onClick={openNewTaskModal}
              className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold shadow-lg shadow-sky-500/20 transition ml-auto sm:ml-0"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-md">
            <p className="text-xs font-medium text-slate-400">Active Tasks</p>
            <p className="text-2xl font-bold text-white mt-1">{overview.totalActive}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-md">
            <p className="text-xs font-medium text-emerald-400">Completed</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{overview.completed}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-md">
            <p className="text-xs font-medium text-rose-400">Overdue</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">{overview.overdue}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-md">
            <p className="text-xs font-medium text-amber-400">Upcoming</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{overview.upcoming}</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-md">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search tasks by title or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {/* Sort Order */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
              >
                <option value="dueDate">Sort by Deadline</option>
                <option value="priority">Sort by Priority</option>
                <option value="createdAt">Sort by Created</option>
                <option value="title">Sort Alphabetically</option>
              </select>

              <button
                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
                title={`Order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/60">
            {(['ALL', 'TODO', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  statusFilter === st
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {st === 'ALL' ? 'All Tasks' : st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Tasks List */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading your tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-3">
            <CheckSquare className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-slate-300">No tasks found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search ||
              statusFilter !== 'ALL' ||
              priorityFilter !== 'ALL' ||
              categoryFilter !== 'ALL'
                ? 'Try adjusting your search criteria or clearing filters.'
                : 'Your task inbox is clear. Create a new task to stay focused.'}
            </p>
            <button
              onClick={openNewTaskModal}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-medium hover:bg-sky-500/20 transition mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Task</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((t) => {
              const overdue = isOverdue(t.dueDate, t.status);
              return (
                <div
                  key={t.id}
                  className={`p-4 rounded-2xl border transition group ${
                    t.status === 'COMPLETED'
                      ? 'bg-slate-900/40 border-slate-800/50 opacity-60'
                      : overdue
                        ? 'bg-rose-950/20 border-rose-900/40 hover:border-rose-700/60'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleComplete(t)}
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 ${
                          t.status === 'COMPLETED'
                            ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                            : 'border-slate-600 hover:border-sky-400 bg-slate-950'
                        }`}
                        title={t.status === 'COMPLETED' ? 'Mark uncompleted' : 'Mark completed'}
                      >
                        {t.status === 'COMPLETED' && <CheckCircle2 className="w-4 h-4" />}
                      </button>

                      {/* Content */}
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-sm font-semibold tracking-tight ${
                              t.status === 'COMPLETED'
                                ? 'line-through text-slate-500'
                                : 'text-slate-100'
                            }`}
                          >
                            {t.title}
                          </span>

                          {/* Priority */}
                          {priorityBadge(t.priority)}

                          {/* Category Tag */}
                          {t.category && (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border"
                              style={{
                                backgroundColor: `${t.category.color}15`,
                                color: t.category.color,
                                borderColor: `${t.category.color}30`,
                              }}
                            >
                              {t.category.name}
                            </span>
                          )}

                          {/* Recurring Indicator */}
                          {t.recurringSeriesId && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-sky-400 bg-sky-500/10 border border-sky-500/20"
                              title="Recurring Task Instance"
                            >
                              <Repeat className="w-2.5 h-2.5 mr-0.5" /> Recurring
                            </span>
                          )}
                        </div>

                        {t.description && (
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {t.description}
                          </p>
                        )}

                        {/* Metadata row */}
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                          <span className="inline-flex items-center">
                            <Clock className="w-3 h-3 mr-1 text-slate-500" />
                            {t.estimatedMinutes}m
                          </span>

                          {t.preferredTime !== 'ANYTIME' && (
                            <span className="inline-flex items-center capitalize text-indigo-400">
                              <Sparkles className="w-3 h-3 mr-1" />
                              {t.preferredTime.toLowerCase()}
                            </span>
                          )}

                          {t.dueDate && (
                            <span
                              className={`inline-flex items-center font-medium ${
                                overdue ? 'text-rose-400' : 'text-slate-400'
                              }`}
                            >
                              <Calendar className="w-3 h-3 mr-1" />
                              {new Date(t.dueDate).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {overdue && ' (Overdue)'}
                            </span>
                          )}

                          {t.status === 'SKIPPED' && (
                            <span className="text-slate-500 font-semibold">[Skipped]</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center space-x-1 shrink-0">
                      {/* Postpone button */}
                      <button
                        onClick={() => handlePostpone(t, 1)}
                        className="px-2 py-1 rounded-lg text-[11px] text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition"
                        title="Postpone deadline +1 day"
                      >
                        +1d
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => openEditModal(t)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                        title="Edit task"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Task Creation / Edit Modal */}
        {taskModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-sky-400" />
                  <span>{editingTask ? 'Edit Task' : 'Create New Task'}</span>
                </h3>
                <button
                  onClick={() => setTaskModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveTask} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    placeholder="e.g. Finish Algorithm Homework"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    placeholder="Add details, links, or notes..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Category</label>
                    <select
                      value={taskForm.categoryId}
                      onChange={(e) => setTaskForm({ ...taskForm, categoryId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
                    >
                      <option value="">No Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Priority</label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) =>
                        setTaskForm({ ...taskForm, priority: e.target.value as Priority })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent 🔥</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Estimated Minutes
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={1440}
                      step={5}
                      value={taskForm.estimatedMinutes}
                      onChange={(e) =>
                        setTaskForm({ ...taskForm, estimatedMinutes: Number(e.target.value) })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Deadline / Due Date
                    </label>
                    <input
                      type="datetime-local"
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Preferred Time of Day
                    </label>
                    <select
                      value={taskForm.preferredTime}
                      onChange={(e) =>
                        setTaskForm({ ...taskForm, preferredTime: e.target.value as TimeOfDay })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
                    >
                      <option value="ANYTIME">Anytime</option>
                      <option value="MORNING">Morning</option>
                      <option value="AFTERNOON">Afternoon</option>
                      <option value="EVENING">Evening</option>
                      <option value="NIGHT">Night</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      Energy Requirement
                    </label>
                    <select
                      value={taskForm.energyRequirement}
                      onChange={(e) =>
                        setTaskForm({
                          ...taskForm,
                          energyRequirement: e.target.value as EnergyLevel,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-sky-500"
                    >
                      <option value="LOW">Low (Casual / Routine)</option>
                      <option value="MEDIUM">Medium (Normal Focus)</option>
                      <option value="HIGH">High (Deep Work / High Focus)</option>
                    </select>
                  </div>
                </div>

                {/* Splitting option */}
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="canSplitCheck"
                    checked={taskForm.canSplit}
                    onChange={(e) => setTaskForm({ ...taskForm, canSplit: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-sky-500 focus:ring-0"
                  />
                  <label htmlFor="canSplitCheck" className="text-slate-300 cursor-pointer">
                    Can be split into multiple work sessions
                  </label>
                </div>

                {/* Recurrence config (only for new tasks) */}
                {!editingTask && (
                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <Repeat className="w-3.5 h-3.5 text-sky-400" />
                        <span>Recurring Task</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={taskForm.isRecurring}
                        onChange={(e) =>
                          setTaskForm({ ...taskForm, isRecurring: e.target.checked })
                        }
                        className="rounded bg-slate-950 border-slate-800 text-sky-500 focus:ring-0"
                      />
                    </div>

                    {taskForm.isRecurring && (
                      <div className="space-y-3 pt-2 border-t border-slate-800">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-slate-400 mb-1">Frequency</label>
                            <select
                              value={taskForm.frequency}
                              onChange={(e) =>
                                setTaskForm({
                                  ...taskForm,
                                  frequency: e.target.value as RecurrenceFrequency,
                                })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
                            >
                              <option value="DAILY">Daily</option>
                              <option value="WEEKLY">Weekly</option>
                              <option value="MONTHLY">Monthly</option>
                              <option value="CUSTOM">Custom Interval</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1">
                              Repeat Every (Interval)
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={30}
                              value={taskForm.interval}
                              onChange={(e) =>
                                setTaskForm({ ...taskForm, interval: Number(e.target.value) })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
                            />
                          </div>
                        </div>

                        {taskForm.frequency === 'WEEKLY' && (
                          <div>
                            <label className="block text-slate-400 mb-1">Active Weekdays</label>
                            <div className="flex gap-1.5">
                              {[
                                { day: 1, label: 'M' },
                                { day: 2, label: 'T' },
                                { day: 3, label: 'W' },
                                { day: 4, label: 'T' },
                                { day: 5, label: 'F' },
                                { day: 6, label: 'S' },
                                { day: 7, label: 'S' },
                              ].map(({ day, label }) => {
                                const active = taskForm.daysOfWeek.includes(day);
                                return (
                                  <button
                                    type="button"
                                    key={day}
                                    onClick={() => {
                                      const next = active
                                        ? taskForm.daysOfWeek.filter((d) => d !== day)
                                        : [...taskForm.daysOfWeek, day];
                                      setTaskForm({ ...taskForm, daysOfWeek: next });
                                    }}
                                    className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                                      active
                                        ? 'bg-sky-500 text-slate-950'
                                        : 'bg-slate-900 text-slate-500 hover:text-slate-300'
                                    }`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setTaskModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold shadow-lg shadow-sky-500/20"
                  >
                    {editingTask ? 'Save Changes' : 'Create Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Category Management Modal */}
        {categoryModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Tag className="w-5 h-5 text-indigo-400" />
                  <span>Manage Task Categories</span>
                </h3>
                <button
                  onClick={() => setCategoryModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Add / Edit Form */}
              <form onSubmit={handleSaveCategory} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Category name (e.g. Work, College, Projects)..."
                    value={catForm.name}
                    onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs"
                  >
                    {editingCatId ? 'Update' : 'Add'}
                  </button>
                </div>

                {/* Color presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 mr-1">Color:</span>
                  {PRESET_COLORS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setCatForm({ ...catForm, color: c })}
                      className={`w-5 h-5 rounded-full transition ${
                        catForm.color === c
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
                          : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </form>

              {/* Existing Categories List */}
              <div className="space-y-2 pt-2 border-t border-slate-800 max-h-60 overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">
                    No categories created yet.
                  </p>
                ) : (
                  categories.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="font-medium text-slate-200">{c.name}</span>
                        <span className="text-[10px] text-slate-500">
                          ({c.taskCount || 0} tasks)
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setEditingCatId(c.id);
                            setCatForm({ name: c.name, color: c.color });
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-200"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(c.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recurring Series Management Modal */}
        {recurringModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Repeat className="w-5 h-5 text-sky-400" />
                  <span>Recurring Task Series</span>
                </h3>
                <button
                  onClick={() => setRecurringModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {recurringSeries.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">
                    No recurring task series active. You can enable recurrence when creating a new
                    task.
                  </p>
                ) : (
                  recurringSeries.map((s) => (
                    <div
                      key={s.id}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{s.title}</span>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            {s.frequency}
                          </span>
                          <button
                            onClick={() => handleDeleteSeries(s.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400"
                            title="Delete recurring series"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                        <span>Duration: {s.estimatedMinutes}m</span>
                        <span>Priority: {s.priority}</span>
                        {s.category && (
                          <span style={{ color: s.category.color }}>{s.category.name}</span>
                        )}
                        <span>Interval: {s.interval}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
