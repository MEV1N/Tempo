import { useIsMobile } from '../hooks/useIsMobile';
import { useDashboard } from '../features/dashboard/useDashboard';
import { DashboardMobile } from '../features/dashboard/DashboardMobile';
import { DashboardDesktop } from '../features/dashboard/DashboardDesktop';

export function DashboardPage() {
  const isMobile = useIsMobile();
  const dashboardData = useDashboard();

  if (isMobile) {
    return <DashboardMobile {...dashboardData} />;
  }

  return <DashboardDesktop {...dashboardData} />;
}
