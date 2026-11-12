import { useSchedule } from '../features/schedule/useSchedule';
import { ScheduleDesktop } from '../features/schedule/ScheduleDesktop';
import { ScheduleMobile } from '../features/schedule/ScheduleMobile';
import { useIsMobile } from '../hooks/useIsMobile';

export function SchedulePage() {
  const scheduleProps = useSchedule();
  const isMobile = useIsMobile();

  return isMobile ? (
    <ScheduleMobile {...scheduleProps} />
  ) : (
    <ScheduleDesktop {...scheduleProps} />
  );
}
