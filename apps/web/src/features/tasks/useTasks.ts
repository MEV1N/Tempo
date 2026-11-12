import { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../../api/client';
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

export interface UseTasksReturn {
  tasks: TaskItemDTO[];
  categories: TaskCategoryDTO[];
  recurringSeries: RecurringTaskSeriesDTO[];
  loading: boolean;
  error: string | null;
  overview: {
    totalActive: number;
    completed: number;
    overdue: number;
    upcoming: number;
    byPriority: Record<string, number>;
  };
  search: string;
  setSearch: (s: string) => void;
  statusFilter: 'ALL' | TaskStatusType;
  setStatusFilter: (st: 'ALL' | TaskStatusType) => void;
  priorityFilter: string;
  setPriorityFilter: (p: string) => void;
  categoryFilter: string;
  setCategoryFilter: (c: string) => void;
  sortBy: 'dueDate' | 'priority' | 'createdAt' | 'title';
  setSortBy: (sb: 'dueDate' | 'priority' | 'createdAt' | 'title') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (so: 'asc' | 'desc') => void;
  showFilters: boolean;
  setShowFilters: (sf: boolean | ((p: boolean) => boolean)) => void;

  taskModalOpen: boolean;
  setTaskModalOpen: (open: boolean) => void;
  editingTask: TaskItemDTO | null;
  categoryModalOpen: boolean;
  setCategoryModalOpen: (open: boolean) => void;
  recurringModalOpen: boolean;
  setRecurringModalOpen: (open: boolean) => void;

  taskForm: {
    title: string;
    description: string;
    categoryId: string;
    estimatedMinutes: number;
    priority: Priority;
    status: TaskStatusType;
    preferredTime: TimeOfDay;
    energyRequirement: EnergyLevel;
    canSplit: boolean;
    minSessionMinutes: number;
    dueDate: string;
    isRecurring: boolean;
    frequency: RecurrenceFrequency;
    interval: number;
    daysOfWeek: number[];
    recurrenceEndDate: string;
  };
  setTaskForm: React.Dispatch<React.SetStateAction<any>>;

  catForm: { name: string; color: string };
  setCatForm: React.Dispatch<React.SetStateAction<{ name: string; color: string }>>;
  editingCatId: string | null;
  setEditingCatId: (id: string | null) => void;

  loadData: () => Promise<void>;
  handleToggleComplete: (task: TaskItemDTO) => Promise<void>;
  handleDeleteTask: (id: string) => Promise<void>;
  handleSaveTask: (e: React.FormEvent) => Promise<void>;
  openEditModal: (task: TaskItemDTO) => void;
  openNewTaskModal: () => void;
  handlePostpone: (task: TaskItemDTO, days: number) => Promise<void>;
  handleSaveCategory: (e: React.FormEvent) => Promise<void>;
  handleDeleteCategory: (id: string) => Promise<void>;
  handleDeleteSeries: (id: string) => Promise<void>;

  filteredTasks: TaskItemDTO[];
  isOverdue: (dueDate: string | null, status: TaskStatusType) => boolean;
}

export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<TaskItemDTO[]>([]);
  const [categories, setCategories] = useState<TaskCategoryDTO[]>([]);
  const [recurringSeries, setRecurringSeries] = useState<RecurringTaskSeriesDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TaskStatusType>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'createdAt' | 'title'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItemDTO | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [recurringModalOpen, setRecurringModalOpen] = useState(false);

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

  const [catForm, setCatForm] = useState({ name: '', color: '#38bdf8' });
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

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

  const handleToggleComplete = async (task: TaskItemDTO) => {
    const nextStatus: TaskStatusType = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    try {
      const updated = await apiRequest<TaskItemDTO>(`/api/tasks/${task.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      const ov = await apiRequest<any>('/api/tasks/overview');
      setOverview(ov);
    } catch (err: any) {
      alert(err.message || 'Failed to update task status');
    }
  };

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

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    try {
      if (taskForm.isRecurring && !editingTask) {
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

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (priorityFilter !== 'ALL') {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    if (categoryFilter !== 'ALL') {
      result = result.filter((t) => t.categoryId === categoryFilter);
    }

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
      return sortOrder === 'asc'
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [tasks, search, statusFilter, priorityFilter, categoryFilter, sortBy, sortOrder]);

  const isOverdue = (dueDate: string | null, status: TaskStatusType) => {
    if (!dueDate || status === 'COMPLETED' || status === 'CANCELED' || status === 'SKIPPED')
      return false;
    return new Date(dueDate).getTime() < Date.now();
  };

  return {
    tasks,
    categories,
    recurringSeries,
    loading,
    error,
    overview,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    categoryFilter,
    setCategoryFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    showFilters,
    setShowFilters,

    taskModalOpen,
    setTaskModalOpen,
    editingTask,
    categoryModalOpen,
    setCategoryModalOpen,
    recurringModalOpen,
    setRecurringModalOpen,

    taskForm,
    setTaskForm,
    catForm,
    setCatForm,
    editingCatId,
    setEditingCatId,

    loadData,
    handleToggleComplete,
    handleDeleteTask,
    handleSaveTask,
    openEditModal,
    openNewTaskModal,
    handlePostpone,
    handleSaveCategory,
    handleDeleteCategory,
    handleDeleteSeries,

    filteredTasks,
    isOverdue,
  };
}

