import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User,
  LogOut,
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Sparkles,
  BarChart3,
  Settings,
} from 'lucide-react';
import { TempoLogo } from './TempoLogo';
import { NotificationCenter } from './NotificationCenter';
import { OfflineIndicator } from './OfflineIndicator';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  const isActive = (path: string) => {
    if (path === '/profile') {
      return location.pathname === '/profile' || location.pathname === '/settings';
    }
    return location.pathname === path;
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare },
    { path: '/schedule', label: 'Schedule', icon: Sparkles },
    { path: '/calendar', label: 'Calendar', icon: Calendar },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  // Mobile bottom bar: 5 streamlined primary destinations (Analytics is linked via Profile & Dashboard)
  const mobileNavItems = [
    { path: '/', label: 'Today', icon: LayoutDashboard },
    { path: '/schedule', label: 'Schedule', icon: Sparkles },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare },
    { path: '/calendar', label: 'Calendar', icon: Calendar },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. DESKTOP LEFT SIDEBAR (Fixed w-64 on md: and above)                      */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-64 bg-[#FFFFFF] dark:bg-[#141414] border-r border-[#D9D9D9] dark:border-[#353535] z-40 flex-col justify-between p-6 select-none overflow-y-auto transition-colors">
        <div className="space-y-6">
          {/* Logo & Tagline */}
          <div className="pt-1">
            <TempoLogo size="md" showTagline={true} />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="space-y-1 pt-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-[#080808] dark:bg-[#252525] text-[#FFFFFF] dark:text-[#F2F2F2] border border-transparent dark:border-[#353535] shadow-xs'
                      : 'text-[#404040] dark:text-[#B3B3B3] hover:text-[#080808] dark:hover:text-[#F2F2F2] hover:bg-[#F5F5F5] dark:hover:bg-[#1D1D1D]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Desktop Sidebar Bottom: Notifications, Settings, Profile & Logout */}
        <div className="pt-6 border-t border-[#EFEFEF] dark:border-[#353535] space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-[#777777] dark:text-[#858585]">Activity Alerts</span>
            <NotificationCenter />
          </div>

          <Link
            to="/settings"
            className={`flex items-center space-x-3 px-3.5 py-2 rounded-xl text-xs font-medium transition ${
              isActive('/settings')
                ? 'bg-[#080808] dark:bg-[#252525] text-white dark:text-[#F2F2F2] border border-transparent dark:border-[#353535] font-semibold shadow-xs'
                : 'text-[#404040] dark:text-[#B3B3B3] hover:text-[#080808] dark:hover:text-[#F2F2F2] hover:bg-[#F5F5F5] dark:hover:bg-[#1D1D1D]'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>Settings</span>
          </Link>

          <Link
            to="/profile"
            className="flex items-center space-x-3 p-2 rounded-xl hover:bg-[#F5F5F5] dark:hover:bg-[#1D1D1D] transition group"
          >
            <div className="w-8 h-8 rounded-full bg-[#171717] dark:bg-[#252525] text-[#FFFFFF] dark:text-[#F2F2F2] flex items-center justify-center text-xs font-semibold uppercase shrink-0 border border-transparent dark:border-[#353535]">
              {user.name ? user.name.charAt(0) : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#080808] dark:text-[#F2F2F2] truncate group-hover:underline">
                {user.name || 'User'}
              </p>
              <p className="text-[11px] text-[#777777] dark:text-[#858585] truncate font-mono">{user.email}</p>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl text-xs font-medium text-[#777777] dark:text-[#B3B3B3] hover:text-[#080808] dark:hover:text-[#F2F2F2] hover:bg-[#F5F5F5] dark:hover:bg-[#1D1D1D] border border-[#D9D9D9] dark:border-[#353535] transition"
            title="Log out of Tempo"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MOBILE TOP HEADER (Sticky h-14 only on < md)                           */}
      {/* ========================================================================= */}
      <header className="md:hidden sticky top-0 z-40 bg-[#FFFFFF]/95 dark:bg-[#141414]/95 backdrop-blur-md border-b border-[#D9D9D9] dark:border-[#353535] h-14 px-4 flex items-center justify-between transition-colors">
        <TempoLogo size="sm" showTagline={false} />

        <div className="flex items-center space-x-1.5">
          <NotificationCenter />
          <Link
            to="/settings"
            className={`p-2 rounded-xl transition min-w-[44px] min-h-[44px] flex items-center justify-center ${
              isActive('/settings')
                ? 'bg-[#080808] dark:bg-[#252525] text-white dark:text-[#F2F2F2] border border-transparent dark:border-[#353535]'
                : 'text-[#777777] dark:text-[#B3B3B3] hover:text-[#080808] dark:hover:text-[#F2F2F2] hover:bg-[#F5F5F5] dark:hover:bg-[#1D1D1D]'
            }`}
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <Link
            to="/profile"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="User Profile"
          >
            <div className="w-8 h-8 rounded-full bg-[#171717] dark:bg-[#252525] text-[#FFFFFF] dark:text-[#F2F2F2] flex items-center justify-center text-xs font-semibold uppercase ring-2 ring-transparent hover:ring-[#080808] dark:hover:ring-[#F2F2F2] transition border border-transparent dark:border-[#353535]">
              {user.name ? user.name.charAt(0) : 'U'}
            </div>
          </Link>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. MOBILE BOTTOM NAVIGATION (Fixed thumb bar with safe area on < md)      */}
      {/* ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FFFFFF]/98 dark:bg-[#141414]/98 backdrop-blur-md border-t border-[#EAEAEA] dark:border-[#353535] px-1 pt-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-sm transition-colors">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] transition-colors min-w-[52px] min-h-[44px] ${
                active
                  ? 'text-[#080808] dark:text-[#F2F2F2] font-bold'
                  : 'text-[#777777] dark:text-[#858585] hover:text-[#080808] dark:hover:text-[#F2F2F2]'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-all ${
                  active
                    ? 'bg-[#080808] dark:bg-[#252525] text-[#FFFFFF] dark:text-[#F2F2F2] border border-transparent dark:border-[#353535]'
                    : 'text-[#777777] dark:text-[#858585]'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="mt-0.5 tracking-tight font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <OfflineIndicator />
    </>
  );
}
