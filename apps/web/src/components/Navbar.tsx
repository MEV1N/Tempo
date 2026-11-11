import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Clock,
  User,
  LogOut,
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { APP_CONFIG } from '@tempo/shared';
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

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-sky-500/20">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-sky-400 to-indigo-300 bg-clip-text text-transparent">
              {APP_CONFIG.APP_NAME}
            </span>
          </Link>

          <nav className="hidden sm:flex items-center space-x-1">
            <Link
              to="/"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                isActive('/')
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/tasks"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                isActive('/tasks')
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Tasks</span>
            </Link>
            <Link
              to="/calendar"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                isActive('/calendar')
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Timetable & Calendar</span>
            </Link>
            <Link
              to="/schedule"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                isActive('/schedule')
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Schedule</span>
            </Link>
            <Link
              to="/analytics"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                isActive('/analytics')
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </Link>
            <Link
              to="/profile"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                isActive('/profile')
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          <NotificationCenter />
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-slate-200">{user.name || 'User'}</p>
            <p className="text-[11px] text-slate-500 font-mono truncate max-w-[150px]">
              {user.email}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 transition"
            title="Log out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="sm:hidden border-t border-slate-800/60 bg-slate-950/90 px-3 py-2 flex items-center justify-around">
        <Link
          to="/"
          className={`flex flex-col items-center py-1 text-[11px] ${
            isActive('/') ? 'text-sky-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Home</span>
        </Link>
        <Link
          to="/tasks"
          className={`flex flex-col items-center py-1 text-[11px] ${
            isActive('/tasks') ? 'text-sky-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <CheckSquare className="w-4 h-4 mb-0.5" />
          <span>Tasks</span>
        </Link>
        <Link
          to="/calendar"
          className={`flex flex-col items-center py-1 text-[11px] ${
            isActive('/calendar') ? 'text-sky-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Calendar className="w-4 h-4 mb-0.5" />
          <span>Calendar</span>
        </Link>
        <Link
          to="/schedule"
          className={`flex flex-col items-center py-1 text-[11px] ${
            isActive('/schedule') ? 'text-sky-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Sparkles className="w-4 h-4 mb-0.5" />
          <span>Schedule</span>
        </Link>
        <Link
          to="/analytics"
          className={`flex flex-col items-center py-1 text-[11px] ${
            isActive('/analytics') ? 'text-sky-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <BarChart3 className="w-4 h-4 mb-0.5" />
          <span>Analytics</span>
        </Link>
        <Link
          to="/profile"
          className={`flex flex-col items-center py-1 text-[11px] ${
            isActive('/profile') ? 'text-sky-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <User className="w-4 h-4 mb-0.5" />
          <span>Profile</span>
        </Link>
      </div>
      <OfflineIndicator />
    </header>
  );
}
