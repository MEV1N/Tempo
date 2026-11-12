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
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#181818] text-[#080808] dark:text-[#F5F5F5] font-interface transition-colors">
      <Navbar />

      <div className="md:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 max-w-6xl w-full mx-auto px-6 lg:px-8 py-8 space-y-6 pb-12">
          {/* Desktop Header */}
          <div className="flex items-center justify-between gap-4 pb-6 border-b border-[#D9D9D9] dark:border-[#383838]">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#F5F5F5] dark:bg-[#202020] text-[#080808] dark:text-[#F5F5F5] border border-[#D9D9D9] dark:border-[#383838]">
                  Task Engine
                </span>
                <span className="text-xs text-[#777777] dark:text-[#929292]">
                  Priorities, Categories & Series
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#080808] dark:text-[#F5F5F5] mt-1 flex items-baseline gap-2">
                <span>Task Manager</span>
                <span className="font-handwritten text-3xl font-normal text-[#777777] dark:text-[#929292]">
                  and priorities
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCategoryModalOpen(true)}
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-[#FFFFFF] dark:bg-[#202020] hover:bg-[#F5F5F5] hover:dark:bg-[#282828] text-[#080808] dark:text-[#F5F5F5] text-xs font-medium border border-[#D9D9D9] dark:border-[#383838] transition min-h-[40px]"
                title="Manage Categories"
              >
                <Tag className="w-4 h-4 text-[#404040] dark:text-[#BDBDBD]" />
                <span className="ml-1.5">Categories</span>
              </button>
              <button
                onClick={() => setRecurringModalOpen(true)}
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl bg-[#FFFFFF] dark:bg-[#202020] hover:bg-[#F5F5F5] hover:dark:bg-[#282828] text-[#080808] dark:text-[#F5F5F5] text-xs font-medium border border-[#D9D9D9] dark:border-[#383838] transition min-h-[40px]"
                title="Recurring Series"
              >
                <Repeat className="w-4 h-4 text-[#404040] dark:text-[#BDBDBD]" />
                <span className="ml-1.5">Recurring</span>
              </button>
              <button
                onClick={openNewTaskModal}
                className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-[#080808] dark:bg-[#F5F5F5] hover:bg-[#171717] dark:hover:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#181818] border border-[#080808] dark:border-[#F5F5F5] text-xs font-semibold shadow-xs transition min-h-[40px]"
              >
                <Plus className="w-4 h-4" />
                <span>New Task</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-[#F5F5F5] dark:bg-[#202020] border border-[#080808] dark:border-[#383838] text-[#080808] dark:text-[#F5F5F5] text-xs">
              {error}
            </div>
          )}

          {/* Desktop 4 Stats Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#FFFFFF] dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#383838] shadow-xs">
              <p className="text-[11px] font-medium text-[#777777] dark:text-[#929292] uppercase">Active Tasks</p>
              <p className="text-xl font-bold text-[#080808] dark:text-[#F5F5F5] mt-0.5">{overview.totalActive}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#FFFFFF] dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#383838] shadow-xs">
              <p className="text-[11px] font-medium text-[#777777] dark:text-[#929292] uppercase">Completed</p>
              <p className="text-xl font-bold text-[#080808] dark:text-[#F5F5F5] mt-0.5">{overview.completed}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#FFFFFF] dark:bg-[#181818] border border-[#080808] dark:border-[#929292] shadow-xs">
              <p className="text-[11px] font-bold text-[#080808] dark:text-[#F5F5F5] uppercase">Overdue</p>
              <p className="text-xl font-bold text-[#080808] dark:text-[#F5F5F5] mt-0.5">{overview.overdue}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#FFFFFF] dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#383838] shadow-xs">
              <p className="text-[11px] font-medium text-[#777777] dark:text-[#929292] uppercase">Upcoming</p>
              <p className="text-xl font-bold text-[#080808] dark:text-[#F5F5F5] mt-0.5">{overview.upcoming}</p>
            </div>
          </div>

          {/* Desktop Filter & Search Bar */}
          <div className="bg-[#FFFFFF] dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#383838] rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#777777] dark:text-[#929292] absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-[#FAFAFA] dark:bg-[#202020] border border-[#D9D9D9] dark:border-[#383838] text-xs text-[#080808] dark:text-[#F5F5F5] placeholder-[#777777] dark:placeholder-[#929292] focus:outline-none focus:border-[#080808] dark:focus:border-[#929292] focus:bg-[#FFFFFF] dark:focus:bg-[#202020] transition min-h-[38px]"
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition min-h-[38px] ${
                  showFilters ||
                  categoryFilter !== 'ALL' ||
                  priorityFilter !== 'ALL' ||
                  sortBy !== 'dueDate'
                    ? 'bg-[#080808] dark:bg-[#F5F5F5] text-white dark:text-[#181818] border-[#080808] dark:border-[#F5F5F5]'
                    : 'bg-[#FAFAFA] dark:bg-[#202020] text-[#404040] dark:text-[#BDBDBD] border-[#D9D9D9] dark:border-[#383838] hover:bg-[#F5F5F5] hover:dark:bg-[#282828]'
                }`}
                title="Filter and Sort Options"
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

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 py-0.5">
              {(['ALL', 'TODO', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition shrink-0 min-h-[32px] ${
                    statusFilter === st
                      ? 'bg-[#080808] dark:bg-[#F5F5F5] text-[#FFFFFF] dark:text-[#181818] font-semibold border border-[#080808] dark:border-[#F5F5F5]'
                      : 'bg-[#FAFAFA] dark:bg-[#202020] text-[#777777] dark:text-[#929292] border border-[#D9D9D9] dark:border-[#383838] hover:text-[#080808] hover:dark:text-[#F5F5F5] hover:bg-[#F5F5F5] hover:dark:bg-[#282828]'
                  }`}
                >
                  {st === 'ALL' ? 'All Tasks' : st.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Advanced Filters Expandable Area */}
            {showFilters && (
              <div className="pt-2 border-t border-[#EFEFEF] dark:border-[#303030] grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[#777777] dark:text-[#929292] block mb-1">
                    Category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAFAFA] dark:bg-[#202020] border border-[#D9D9D9] dark:border-[#383838] text-xs text-[#080808] dark:text-[#F5F5F5] focus:outline-none focus:border-[#080808] dark:focus:border-[#929292] min-h-[36px]"
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
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAFAFA] dark:bg-[#202020] border border-[#D9D9D9] dark:border-[#383838] text-xs text-[#080808] dark:text-[#F5F5F5] focus:outline-none focus:border-[#080808] dark:focus:border-[#929292] min-h-[36px]"
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="URGENT">Urgent</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-[#777777] dark:text-[#929292] block mb-1">
                    Sort Order
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#FAFAFA] dark:bg-[#202020] border border-[#D9D9D9] dark:border-[#383838] text-xs text-[#080808] dark:text-[#F5F5F5] focus:outline-none focus:border-[#080808] dark:focus:border-[#929292] min-h-[36px]"
                    >
                      <option value="dueDate">Due Date</option>
                      <option value="priority">Priority</option>
                      <option value="createdAt">Created Date</option>
                      <option value="title">Title</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#FAFAFA] dark:bg-[#202020] border border-[#D9D9D9] dark:border-[#383838] text-[#777777] dark:text-[#929292] hover:text-[#080808] hover:dark:text-[#F5F5F5] hover:dark:bg-[#282828] min-h-[36px]"
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
            <div className="p-12 text-center bg-[#FFFFFF] dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#383838] rounded-2xl flex flex-col items-center justify-center space-y-3 shadow-xs">
              <TempoAnimation
                name="tasks"
                alt="Tasks notebook animation"
                size={110}
                eager
                fallback={<Clock className="w-8 h-8 mx-auto animate-spin text-[#080808] dark:text-[#F5F5F5]" />}
              />
              <p className="text-xs font-semibold text-[#080808] dark:text-[#F5F5F5]">Loading tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center bg-[#FFFFFF] dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#383838] rounded-2xl space-y-3 shadow-xs">
              {tasks.length === 0 && !search && statusFilter === 'ALL' && priorityFilter === 'ALL' && categoryFilter === 'ALL' ? (
                <div className="flex justify-center mb-1">
                  <TempoAnimation
                    name="tasks"
                    alt="Notebook drawing checkmarks animation"
                    size={110}
                    fallback={<CheckCircle2 className="w-8 h-8 text-[#080808] dark:text-[#F5F5F5] mx-auto opacity-40" />}
                  />
                </div>
              ) : (
                <CheckCircle2 className="w-8 h-8 text-[#080808] dark:text-[#F5F5F5] mx-auto opacity-40" />
              )}
              <h3 className="text-sm font-semibold text-[#080808] dark:text-[#F5F5F5]">
                {tasks.length === 0 && !search ? 'No tasks yet' : 'No tasks found'}
              </h3>
              <p className="text-xs text-[#777777] dark:text-[#BDBDBD] max-w-sm mx-auto">
                {search || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || categoryFilter !== 'ALL'
                  ? 'No tasks match your current filter criteria.'
                  : 'Start by creating your first task or recurring series to begin planning your rhythm.'}
              </p>
              <button
                onClick={openNewTaskModal}
                className="mt-2 px-4 py-2 bg-[#080808] dark:bg-[#F5F5F5] hover:bg-[#171717] dark:hover:bg-[#E5E5E5] text-[#FFFFFF] dark:text-[#181818] text-xs font-semibold rounded-xl shadow-xs transition"
              >
                Create First Task
              </button>
            </div>
          ) : (
            <div className="bg-[#FFFFFF] dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#383838] rounded-2xl divide-y divide-[#EFEFEF] dark:divide-[#303030] overflow-hidden shadow-xs">
              {filteredTasks.map((t) => {
                const isCompleted = t.status === 'COMPLETED';
                const isSkipped = t.status === 'SKIPPED';
                const isInProgress = t.status === 'IN_PROGRESS';
                const overdue = isOverdue(t.dueDate, t.status);

                return (
                  <div
                    key={t.id}
                    className={`p-4 flex items-start justify-between gap-3 transition border-l-[3px] ${
                      isCompleted || isSkipped
                        ? 'bg-[#FAFAFA] dark:bg-[#181818] opacity-65 border-l-transparent hover:bg-[#F5F5F5] hover:dark:bg-[#202020]'
                        : overdue
                          ? 'bg-[#FFFDFD] dark:bg-[#181818] border-l-[#080808] dark:border-l-[#929292] hover:bg-[#F5F5F5] hover:dark:bg-[#202020]'
                          : isInProgress
                            ? 'bg-white dark:bg-[#181818] border-l-[#404040] dark:border-l-[#BDBDBD] hover:bg-[#FAFAFA] hover:dark:bg-[#202020]'
                            : 'bg-white dark:bg-[#181818] border-l-transparent hover:bg-[#FAFAFA] hover:dark:bg-[#202020]'
                    }`}
                  >
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
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

                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span
                            className={`text-sm font-semibold tracking-tight ${
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
                            <span
                              className="inline-flex items-center text-[10px] text-[#777777] dark:text-[#929292]"
                              title="Recurring Series"
                            >
                              <Repeat className="w-2.5 h-2.5 mr-0.5" />
                              <span className="hidden sm:inline">Recurring</span>
                            </span>
                          )}
                        </div>

                        {t.description && (
                          <p className="text-xs text-[#555555] dark:text-[#BDBDBD] line-clamp-1 leading-relaxed">
                            {t.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-[11px] text-[#777777] dark:text-[#929292] flex-wrap pt-0.5">
                          {t.dueDate && (
                            <span
                              className={`inline-flex items-center font-mono ${
                                overdue && !isCompleted
                                  ? 'text-[#080808] dark:text-[#F5F5F5] font-semibold px-1.5 py-0.5 rounded bg-[#F5F5F5] dark:bg-[#202020] border border-[#D9D9D9] dark:border-[#383838]'
                                  : 'text-[#777777] dark:text-[#929292]'
                              }`}
                            >
                              <Calendar className="w-3 h-3 mr-1 text-[#777777] dark:text-[#929292]" />
                              {new Date(t.dueDate).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                              {overdue && !isCompleted && ' (Overdue)'}
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
                        className="px-2 py-1 rounded-lg text-[11px] font-mono text-[#777777] dark:text-[#BDBDBD] hover:text-[#080808] hover:dark:text-[#F5F5F5] bg-[#FFFFFF] dark:bg-[#202020] hover:bg-[#F5F5F5] hover:dark:bg-[#282828] border border-[#D9D9D9] dark:border-[#383838] transition min-h-[34px]"
                        title="Postpone deadline +1 day"
                        aria-label="Postpone deadline 1 day"
                      >
                        +1d
                      </button>

                      <button
                        onClick={() => openEditModal(t)}
                        className="p-1.5 rounded-lg text-[#777777] dark:text-[#BDBDBD] hover:text-[#080808] hover:dark:text-[#F5F5F5] bg-[#FFFFFF] dark:bg-[#202020] hover:bg-[#F5F5F5] hover:dark:bg-[#282828] border border-transparent dark:border-[#383838] transition min-h-[34px] min-w-[34px] flex items-center justify-center"
                        title="Edit task"
                        aria-label="Edit task"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="p-1.5 rounded-lg text-[#777777] dark:text-[#BDBDBD] hover:text-[#080808] hover:dark:text-[#F5F5F5] bg-[#FFFFFF] dark:bg-[#202020] hover:bg-[#F5F5F5] hover:dark:bg-[#282828] border border-transparent dark:border-[#383838] transition min-h-[34px] min-w-[34px] flex items-center justify-center"
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
    </div>
  );
}
