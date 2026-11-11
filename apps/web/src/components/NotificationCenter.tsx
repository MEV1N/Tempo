import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { NotificationDTO } from '@tempo/shared';
import {
  Bell,
  CheckCheck,
  Trash2,
  Sparkles,
  Clock,
  CheckSquare,
  Calendar,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();

    // Poll periodically for new notifications (every 30 seconds)
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await apiRequest<{
        notifications: NotificationDTO[];
        unreadCount: number;
      }>('/api/notifications?limit=20');
      if (res) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      }
    } catch {
      // Silently handle if unauthenticated or offline
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setLoading(true);
      await apiRequest('/api/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiRequest(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      fetchNotifications();
    } catch {
      // Ignore
    }
  };

  const handleNotificationClick = async (notif: NotificationDTO) => {
    if (!notif.readAt) {
      handleMarkAsRead(notif.id);
    }
    setIsOpen(false);

    if (notif.data && notif.data.url) {
      navigate(notif.data.url);
    } else if (notif.type === 'TOMORROW_PLAN_READY' || notif.type === 'SCHEDULE_REMINDER') {
      navigate('/schedule');
    } else if (notif.type === 'TASK_REMINDER') {
      navigate('/tasks');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'TOMORROW_PLAN_READY':
        return <Sparkles className="w-4 h-4 text-sky-400" />;
      case 'SCHEDULE_REMINDER':
        return <Clock className="w-4 h-4 text-indigo-400" />;
      case 'TASK_REMINDER':
        return <CheckSquare className="w-4 h-4 text-emerald-400" />;
      case 'SCHEDULE_CHANGE':
        return <Calendar className="w-4 h-4 text-amber-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition focus:outline-none"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-sky-500 rounded-full ring-2 ring-slate-950 animate-pulse" />
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800">
          {/* Header */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-[11px] text-slate-400 hover:text-sky-400 flex items-center space-x-1 font-medium transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No notifications right now.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start justify-between gap-3 cursor-pointer transition ${
                    !notif.readAt ? 'bg-sky-500/5 hover:bg-sky-500/10' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 mt-0.5">
                      {getIcon(notif.type)}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <p className="text-xs font-bold text-white leading-tight">{notif.title}</p>
                        {!notif.readAt && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
                      </div>

                      <p className="text-[11px] text-slate-400 leading-snug">{notif.body}</p>

                      <div className="flex items-center space-x-2 text-[10px] text-slate-500 pt-0.5">
                        <span>
                          {new Date(notif.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {notif.data?.url && (
                          <span className="text-sky-400 flex items-center space-x-0.5">
                            <span>Open</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDelete(notif.id, e)}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
