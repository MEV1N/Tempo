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
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#181818] text-[#080808] dark:text-[#F5F5F5] font-interface pb-28 transition-colors">
      <Navbar />

      <main className="max-w-xl mx-auto px-5 py-5 space-y-3.5">
        {/* 1. Header: Simple Title + Secondary Action Icons */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#080808] dark:text-[#F5F5F5]">Tasks</h1>
            <p className="text-xs text-[#777777] dark:text-[#929292]">Organize and track your daily priorities.</p>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCategoryModalOpen(true)}
              className="p-2 rounded-xl bg-[#FFFFFF] dark:bg-[#202020] border border-[#D9D9D9] dark:border-[#383838] text-[#404040] dark:text-[#BDBDBD] hover:text-[#080808] hover:dark:text-[#F5F5F5] hover:dark:bg-[#282828] transition min-w-[40px] min-h-[40px] flex items-center justify-center"
              title="Categories"
              aria-label="Manage Categories"
            >
              <Tag className="w-4 h-4" />
            </button>
            <button
              onClick={() => setRecurringModalOpen(true)}
              className="p-2 rounded-xl bg-[#FFFFFF] dark:bg-[#202020] border border-[#D9D9D9] dark:border-[#383838] text-[#404040] dark:text-[#BDBDBD] hover:text-[#080808] hover:dark:text-[#F5F5F5] hover:dark:bg-[#282828] transition min-w-[40px] min-h-[40px] flex items-center justify-center"
              title="Recurring Series"
              aria-label="Recurring Series"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Separate Full-Width New Task Action Row */}
        <div>
          <button
            onClick={openNewTaskModal}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-[#080808] dark:bg-[#F5F5F5] hover:bg-[#171717] dark:hover:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#181818] border border-[#080808] dark:border-[#F5F5F5] rounded-xl text-xs font-semibold shadow-xs transition min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>

        {/* 3. Compact Single-Line Summary */}
        <div className="flex items-center justify-between text-xs text-[#777777] dark:text-[#929292] font-medium px-1">
          <span>
            <strong className="text-[#080808] dark:text-[#F5F5F5] font-mono">{overview.totalActive}</strong> active ·{' '}
            <strong className="text-[#080808] dark:text-[#F5F5F5] font-mono">{overview.completed}</strong> completed
            {overview.overdue > 0 && (
              <span className="text-[#080808] dark:text-[#F5F5F5] font-bold"> · {overview.overdue} overdue</span>
            )}
          </span>
          <span className="text-[11px] font-mono">{filteredTasks.length} listed</span>
        </div>

        {/* 4. Search and Filter Bar */}
        <div className="bg-[#FFFFFF] dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#383838] rounded-xl p-3 space-y-2.5 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#777777] dark:text-[#929292] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#FAFAFA] dark:bg-[#202020] border border-[#D9D9D9] dark:border-[#383838] text-xs text-[#080808] dark:text-[#F5F5F5] placeholder-[#777777] dark:placeholder-[#929292] focus:outline-none focus:border-[#080808] dark:focus:border-[#929292] min-h-[38px]"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition min-h-[38px] ${
                showFilters ||
                categoryFilter !== 'ALL' ||
                priorityFilter !== 'ALL' ||
                sortBy !== 'dueDate'
                  ? 'bg-[#080808] dark:bg-[#F5F5F5] text-white dark:text-[#181818] border-[#080808] dark:border-[#F5F5F5]'
                  : 'bg-[#FAFAFA] dark:bg-[#202020] text-[#404040] dark:text-[#BDBDBD] border-[#D9D9D9] dark:border-[#383838] hover:bg-[#F5F5F5] hover:dark:bg-[#282828]'
              }`}
              title="Filters"
              aria-label="Filter options"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {(categoryFilter !== 'ALL' ||
                priorityFilter !== 'ALL' ||
                sortBy !== 'dueDate') && (
                <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#181818] ml-0.5" />
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
                    ? 'bg-[#080808] dark:bg-[#F5F5F5] text-[#FFFFFF] dark:text-[#181818] font-semibold border border-[#080808] dark:border-[#F5F5F5]'
                    : 'bg-[#FAFAFA] dark:bg-[#202020] text-[#777777] dark:text-[#929292] border border-[#D9D9D9] dark:border-[#383838] hover:text-[#080808] hover:dark:text-[#F5F5F5] hover:dark:bg-[#282828]'
                }`}
              >
                {st === 'ALL' ? 'All' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Expandable Advanced Filters Drawer */}
          {showFilters && (
            <div className="pt-2 border-t border-[#EFEFEF] dark:border-[#303030] space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#777777] dark:text-[#929292] block mb-1">
                    Category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-[#FAFAFA] dark:bg-[#202020] border border-[#D9D9D9] dark:border-[#383838] text-xs text-[#080808] dark:text-[#F5F5F5] focus:outline-none focus:border-[#080808] dark:focus:border-[#929292] min-h-[36px]"
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
                  <label className="text-[10px] uppercase font-bold text-[#777777] dark:text-[#929292] block mb-1">
                    Priority
                  </label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-[#FAFAFA] dark:bg-[#202020] border border-[#D9D9D9] dark:border-[#383838] text-xs text-[#080808] dark:text-[#F5F5F5] focus:outline-none focus:border-[#080808] dark:focus:border-[#929292] min-h-[36px]"
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
                <label className="text-[10px] uppercase font-bold text-[#777777] dark:text-[#929292] block mb-1">
                  Sort By
                </label>
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="flex-1 px-2 py-1.5 rounded-lg bg-[#FAFAFA] dark:bg-[#202020] border border-[#D9D9D9] dark:border-[#383838] text-xs text-[#080808] dark:text-[#F5F5F5] focus:outline-none focus:border-[#080808] dark:focus:border-[#929292] min-h-[36px]"
                  >
                    <option value="dueDate">Due Date</option>
                    <option value="priority">Priority</option>
                    <option value="createdAt">Created Date</option>
                    <option value="title">Title</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-1.5 rounded-lg bg-[#FAFAFA] dark:bg-[#202020] border border-[#D9D9D9] dark:border-[#383838] text-[#777777] dark:text-[#929292] hover:text-[#080808] hover:dark:text-[#F5F5F5] hover:dark:bg-[#282828] min-h-[36px] flex items-center justify-center"
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
          <div className="p-3 rounded-xl bg-[#F5F5F5] dark:bg-[#202020] border border-[#080808] dark:border-[#383838] text-[#080808] dark:text-[#F5F5F5] text-xs">
            {error}
          </div>
        )}

        {/* 5. Clean Unified Task List */}
        {loading ? (
          <div className="py-6 px-4 bg-[#FFFFFF] dark:bg-[#181818] border border-[#EAEAEA] dark:border-[#383838] rounded-2xl flex flex-col items-center justify-center space-y-2 text-center shadow-xs">
            <MobileAnimation
              name="tasks"
              alt="Tasks notebook animation"
              size={90}
              eager
              fallback={<Clock className="w-6 h-6 animate-spin text-[#080808] dark:text-[#F5F5F5]" />}
            />
            <p className="text-xs font-semibold text-[#080808] dark:text-[#F5F5F5]">Loading your tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-8 text-center bg-[#FFFFFF] dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#383838] rounded-2xl space-y-3 px-4 shadow-2xs">
            {tasks.length === 0 && !search && statusFilter === 'ALL' && priorityFilter === 'ALL' && categoryFilter === 'ALL' ? (
              <div className="flex justify-center mb-1">
                <MobileAnimation
                  name="tasks"
                  alt="Notebook drawing checkmarks animation"
                  size={90}
                  fallback={<CheckCircle2 className="w-8 h-8 text-[#080808] dark:text-[#F5F5F5] mx-auto opacity-40" />}
                />
              </div>
            ) : (
              <CheckCircle2 className="w-8 h-8 text-[#080808] dark:text-[#F5F5F5] mx-auto opacity-40" />
            )}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-[#080808] dark:text-[#F5F5F5]">
                {tasks.length === 0 && !search ? 'No tasks yet' : 'No tasks found'}
              </h3>
              <p className="text-xs text-[#777777] dark:text-[#BDBDBD] max-w-xs mx-auto">
                {search || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || categoryFilter !== 'ALL'
                  ? 'No tasks match current filter.'
                  : 'Your task list is clear. Tap New Task above to start organizing your day.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-[#FFFFFF] dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#383838] rounded-2xl divide-y divide-[#EFEFEF] dark:divide-[#303030] overflow-hidden shadow-2xs">
            {filteredTasks.map((t) => {
              const isCompleted = t.status === 'COMPLETED';
              const isSkipped = t.status === 'SKIPPED';
              const isInProgress = t.status === 'IN_PROGRESS';
              const overdue = isOverdue(t.dueDate, t.status);

              return (
                <div
                  key={t.id}
                  className={`p-3.5 flex items-start justify-between gap-2.5 transition border-l-[3px] ${
                    isCompleted || isSkipped
                      ? 'bg-[#FAFAFA] dark:bg-[#181818] opacity-65 border-l-transparent hover:dark:bg-[#202020]'
                      : overdue
                        ? 'bg-[#FFFDFD] dark:bg-[#181818] border-l-[#080808] dark:border-l-[#929292] hover:dark:bg-[#202020]'
                        : isInProgress
                          ? 'bg-white dark:bg-[#181818] border-l-[#404040] dark:border-l-[#BDBDBD] hover:dark:bg-[#202020]'
                          : 'bg-white dark:bg-[#181818] border-l-transparent hover:dark:bg-[#202020]'
                  }`}
                >
                  {/* Left: 44px Checkbox tap envelope + Task info */}
                  <div className="flex items-start space-x-2.5 flex-1 min-w-0">
                    <div className="relative flex items-center justify-center shrink-0 -m-2 p-2">
                      <button
                        onClick={() => handleToggleComplete(t)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                          isCompleted
                            ? 'bg-[#080808] dark:bg-[#F5F5F5] border-[#080808] dark:border-[#F5F5F5] text-[#FFFFFF] dark:text-[#181818]'
                            : overdue
                              ? 'border-[#080808] dark:border-[#929292] bg-white dark:bg-[#202020] hover:border-[#080808] dark:hover:border-[#F5F5F5]'
                              : 'border-[#777777] dark:border-[#383838] hover:border-[#080808] dark:hover:border-[#F5F5F5] bg-white dark:bg-[#202020]'
                        }`}
                        title={isCompleted ? 'Mark uncompleted' : 'Mark completed'}
                        aria-label={isCompleted ? 'Mark uncompleted' : 'Mark completed'}
                      >
                        {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        {/* Title wraps naturally */}
                        <span
                          className={`text-xs font-semibold leading-snug break-words ${
                            isCompleted
                              ? 'line-through text-[#777777] dark:text-[#929292]'
                              : 'text-[#080808] dark:text-[#F5F5F5]'
                          }`}
                        >
                          {t.title}
                        </span>

                        {/* Priority Indicators */}
                        {t.priority === 'URGENT' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#080808] dark:bg-[#F5F5F5] text-white dark:text-[#181818] border border-[#080808] dark:border-[#F5F5F5]">
                            Urgent
                          </span>
                        )}
                        {t.priority === 'HIGH' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#F5F5F5] dark:bg-[#282828] text-[#080808] dark:text-[#F5F5F5] border border-[#080808] dark:border-[#383838]">
                            High
                          </span>
                        )}
                        {t.priority === 'MEDIUM' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider bg-[#FAFAFA] dark:bg-[#202020] text-[#404040] dark:text-[#BDBDBD] border border-[#D9D9D9] dark:border-[#383838]">
                            Med
                          </span>
                        )}
                        {t.priority === 'LOW' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider bg-[#FAFAFA] dark:bg-[#202020] text-[#777777] dark:text-[#929292] border border-[#D9D9D9] dark:border-[#383838]">
                            Low
                          </span>
                        )}

                        {/* Status Indicators */}
                        {isInProgress && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-[#F5F5F5] dark:bg-[#202020] text-[#080808] dark:text-[#F5F5F5] border border-[#D9D9D9] dark:border-[#383838]">
                            In Progress
                          </span>
                        )}
                        {isSkipped && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-[#F5F5F5] dark:bg-[#202020] text-[#777777] dark:text-[#929292] border border-[#D9D9D9] dark:border-[#383838]">
                            Skipped
                          </span>
                        )}
                        {overdue && !isCompleted && !isSkipped && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#080808] dark:bg-[#282828] text-white dark:text-[#F5F5F5] border border-[#080808] dark:border-[#929292]">
                            Overdue
                          </span>
                        )}

                        {t.recurringSeriesId && (
                          <span className="text-[10px] text-[#777777] dark:text-[#929292]" title="Recurring Series">
                            <Repeat className="w-2.5 h-2.5 inline mr-0.5" />
                          </span>
                        )}
                      </div>

                      {/* Due date if present */}
                      {t.dueDate && (
                        <div
                          className={`flex items-center text-[10px] font-mono ${
                            overdue && !isCompleted
                              ? 'text-[#080808] dark:text-[#F5F5F5] font-semibold px-1.5 py-0.5 rounded bg-[#F5F5F5] dark:bg-[#202020] border border-[#D9D9D9] dark:border-[#383838]'
                              : 'text-[#777777] dark:text-[#929292]'
                          }`}
                        >
                          <Calendar className="w-2.5 h-2.5 mr-1 text-[#777777] dark:text-[#929292]" />
                          <span>
                            {new Date(t.dueDate).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </span>
                          {overdue && !isCompleted && <span className="ml-1 text-[#080808] dark:text-[#F5F5F5] font-bold">(Overdue)</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Compact Contextual Actions with accessible 44px tap envelopes */}
                  <div className="flex items-center space-x-1 shrink-0 -mr-1">
                    <button
                      onClick={() => handlePostpone(t, 1)}
                      className="px-2 py-1 rounded-md text-[10px] text-[#777777] dark:text-[#BDBDBD] hover:text-[#080808] hover:dark:text-[#F5F5F5] bg-[#FFFFFF] dark:bg-[#202020] hover:bg-[#F5F5F5] hover:dark:bg-[#282828] border border-[#D9D9D9] dark:border-[#383838] transition min-h-[36px] min-w-[36px] flex items-center justify-center font-mono"
                      title="Postpone +1d"
                      aria-label="Postpone deadline 1 day"
                    >
                      +1d
                    </button>
                    <button
                      onClick={() => openEditModal(t)}
                      className="p-1.5 rounded-md text-[#777777] dark:text-[#BDBDBD] hover:text-[#080808] hover:dark:text-[#F5F5F5] bg-[#FFFFFF] dark:bg-[#202020] hover:bg-[#F5F5F5] hover:dark:bg-[#282828] border border-transparent dark:border-[#383838] transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Edit task"
                      aria-label="Edit task"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(t.id)}
                      className="p-1.5 rounded-md text-[#777777] dark:text-[#BDBDBD] hover:text-[#080808] hover:dark:text-[#F5F5F5] bg-[#FFFFFF] dark:bg-[#202020] hover:bg-[#F5F5F5] hover:dark:bg-[#282828] border border-transparent dark:border-[#383838] transition min-h-[36px] min-w-[36px] flex items-center justify-center"
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
