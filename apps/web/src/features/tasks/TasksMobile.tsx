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
import { MobileAnimation } from '../../components/MobileAnimation';
import { UseTasksReturn } from './useTasks';
import { TasksModals } from './TasksModals';

export function TasksMobile(props: UseTasksReturn) {
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
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#101010] text-[#080808] dark:text-[#F2F2F2] font-interface pb-28 transition-colors">
      <Navbar />

      <main className="max-w-xl mx-auto px-5 py-5 space-y-3.5">
        {/* 1. Header: Simple Title + Secondary Action Icons */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#080808]">Tasks</h1>
            <p className="text-xs text-[#777777]">Organize and track your daily priorities.</p>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCategoryModalOpen(true)}
              className="p-2 rounded-xl bg-[#FFFFFF] border border-[#D9D9D9] text-[#404040] hover:text-[#080808] transition min-w-[40px] min-h-[40px] flex items-center justify-center"
              title="Categories"
              aria-label="Manage Categories"
            >
              <Tag className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRecurringModalOpen(true)}
              className="p-2 rounded-xl bg-[#FFFFFF] border border-[#D9D9D9] text-[#404040] hover:text-[#080808] transition min-w-[40px] min-h-[40px] flex items-center justify-center"
              title="Recurring Series"
              aria-label="Recurring Series"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Separate Full-Width New Task Action Row (Never Clipped!) */}
        <div>
          <button
            onClick={openNewTaskModal}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-[#080808] hover:bg-[#171717] text-[#FFFFFF] rounded-xl text-xs font-semibold shadow-xs transition min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>

        {/* 3. Compact Single-Line Summary */}
        <div className="flex items-center justify-between text-xs text-[#777777] font-medium px-1">
          <span>
            <strong className="text-[#080808] font-mono">{overview.totalActive}</strong> active ·{' '}
            <strong className="text-[#080808] font-mono">{overview.completed}</strong> completed
            {overview.overdue > 0 && (
              <span className="text-[#080808] font-bold"> · {overview.overdue} overdue</span>
            )}
          </span>
          <span className="text-[11px] font-mono">{filteredTasks.length} listed</span>
        </div>

        {/* 4. Search and Filter Bar */}
        <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-xl p-3 space-y-2.5 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#777777] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#FAFAFA] border border-[#D9D9D9] text-xs text-[#080808] placeholder-[#777777] focus:outline-none focus:border-[#080808] min-h-[38px]"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition min-h-[38px] ${
                showFilters ||
                categoryFilter !== 'ALL' ||
                priorityFilter !== 'ALL' ||
                sortBy !== 'dueDate'
                  ? 'bg-[#080808] text-white border-[#080808]'
                  : 'bg-[#FAFAFA] text-[#404040] border-[#D9D9D9] hover:bg-[#F5F5F5]'
              }`}
              title="Filters"
              aria-label="Filter options"
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

          {/* Horizontally scrollable status pills without visible scrollbars */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {(['ALL', 'TODO', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition shrink-0 min-h-[32px] ${
                  statusFilter === st
                    ? 'bg-[#080808] text-[#FFFFFF] font-semibold'
                    : 'bg-[#FAFAFA] text-[#777777] border border-[#D9D9D9] hover:text-[#080808]'
                }`}
              >
                {st === 'ALL' ? 'All' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Expandable Advanced Filters Drawer */}
          {showFilters && (
            <div className="pt-2 border-t border-[#EFEFEF] space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#777777] block mb-1">
                    Category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-[#FAFAFA] border border-[#D9D9D9] text-xs text-[#080808] focus:outline-none focus:border-[#080808] min-h-[36px]"
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
                    className="w-full px-2 py-1.5 rounded-lg bg-[#FAFAFA] border border-[#D9D9D9] text-xs text-[#080808] focus:outline-none focus:border-[#080808] min-h-[36px]"
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="URGENT">Urgent</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-[#777777] block mb-1">
                  Sort By
                </label>
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="flex-1 px-2 py-1.5 rounded-lg bg-[#FAFAFA] border border-[#D9D9D9] text-xs text-[#080808] focus:outline-none focus:border-[#080808] min-h-[36px]"
                  >
                    <option value="dueDate">Due Date</option>
                    <option value="priority">Priority</option>
                    <option value="createdAt">Created Date</option>
                    <option value="title">Title</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-1.5 rounded-lg bg-[#FAFAFA] border border-[#D9D9D9] text-[#777777] hover:text-[#080808] min-h-[36px] flex items-center justify-center"
                    title="Toggle direction"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3 rounded-xl bg-[#F5F5F5] border border-[#080808] text-[#080808] text-xs">
            {error}
          </div>
        )}

        {/* 5. Clean Unified Task List */}
        {loading ? (
          <div className="py-6 px-4 bg-[#FFFFFF] dark:bg-[#181818] border border-[#EAEAEA] dark:border-[#2A2A2A] rounded-2xl flex flex-col items-center justify-center space-y-2 text-center shadow-xs">
            <MobileAnimation
              name="tasks"
              alt="Tasks notebook animation"
              size={56}
              eager
              fallback={<Clock className="w-5 h-5 animate-spin text-[#080808] dark:text-[#F3F3F3]" />}
            />
            <p className="text-xs font-semibold text-[#080808] dark:text-[#F3F3F3]">Loading your tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-8 text-center bg-[#FFFFFF] border border-[#D9D9D9] rounded-2xl space-y-3 px-4 shadow-2xs">
            {tasks.length === 0 && !search && statusFilter === 'ALL' && priorityFilter === 'ALL' && categoryFilter === 'ALL' ? (
              <div className="flex justify-center mb-1">
                <MobileAnimation
                  name="tasks"
                  alt="Notebook drawing checkmarks animation"
                  size={56}
                  fallback={<CheckCircle2 className="w-6 h-6 text-[#080808] mx-auto opacity-40" />}
                />
              </div>
            ) : (
              <CheckCircle2 className="w-6 h-6 text-[#080808] mx-auto opacity-40" />
            )}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-[#080808]">
                {tasks.length === 0 && !search ? 'No tasks yet' : 'No tasks found'}
              </h3>
              <p className="text-xs text-[#777777] max-w-xs mx-auto">
                {search || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || categoryFilter !== 'ALL'
                  ? 'No tasks match current filter.'
                  : 'Your task list is clear. Tap New Task above to start organizing your day.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-2xl divide-y divide-[#EFEFEF] overflow-hidden shadow-2xs">
            {filteredTasks.map((t) => {
              const overdue = isOverdue(t.dueDate, t.status);
              return (
                <div
                  key={t.id}
                  className={`p-3.5 flex items-start justify-between gap-2.5 transition ${
                    t.status === 'COMPLETED'
                      ? 'bg-[#FAFAFA] opacity-70'
                      : overdue
                        ? 'bg-[#FFFDFD]'
                        : 'bg-white'
                  }`}
                >
                  {/* Left: 44px Checkbox tap envelope + Task info */}
                  <div className="flex items-start space-x-2.5 flex-1 min-w-0">
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

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        {/* Title wraps naturally */}
                        <span
                          className={`text-xs font-semibold leading-snug break-words ${
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
                          <span className="text-[10px] text-[#777777]" title="Recurring">
                            <Repeat className="w-2.5 h-2.5 inline" />
                          </span>
                        )}
                      </div>

                      {/* Due date if present */}
                      {t.dueDate && (
                        <div
                          className={`flex items-center text-[10px] font-mono ${
                            overdue ? 'text-[#080808] font-bold' : 'text-[#777777]'
                          }`}
                        >
                          <Calendar className="w-2.5 h-2.5 mr-1" />
                          <span>
                            {new Date(t.dueDate).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </span>
                          {overdue && <span className="ml-1 text-[#080808] font-bold">(Overdue)</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Compact Contextual Actions with accessible 44px tap envelopes */}
                  <div className="flex items-center space-x-1 shrink-0 -mr-1">
                    <button
                      onClick={() => handlePostpone(t, 1)}
                      className="px-2 py-1 rounded-md text-[10px] text-[#777777] hover:text-[#080808] border border-[#D9D9D9] transition min-h-[36px] min-w-[36px] flex items-center justify-center font-mono"
                      title="Postpone +1d"
                      aria-label="Postpone deadline 1 day"
                    >
                      +1d
                    </button>
                    <button
                      onClick={() => openEditModal(t)}
                      className="p-1.5 rounded-md text-[#777777] hover:text-[#080808] transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Edit task"
                      aria-label="Edit task"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(t.id)}
                      className="p-1.5 rounded-md text-[#777777] hover:text-[#080808] transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Delete task"
                      aria-label="Delete task"
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
  );
}
