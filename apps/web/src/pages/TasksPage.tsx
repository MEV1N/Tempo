import { useTasks } from '../features/tasks/useTasks';
import { TasksDesktop } from '../features/tasks/TasksDesktop';
import { TasksMobile } from '../features/tasks/TasksMobile';
import { useIsMobile } from '../hooks/useIsMobile';

export function TasksPage() {
  const tasksProps = useTasks();
  const isMobile = useIsMobile();

  return isMobile ? (
    <TasksMobile {...tasksProps} />
  ) : (
    <TasksDesktop {...tasksProps} />
  );
}
