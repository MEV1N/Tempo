import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import {
  User,
  Clock,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bell,
  Sparkles,
  Calendar,
  RefreshCw,
  Unlink,
  Link as LinkIcon,
  Key,
} from 'lucide-react';
import { TIME_REGEX, GoogleCalendarStatusDTO } from '@tempo/shared';
import { googleApi } from '../api/client';
import {
  getPushSubscriptionState,
  subscribeToPush,
  unsubscribeFromPush,
} from '../pwa/registerServiceWorker';
import { PWAInstallBanner } from '../components/PWAInstallBanner';

const TIMEZONES = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
];

export function ProfilePage() {
  const { user, preference, updateProfile, updatePreferences } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [timezone, setTimezone] = useState(preference?.timezone || 'Asia/Kolkata');
  const [wakeTime, setWakeTime] = useState(preference?.wakeTime || '07:00');
  const [sleepTime, setSleepTime] = useState(preference?.sleepTime || '23:00');
  const [preferredWorkStart, setPreferredWorkStart] = useState(
    preference?.preferredWorkStart || '09:00'
  );
  const [preferredWorkEnd, setPreferredWorkEnd] = useState(preference?.preferredWorkEnd || '18:00');
  const [breakfastTime, setBreakfastTime] = useState(preference?.breakfastTime || '08:30');
  const [lunchTime, setLunchTime] = useState(preference?.lunchTime || '13:00');
  const [dinnerTime, setDinnerTime] = useState(preference?.dinnerTime || '20:30');
  const [preferredBreakDuration, setPreferredBreakDuration] = useState(
    preference?.preferredBreakDuration || 15
  );
  const [maxContinuousWorkDuration, setMaxContinuousWorkDuration] = useState(
    preference?.maxContinuousWorkDuration || 90
  );
  const [dailyLeisureTarget, setDailyLeisureTarget] = useState(
    preference?.dailyLeisureTarget || 120
  );

  // Phase 6 Notification & Automation State
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(
    preference?.pushNotificationsEnabled ?? true
  );
  const [autoNightlyPlanningEnabled, setAutoNightlyPlanningEnabled] = useState(
    preference?.autoNightlyPlanningEnabled ?? true
  );
  const [notifyTomorrowPlanReady, setNotifyTomorrowPlanReady] = useState(
    preference?.notifyTomorrowPlanReady ?? true
  );
  const [notifyTaskReminders, setNotifyTaskReminders] = useState(
    preference?.notifyTaskReminders ?? true
  );
  const [notifyScheduleReminders, setNotifyScheduleReminders] = useState(
    preference?.notifyScheduleReminders ?? true
  );
  const [notifyScheduleChanges, setNotifyScheduleChanges] = useState(
    preference?.notifyScheduleChanges ?? true
  );
  const [preferredPlanningTime, setPreferredPlanningTime] = useState(
    preference?.preferredPlanningTime || '21:00'
  );

  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [subscribingPush, setSubscribingPush] = useState(false);

  useEffect(() => {
    getPushSubscriptionState().then((state) => {
      setBrowserPermission(state.permission);
      setIsPushSubscribed(state.subscribed);
    });
  }, []);

  const handleTogglePush = async (enable: boolean) => {
    setPushNotificationsEnabled(enable);
    if (enable) {
      setSubscribingPush(true);
      const res = await subscribeToPush();
      setSubscribingPush(false);
      if (!res.success && res.message) {
        setError(res.message);
      } else {
        setIsPushSubscribed(true);
        setBrowserPermission('granted');
      }
    } else {
      await unsubscribeFromPush();
      setIsPushSubscribed(false);
    }
  };

  const location = useLocation();
  const [calendarStatus, setCalendarStatus] = useState<GoogleCalendarStatusDTO | null>(null);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [unlinkingGoogle, setUnlinkingGoogle] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fetchCalendarStatus = async () => {
    try {
      setLoadingCalendar(true);
      const res = await googleApi.getCalendarStatus();
      setCalendarStatus(res);
    } catch {
      // Ignore if offline or not supported
    } finally {
      setLoadingCalendar(false);
    }
  };

  useEffect(() => {
    fetchCalendarStatus();
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('google_linked') === 'success') {
      setSuccess(true);
      setSyncMessage('Google account linked successfully!');
    } else if (searchParams.get('calendar_connected') === 'success') {
      setSuccess(true);
      setSyncMessage('Google Calendar connected and initial synchronization started!');
    } else if (searchParams.get('error')) {
      setError(`Operation failed: ${searchParams.get('error')}`);
    }
  }, [location.search]);

  const handleSyncCalendar = async () => {
    try {
      setSyncingCalendar(true);
      setSyncMessage(null);
      const res = await googleApi.syncCalendar(false);
      setSyncMessage(`Synced: ${res.importedCount} updated, ${res.deletedCount} removed.`);
      await fetchCalendarStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to sync calendar');
    } finally {
      setSyncingCalendar(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    if (!confirm('Disconnect Google Calendar? Your Tempo account will remain active.')) return;
    try {
      await googleApi.disconnectCalendar();
      setSyncMessage('Google Calendar disconnected.');
      await fetchCalendarStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect calendar');
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!confirm('Unlink your Google account from Tempo?')) return;
    try {
      setUnlinkingGoogle(true);
      await googleApi.unlinkGoogle();
      setSyncMessage('Google account unlinked.');
      await fetchCalendarStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to unlink Google account');
    } finally {
      setUnlinkingGoogle(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }
    try {
      setSettingPassword(true);
      const res = await googleApi.setPassword(newPassword);
      setPasswordSuccess(res.message);
      setNewPassword('');
      await fetchCalendarStatus();
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to set password');
    } finally {
      setSettingPassword(false);
    }
  };

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!TIME_REGEX.test(wakeTime)) return setError('Wake-up time must be valid (HH:mm)');
    if (!TIME_REGEX.test(sleepTime)) return setError('Sleep time must be valid (HH:mm)');
    if (!TIME_REGEX.test(preferredWorkStart))
      return setError('Work start time must be valid (HH:mm)');
    if (!TIME_REGEX.test(preferredWorkEnd)) return setError('Work end time must be valid (HH:mm)');
    if (!TIME_REGEX.test(breakfastTime)) return setError('Breakfast time must be valid (HH:mm)');
    if (!TIME_REGEX.test(lunchTime)) return setError('Lunch time must be valid (HH:mm)');
    if (!TIME_REGEX.test(dinnerTime)) return setError('Dinner time must be valid (HH:mm)');

    setSaving(true);
    try {
      if (name.trim() !== user?.name) {
        await updateProfile({ name: name.trim() });
      }

      await updatePreferences({
        timezone,
        wakeTime,
        sleepTime,
        preferredWorkStart,
        preferredWorkEnd,
        breakfastTime,
        lunchTime,
        dinnerTime,
        preferredBreakDuration: Number(preferredBreakDuration),
        maxContinuousWorkDuration: Number(maxContinuousWorkDuration),
        dailyLeisureTarget: Number(dailyLeisureTarget),
        pushNotificationsEnabled,
        autoNightlyPlanningEnabled,
        notifyTomorrowPlanReady,
        notifyTaskReminders,
        notifyScheduleReminders,
        notifyScheduleChanges,
        preferredPlanningTime,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Profile & Preferences</h1>
          <p className="text-slate-400 text-xs mt-1">
            Manage your personal credentials and daily routine schedule parameters
          </p>
        </div>

        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Profile and preferences updated successfully!</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Account Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <User className="w-4 h-4 text-sky-400" />
              <span>Account Credentials</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Email Address
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950/60 border border-slate-800/60 text-slate-500 text-sm cursor-not-allowed font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Routine & Preferences */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Routine & Schedule Settings</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Wake Time</label>
                <input
                  type="time"
                  required
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Sleep Time</label>
                <input
                  type="time"
                  required
                  value={sleepTime}
                  onChange={(e) => setSleepTime(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Work Start Time
                </label>
                <input
                  type="time"
                  required
                  value={preferredWorkStart}
                  onChange={(e) => setPreferredWorkStart(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Work End Time
                </label>
                <input
                  type="time"
                  required
                  value={preferredWorkEnd}
                  onChange={(e) => setPreferredWorkEnd(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Breakfast Time
                </label>
                <input
                  type="time"
                  required
                  value={breakfastTime}
                  onChange={(e) => setBreakfastTime(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Lunch Time</label>
                <input
                  type="time"
                  required
                  value={lunchTime}
                  onChange={(e) => setLunchTime(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Dinner Time</label>
                <input
                  type="time"
                  required
                  value={dinnerTime}
                  onChange={(e) => setDinnerTime(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Break Duration (min)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  required
                  value={preferredBreakDuration}
                  onChange={(e) => setPreferredBreakDuration(parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Max Continuous (min)
                </label>
                <input
                  type="number"
                  min="15"
                  max="360"
                  required
                  value={maxContinuousWorkDuration}
                  onChange={(e) => setMaxContinuousWorkDuration(parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Daily Leisure (min)
                </label>
                <input
                  type="number"
                  min="0"
                  max="720"
                  required
                  value={dailyLeisureTarget}
                  onChange={(e) => setDailyLeisureTarget(parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Phase 6 Push Notifications & Automation Controls */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Push Notifications & Automated Planning
                  </h2>
                  <p className="text-xs text-slate-400">
                    Configure Web Push delivery and background nightly schedule preparation.
                  </p>
                </div>
              </div>

              {/* Browser Permission Status */}
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-400">Status:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    browserPermission === 'granted'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : browserPermission === 'denied'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {isPushSubscribed ? 'Subscribed' : browserPermission}
                </span>
              </div>
            </div>

            {browserPermission === 'denied' && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>
                  Push notifications are blocked in your browser settings. To receive reminders on
                  this device, allow notifications in your browser address bar permissions.
                </span>
              </div>
            )}

            <div className="space-y-4">
              {/* Push Master Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <p className="text-xs font-bold text-white">Enable Push Notifications</p>
                  <p className="text-[11px] text-slate-400">
                    Receive real-time push alerts on your desktop or mobile device.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={subscribingPush}
                  onClick={() => handleTogglePush(!pushNotificationsEnabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    pushNotificationsEnabled ? 'bg-sky-500' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      pushNotificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Nightly Planning Master Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    Automatic Nightly Schedule Preparation
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Automatically synthesize a proposed schedule for tomorrow every evening.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoNightlyPlanningEnabled(!autoNightlyPlanningEnabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    autoNightlyPlanningEnabled ? 'bg-sky-500' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      autoNightlyPlanningEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Preferred Planning Time */}
              {autoNightlyPlanningEnabled && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-white">Preferred Nightly Planning Time</p>
                    <p className="text-[11px] text-slate-400">
                      Local time in your calibrated timezone ({timezone}) when tomorrow's schedule
                      is generated.
                    </p>
                  </div>
                  <input
                    type="time"
                    required
                    value={preferredPlanningTime}
                    onChange={(e) => setPreferredPlanningTime(e.target.value)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              )}

              {/* Granular Notification Categories */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-slate-300">Notification Alerts</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyTomorrowPlanReady}
                      onChange={(e) => setNotifyTomorrowPlanReady(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
                    />
                    <span className="text-xs text-slate-300">Tomorrow's Plan Ready Alert</span>
                  </label>

                  <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyTaskReminders}
                      onChange={(e) => setNotifyTaskReminders(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
                    />
                    <span className="text-xs text-slate-300">Task Deadline Reminders</span>
                  </label>

                  <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyScheduleReminders}
                      onChange={(e) => setNotifyScheduleReminders(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
                    />
                    <span className="text-xs text-slate-300">Upcoming Schedule Reminders</span>
                  </label>

                  <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyScheduleChanges}
                      onChange={(e) => setNotifyScheduleChanges(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500"
                    />
                    <span className="text-xs text-slate-300">
                      Schedule Change & Reschedule Alerts
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* PHASE 7: GOOGLE AUTHENTICATION & GOOGLE CALENDAR          */}
          {/* ========================================================= */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google Account & Identity</span>
                {loadingCalendar && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
              </h2>
              {calendarStatus?.googleAccountConnected ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Connected
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                  Not Connected
                </span>
              )}
            </div>

            {/* Google Login Identity Status */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-200">
                  {calendarStatus?.googleAccountConnected
                    ? `Linked Google Account: ${calendarStatus.googleEmail}`
                    : 'No Google account linked'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {calendarStatus?.googleAccountConnected
                    ? 'You can sign in with this Google account across all devices using OpenID Connect.'
                    : 'Link your Google account to enable single-click Login with Google.'}
                </p>
              </div>

              <div>
                {calendarStatus?.googleAccountConnected ? (
                  <button
                    type="button"
                    onClick={handleUnlinkGoogle}
                    disabled={unlinkingGoogle}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-medium transition flex items-center space-x-1.5"
                  >
                    {unlinkingGoogle ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Unlink className="w-3.5 h-3.5" />
                    )}
                    <span>Unlink Google</span>
                  </button>
                ) : (
                  <a
                    href="/api/auth/google?action=link"
                    className="px-3.5 py-1.5 rounded-lg bg-white text-slate-900 hover:bg-slate-100 text-xs font-semibold transition flex items-center space-x-1.5"
                  >
                    <LinkIcon className="w-3.5 h-3.5 text-slate-700" />
                    <span>Link Google Account</span>
                  </a>
                )}
              </div>
            </div>

            {/* Set Password Prompt if User has no password (registered via Google) */}
            {calendarStatus && !calendarStatus.hasPasswordAuth && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                <div className="flex items-start space-x-2">
                  <Key className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-300">Set Account Password</p>
                    <p className="text-[11px] text-amber-400/80">
                      You registered with Google and have no password set. Setting a password
                      enables email login and lets you safely unlink Google anytime.
                    </p>
                  </div>
                </div>

                {passwordSuccess && (
                  <p className="text-xs text-emerald-400 font-medium">{passwordSuccess}</p>
                )}
                {passwordError && (
                  <p className="text-xs text-rose-400 font-medium">{passwordError}</p>
                )}

                <div className="flex gap-2 max-w-sm">
                  <input
                    type="password"
                    placeholder="New password (min 8 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleSetPassword}
                    disabled={settingPassword}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold transition flex items-center space-x-1"
                  >
                    {settingPassword && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>Save Password</span>
                  </button>
                </div>
              </div>
            )}

            {/* Google Calendar Section */}
            <div className="pt-2 border-t border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-200 flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-sky-400" />
                    <span>Google Calendar Synchronization</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Import fixed commitments into Tempo using narrow read-only access. The scheduler
                    protects these times from task overlaps.
                  </p>
                </div>

                {calendarStatus?.calendarConnected ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Sync Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                    Disconnected
                  </span>
                )}
              </div>

              {calendarStatus?.calendarConnected ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">Last synchronized: </span>
                      <span className="font-mono text-slate-200">
                        {calendarStatus.lastSyncedAt
                          ? new Date(calendarStatus.lastSyncedAt).toLocaleString()
                          : 'Just now'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleSyncCalendar}
                        disabled={syncingCalendar}
                        className="px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/30 text-xs font-medium transition flex items-center space-x-1.5"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${syncingCalendar ? 'animate-spin' : ''}`}
                        />
                        <span>Sync Now</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDisconnectCalendar}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 text-xs font-medium transition"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>

                  {syncMessage && <p className="text-xs text-sky-400 font-medium">{syncMessage}</p>}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-200">Connect Google Calendar</p>
                    <p className="text-[11px] text-slate-500">
                      Authorizes read-only access to import your primary calendar schedule.
                    </p>
                  </div>
                  <a
                    href="/api/google-calendar/connect"
                    className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Connect Calendar</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* PWA Install Opportunity */}
          <PWAInstallBanner />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition flex items-center space-x-2 disabled:opacity-50 shadow-lg shadow-sky-500/20"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
