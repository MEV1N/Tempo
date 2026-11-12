import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { NotificationDTO } from '@tempo/shared';
import {
  Bell,
  CheckCheck,
  Calendar,
  CheckSquare,
  Sparkles,
  Clock,
  AlertCircle,
  ExternalLink,
  Trash2,
} from 'lucide-react';

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const data = await apiRequest<{ notifications: NotificationDTO[]; unreadCount: number }>(
        '/api/notifications?limit=15'
      );
      if (data) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Fallback silently if offline
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Poll for new notifications every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

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
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
      );
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
        return <Sparkles className="w-3.5 h-3.5 text-[#080808] dark:text-[#F5F5F5]" />;
      case 'SCHEDULE_REMINDER':
        return <Clock className="w-3.5 h-3.5 text-[#080808] dark:text-[#F5F5F5]" />;
      case 'TASK_REMINDER':
        return <CheckSquare className="w-3.5 h-3.5 text-[#080808] dark:text-[#F5F5F5]" />;
      case 'SCHEDULE_CHANGE':
        return <Calendar className="w-3.5 h-3.5 text-[#080808] dark:text-[#F5F5F5]" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-[#777777] dark:text-[#929292]" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#777777] dark:text-[#BDBDBD] hover:text-[#080808] dark:hover:text-[#F5F5F5] hover:bg-[#F5F5F5] dark:hover:bg-[#202020] border border-[#D9D9D9] dark:border-[#383838] transition focus:outline-none"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#080808] dark:bg-[#282828] text-[#FFFFFF] dark:text-[#F5F5F5] border border-transparent dark:border-[#383838] text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 md:left-0 md:right-auto mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-[#FFFFFF] dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#383838] rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-[#EFEFEF] dark:divide-[#303030]">
          {/* Header */}
          <div className="p-3.5 flex items-center justify-between bg-[#FAFAFA] dark:bg-[#202020]">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-[#080808] dark:text-[#F5F5F5]">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-[#080808] dark:bg-[#282828] text-[#FFFFFF] dark:text-[#F5F5F5] border border-transparent dark:border-[#383838] text-[10px] font-medium">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-[11px] text-[#777777] dark:text-[#BDBDBD] hover:text-[#080808] dark:hover:text-[#F5F5F5] flex items-center space-x-1 font-medium transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#EFEFEF] dark:divide-[#303030]">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#777777] dark:text-[#929292]">
                No notifications right now.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start justify-between gap-3 cursor-pointer transition ${
                    !notif.readAt
                      ? 'bg-[#F5F5F5]/60 dark:bg-[#202020]/60 hover:bg-[#EFEFEF]/80 dark:hover:bg-[#202020]'
                      : 'hover:bg-[#F5F5F5] dark:hover:bg-[#202020]'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-1.5 rounded-lg bg-[#FFFFFF] dark:bg-[#202020] border border-[#D9D9D9] dark:border-[#383838] mt-0.5 shadow-2xs">
                      {getIcon(notif.type)}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <p className="text-xs font-semibold text-[#080808] dark:text-[#F5F5F5] leading-tight">
                          {notif.title}
                        </p>
                        {!notif.readAt && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#080808] dark:bg-[#F5F5F5]" />
                        )}
                      </div>

                      <p className="text-[11px] text-[#404040] dark:text-[#BDBDBD] leading-snug">{notif.body}</p>

                      <div className="flex items-center space-x-2 text-[10px] text-[#777777] dark:text-[#929292] pt-0.5">
                        <span>
                          {new Date(notif.createdAt).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </span>
                        {notif.data?.url && (
                          <span className="text-[#080808] dark:text-[#F5F5F5] font-medium flex items-center space-x-0.5 underline">
                            <span>Open</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDelete(notif.id, e)}
                    className="p-1 rounded-md text-[#777777] dark:text-[#929292] hover:text-[#080808] dark:hover:text-[#F5F5F5] hover:bg-[#EFEFEF] dark:hover:bg-[#202020] transition shrink-0"
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
