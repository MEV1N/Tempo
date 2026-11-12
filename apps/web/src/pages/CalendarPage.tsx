import { useCalendar } from '../features/calendar/useCalendar';
import { CalendarDesktop } from '../features/calendar/CalendarDesktop';
import { CalendarMobile } from '../features/calendar/CalendarMobile';
import { useIsMobile } from '../hooks/useIsMobile';

export function CalendarPage() {
  const calendarProps = useCalendar();
  const isMobile = useIsMobile();

  return isMobile ? (
    <CalendarMobile {...calendarProps} />
  ) : (
    <CalendarDesktop {...calendarProps} />
  );
}
