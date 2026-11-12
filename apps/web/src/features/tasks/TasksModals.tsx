import {
  X,
  CheckSquare,
  Tag,
  Repeat,
  Trash2,
  Edit2,
} from 'lucide-react';
import { Priority, TimeOfDay, EnergyLevel, RecurrenceFrequency } from '@tempo/shared';
import { UseTasksReturn } from './useTasks';

const PRESET_COLORS = [
  '#080808',
  '#262626',
  '#404040',
  '#525252',
  '#737373',
  '#a3a3a3',
];

export function TasksModals(props: UseTasksReturn) {
  const {
    categories,
    recurringSeries,
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
    handleSaveTask,
    handleSaveCategory,
    handleDeleteCategory,
    handleDeleteSeries,
  } = props;

  return (
    <>
      {/* Task Creation / Edit Modal */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#080808]/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-[#FFFFFF] border-t sm:border border-[#D9D9D9] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 max-w-lg w-full space-y-4 sm:space-y-5 shadow-xl text-[#080808] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEFEF]">
              <h3 className="text-base font-bold text-[#080808] flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#080808]" />
                <span>{editingTask ? 'Edit Task' : 'Create New Task'}</span>
              </h3>
              <button
                onClick={() => setTaskModalOpen(false)}
                className="p-1.5 rounded-lg text-[#777777] hover:text-[#080808] hover:bg-[#F5F5F5]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#404040] mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="e.g. Finish Algorithm Homework"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] placeholder-[#777777] focus:outline-none focus:border-[#080808] focus:bg-[#FFFFFF] text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-[#404040] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Add details, links, or notes..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] placeholder-[#777777] focus:outline-none focus:border-[#080808] focus:bg-[#FFFFFF] text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#404040] mb-1">Category</label>
                  <select
                    value={taskForm.categoryId}
                    onChange={(e) => setTaskForm({ ...taskForm, categoryId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] focus:outline-none focus:border-[#080808]"
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
                  <label className="block font-medium text-[#404040] mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, priority: e.target.value as Priority })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] focus:outline-none focus:border-[#080808]"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#404040] mb-1">
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
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] focus:outline-none focus:border-[#080808]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#404040] mb-1">
                    Deadline / Due Date
                  </label>
                  <input
                    type="datetime-local"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] focus:outline-none focus:border-[#080808]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#404040] mb-1">
                    Preferred Time of Day
                  </label>
                  <select
                    value={taskForm.preferredTime}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, preferredTime: e.target.value as TimeOfDay })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] focus:outline-none focus:border-[#080808]"
                  >
                    <option value="ANYTIME">Anytime</option>
                    <option value="MORNING">Morning</option>
                    <option value="AFTERNOON">Afternoon</option>
                    <option value="EVENING">Evening</option>
                    <option value="NIGHT">Night</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#404040] mb-1">
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
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] focus:outline-none focus:border-[#080808]"
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
                  className="rounded border-[#D9D9D9] text-[#080808] focus:ring-0"
                />
                <label htmlFor="canSplitCheck" className="text-[#404040] cursor-pointer">
                  Can be split into multiple work sessions
                </label>
              </div>

              {/* Recurrence config (only for new tasks) */}
              {!editingTask && (
                <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#080808] flex items-center gap-1.5">
                      <Repeat className="w-3.5 h-3.5 text-[#080808]" />
                      <span>Recurring Task</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={taskForm.isRecurring}
                      onChange={(e) =>
                        setTaskForm({ ...taskForm, isRecurring: e.target.checked })
                      }
                      className="rounded border-[#D9D9D9] text-[#080808] focus:ring-0"
                    />
                  </div>

                  {taskForm.isRecurring && (
                    <div className="space-y-3 pt-2 border-t border-[#EFEFEF]">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[#777777] mb-1">Frequency</label>
                          <select
                            value={taskForm.frequency}
                            onChange={(e) =>
                              setTaskForm({
                                ...taskForm,
                                frequency: e.target.value as RecurrenceFrequency,
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#D9D9D9] text-[#080808]"
                          >
                            <option value="DAILY">Daily</option>
                            <option value="WEEKLY">Weekly</option>
                            <option value="MONTHLY">Monthly</option>
                            <option value="CUSTOM">Custom Interval</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[#777777] mb-1">
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
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#D9D9D9] text-[#080808]"
                          />
                        </div>
                      </div>

                      {taskForm.frequency === 'WEEKLY' && (
                        <div>
                          <label className="block text-[#777777] mb-1">Active Weekdays</label>
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
                                      ? 'bg-[#080808] text-[#FFFFFF]'
                                      : 'bg-[#FFFFFF] border border-[#D9D9D9] text-[#777777] hover:text-[#080808]'
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
                  className="px-4 py-2 rounded-xl bg-[#FFFFFF] hover:bg-[#F5F5F5] border border-[#D9D9D9] text-[#080808] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#080808] hover:bg-[#171717] text-[#FFFFFF] font-semibold transition"
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
        <div className="fixed inset-0 z-50 bg-[#080808]/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#FFFFFF] border-t sm:border border-[#D9D9D9] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-xl text-[#080808] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEFEF]">
              <h3 className="text-base font-bold text-[#080808] flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#080808]" />
                <span>Manage Task Categories</span>
              </h3>
              <button
                onClick={() => setCategoryModalOpen(false)}
                className="p-1.5 rounded-lg text-[#777777] hover:text-[#080808] hover:bg-[#F5F5F5]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Category name (e.g. Work, College, Projects)..."
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-xs text-[#080808] placeholder-[#777777] focus:outline-none focus:border-[#080808]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#080808] hover:bg-[#171717] text-[#FFFFFF] font-semibold text-xs"
                >
                  {editingCatId ? 'Update' : 'Add'}
                </button>
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[11px] text-[#777777] mr-1">Shade:</span>
                {PRESET_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCatForm({ ...catForm, color: c })}
                    className={`w-5 h-5 rounded-full transition ${
                      catForm.color === c
                        ? 'ring-2 ring-[#080808] ring-offset-2 ring-offset-[#FFFFFF] scale-110'
                        : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </form>

            <div className="space-y-2 pt-2 border-t border-[#EFEFEF] max-h-60 overflow-y-auto">
              {categories.length === 0 ? (
                <p className="text-xs text-[#777777] text-center py-4">
                  No categories created yet.
                </p>
              ) : (
                categories.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="font-medium text-[#080808]">{c.name}</span>
                      <span className="text-[10px] text-[#777777]">
                        ({c.taskCount || 0} tasks)
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setEditingCatId(c.id);
                          setCatForm({ name: c.name, color: c.color });
                        }}
                        className="p-1 rounded text-[#777777] hover:text-[#080808]"
                        aria-label="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(c.id)}
                        className="p-1 rounded text-[#777777] hover:text-[#080808]"
                        aria-label="Delete"
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
        <div className="fixed inset-0 z-50 bg-[#080808]/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#FFFFFF] border-t sm:border border-[#D9D9D9] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 max-w-lg w-full space-y-4 shadow-xl text-[#080808] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEFEF]">
              <h3 className="text-base font-bold text-[#080808] flex items-center gap-2">
                <Repeat className="w-5 h-5 text-[#080808]" />
                <span>Recurring Task Series</span>
              </h3>
              <button
                onClick={() => setRecurringModalOpen(false)}
                className="p-1.5 rounded-lg text-[#777777] hover:text-[#080808] hover:bg-[#F5F5F5]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recurringSeries.length === 0 ? (
                <p className="text-xs text-[#777777] text-center py-6">
                  No recurring task series active. You can enable recurrence when creating a new
                  task.
                </p>
              ) : (
                recurringSeries.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#080808]">{s.title}</span>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#080808] text-[#FFFFFF]">
                          {s.frequency}
                        </span>
                        <button
                          onClick={() => handleDeleteSeries(s.id)}
                          className="p-1 rounded text-[#777777] hover:text-[#080808]"
                          title="Delete recurring series"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#777777]">
                      <span>Duration: {s.estimatedMinutes}m</span>
                      <span>Priority: {s.priority}</span>
                      {s.category && <span>Category: {s.category.name}</span>}
                      <span>Interval: {s.interval}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
