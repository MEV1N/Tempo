import { Navbar } from '../../components/Navbar';
import {
  Plus,
  Search,
  Calendar,
  Tag,
  Repeat,
  Trash2,
  Edit2,
  CheckCircle2,
  ArrowUpDown,
  SlidersHorizontal,
  Clock,
} from 'lucide-react';
import { TempoAnimation } from '../../components/TempoAnimation';
import { UseTasksReturn } from './useTasks';
import { TasksModals } from './TasksModals';

export function TasksDesktop(props: UseTasksReturn) {
  const {
    tasks,
    categories,
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
    setCategoryModalOpen,
    setRecurringModalOpen,
    openEditModal,
    openNewTaskModal,
    handleToggleComplete,
    handleDeleteTask,
    handlePostpone,
    filteredTasks,
    isOverdue,
  } = props;

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#101010] text-[#080808] dark:text-[#F5F5F5] font-interface transition-colors">
      <Navbar />

      <div className="md:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 max-w-6xl w-full mx-auto px-6 lg:px-8 py-8 space-y-6 pb-12">
          {/* Desktop Header */}
          <div className="flex items-center justify-between gap-4 pb-6 border-b border-[#D9D9D9]">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#F5F5F5] text-[#080808] border border-[#D9D9D9]">
                  Task Engine
                </span>
                <span className="text-xs text-[#777777]">
                  Priorities, Categories & Series
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#080808] mt-1 flex items-baseline gap-2">
                <span>Task Manager</span>
                <span className="font-handwritten text-3xl font-normal text-[#777777]">
                  and priorities
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCategoryModalOpen(true)}
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-[#FFFFFF] hover:bg-[#F5F5F5] text-[#080808] text-xs font-medium border border-[#D9D9D9] transition min-h-[40px]"
                title="Manage Categories"
              >
                <Tag className="w-4 h-4 text-[#404040]" />
                <span className="ml-1.5">Categories</span>
              </button>
              <button
                onClick={() => setRecurringModalOpen(true)}
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-[#FFFFFF] hover:bg-[#F5F5F5] text-[#080808] text-xs font-medium border border-[#D9D9D9] transition min-h-[40px]"
                title="Recurring Series"
              >
                <Repeat className="w-4 h-4 text-[#404040]" />
                <span className="ml-1.5">Recurring</span>
              </button>
              <button
                onClick={openNewTaskModal}
                className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-[#080808] hover:bg-[#171717] text-[#FFFFFF] text-xs font-semibold shadow-xs transition min-h-[40px]"
              >
                <Plus className="w-4 h-4" />
                <span>New Task</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-[#F5F5F5] border border-[#080808] text-[#080808] text-xs">
              {error}
            </div>
          )}

          {/* Desktop 4 Stats Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#D9D9D9] shadow-xs">
              <p className="text-[11px] font-medium text-[#777777] uppercase">Active Tasks</p>
              <p className="text-xl font-bold text-[#080808] mt-0.5">{overview.totalActive}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#D9D9D9] shadow-xs">
              <p className="text-[11px] font-medium text-[#777777] uppercase">Completed</p>
              <p className="text-xl font-bold text-[#080808] mt-0.5">{overview.completed}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#080808] shadow-xs">
              <p className="text-[11px] font-bold text-[#080808] uppercase">Overdue</p>
              <p className="text-xl font-bold text-[#080808] mt-0.5">{overview.overdue}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#D9D9D9] shadow-xs">
              <p className="text-[11px] font-medium text-[#777777] uppercase">Upcoming</p>
              <p className="text-xl font-bold text-[#080808] mt-0.5">{overview.upcoming}</p>
            </div>
          </div>

          {/* Desktop Filter & Search Bar */}
          <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#777777] absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-xs text-[#080808] placeholder-[#777777] focus:outline-none focus:border-[#080808] focus:bg-[#FFFFFF] transition min-h-[38px]"
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition min-h-[38px] ${
                  showFilters ||
                  categoryFilter !== 'ALL' ||
                  priorityFilter !== 'ALL' ||
                  sortBy !== 'dueDate'
                    ? 'bg-[#080808] text-white border-[#080808]'
                    : 'bg-[#FAFAFA] text-[#404040] border-[#D9D9D9] hover:bg-[#F5F5F5]'
                }`}
                title="Filter and Sort Options"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters</span>
                {(categoryFilter !== 'ALL' ||
                  priorityFilter !== 'ALL' ||
                  sortBy !== 'dueDate') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5" />
                )}
              </button>
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 py-0.5">
              {(['ALL', 'TODO', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition shrink-0 min-h-[32px] ${
                    statusFilter === st
                      ? 'bg-[#080808] text-[#FFFFFF] font-semibold'
                      : 'bg-[#FAFAFA] text-[#777777] border border-[#D9D9D9] hover:text-[#080808] hover:bg-[#F5F5F5]'
                  }`}
                >
                  {st === 'ALL' ? 'All Tasks' : st.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Advanced Filters Expandable Area */}
            {showFilters && (
              <div className="pt-2 border-t border-[#EFEFEF] grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#777777] block mb-1">
                    Category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAFAFA] border border-[#D9D9D9] text-xs text-[#080808] focus:outline-none focus:border-[#080808] min-h-[36px]"
                  >
                    <option value="ALL">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[#777777] block mb-1">
                    Priority
                  </label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAFAFA] border border-[#D9D9D9] text-xs text-[#080808] focus:outline-none focus:border-[#080808] min-h-[36px]"
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="URGENT">Urgent</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[#777777] block mb-1">
                    Sort Order
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#FAFAFA] border border-[#D9D9D9] text-xs text-[#080808] focus:outline-none focus:border-[#080808] min-h-[36px]"
                    >
                      <option value="dueDate">Due Date</option>
                      <option value="priority">Priority</option>
                      <option value="createdAt">Created Date</option>
                      <option value="title">Title</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#FAFAFA] border border-[#D9D9D9] text-[#777777] hover:text-[#080808] min-h-[36px]"
                      title="Toggle Sort Direction"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Task List */}
          {loading ? (
            <div className="p-12 text-center bg-[#FFFFFF] dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#2A2A2A] rounded-2xl flex flex-col items-center justify-center space-y-3 shadow-xs">
              <TempoAnimation
                name="tasks"
                alt="Tasks notebook animation"
                size={64}
                eager
                fallback={<Clock className="w-6 h-6 mx-auto animate-spin text-[#080808] dark:text-[#F3F3F3]" />}
              />
              <p className="text-xs font-semibold text-[#080808] dark:text-[#F3F3F3]">Loading tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center bg-[#FFFFFF] dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#2A2A2A] rounded-2xl space-y-3 shadow-xs">
              {tasks.length === 0 && !search && statusFilter === 'ALL' && priorityFilter === 'ALL' && categoryFilter === 'ALL' ? (
                <div className="flex justify-center mb-1">
                  <TempoAnimation
                    name="tasks"
                    alt="Notebook drawing checkmarks animation"
                    size={72}
                    fallback={<CheckCircle2 className="w-8 h-8 text-[#080808] dark:text-[#F3F3F3] mx-auto opacity-40" />}
                  />
                </div>
              ) : (
                <CheckCircle2 className="w-8 h-8 text-[#080808] dark:text-[#F3F3F3] mx-auto opacity-40" />
              )}
              <h3 className="text-sm font-semibold text-[#080808] dark:text-[#F3F3F3]">
                {tasks.length === 0 && !search ? 'No tasks yet' : 'No tasks found'}
              </h3>
              <p className="text-xs text-[#777777] dark:text-[#A3A3A3] max-w-sm mx-auto">
                {search || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || categoryFilter !== 'ALL'
                  ? 'No tasks match your current filter criteria.'
                  : 'Start by creating your first task or recurring series to begin planning your rhythm.'}
              </p>
              <button
                onClick={openNewTaskModal}
                className="mt-2 px-4 py-2 bg-[#080808] dark:bg-[#F3F3F3] hover:bg-[#171717] dark:hover:bg-[#E5E5E5] text-[#FFFFFF] dark:text-[#080808] text-xs font-semibold rounded-xl shadow-xs transition"
              >
                Create First Task
              </button>
            </div>
          ) : (
            <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-2xl divide-y divide-[#EFEFEF] overflow-hidden shadow-xs">
              {filteredTasks.map((t) => {
                const overdue = isOverdue(t.dueDate, t.status);
                return (
                  <div
                    key={t.id}
                    className={`p-4 flex items-start justify-between gap-3 transition ${
                      t.status === 'COMPLETED'
                        ? 'bg-[#FAFAFA] opacity-70'
                        : overdue
                          ? 'bg-[#FFFDFD]'
                          : 'bg-white hover:bg-[#FAFAFA]'
                    }`}
                  >
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div className="relative flex items-center justify-center shrink-0 -m-2 p-2">
                        <button
                          onClick={() => handleToggleComplete(t)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                            t.status === 'COMPLETED'
                              ? 'bg-[#080808] border-[#080808] text-[#FFFFFF]'
                              : overdue
                                ? 'border-[#080808] bg-white'
                                : 'border-[#777777] hover:border-[#080808] bg-white'
                          }`}
                          title={t.status === 'COMPLETED' ? 'Mark uncompleted' : 'Mark completed'}
                          aria-label={t.status === 'COMPLETED' ? 'Mark uncompleted' : 'Mark completed'}
                        >
                          {t.status === 'COMPLETED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span
                            className={`text-sm font-semibold tracking-tight ${
                              t.status === 'COMPLETED'
                                ? 'line-through text-[#777777]'
                                : 'text-[#080808]'
                            }`}
                          >
                            {t.title}
                          </span>

                          {t.priority === 'URGENT' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-[#080808] text-white">
                              Urgent
                            </span>
                          )}
                          {t.priority === 'HIGH' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-[#F5F5F5] text-[#080808] border border-[#080808]">
                              High
                            </span>
                          )}

                          {t.recurringSeriesId && (
                            <span
                              className="inline-flex items-center text-[10px] text-[#777777]"
                              title="Recurring"
                            >
                              <Repeat className="w-2.5 h-2.5 mr-0.5" />
                            </span>
                          )}
                        </div>

                        {t.description && (
                          <p className="text-xs text-[#555555] line-clamp-1 leading-relaxed">
                            {t.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-[11px] text-[#777777] flex-wrap pt-0.5">
                          {t.dueDate && (
                            <span
                              className={`inline-flex items-center font-mono ${
                                overdue ? 'text-[#080808] font-bold' : ''
                              }`}
                            >
                              <Calendar className="w-3 h-3 mr-1 text-[#777777]" />
                              {new Date(t.dueDate).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                              {overdue && ' (Overdue)'}
                            </span>
                          )}

                          {t.category && <span>• {t.category.name}</span>}

                          {t.estimatedMinutes && (
                            <span className="font-mono">• {t.estimatedMinutes}m</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0 pt-0.5">
                      <button
                        onClick={() => handlePostpone(t, 1)}
                        className="px-2 py-1 rounded-lg text-[11px] text-[#777777] hover:text-[#080808] hover:bg-[#F5F5F5] border border-[#D9D9D9] transition min-h-[34px]"
                        title="Postpone deadline +1 day"
                      >
                        +1d
                      </button>

                      <button
                        onClick={() => openEditModal(t)}
                        className="p-1.5 rounded-lg text-[#777777] hover:text-[#080808] hover:bg-[#F5F5F5] transition min-h-[34px] min-w-[34px] flex items-center justify-center"
                        title="Edit task"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="p-1.5 rounded-lg text-[#777777] hover:text-[#080808] hover:bg-[#F5F5F5] transition min-h-[34px] min-w-[34px] flex items-center justify-center"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <TasksModals {...props} />
        </main>
      </div>
    </div>
  );
}
