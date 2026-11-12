import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
  Plus,
  Trash2,
  Edit3,
  Copy,
  Activity,
  Coffee,
  Sun,
  Moon,
  Zap,
  X,
  Check,
  Layers,
  ArrowLeft,
  Sliders,
} from 'lucide-react';
import {
  TIME_REGEX,
  GoogleCalendarStatusDTO,
  PersonalRoutineDTO,
  RoutineCategory,
  RoutineClassification,
  formatTimeTo12Hour,
  formatTimeRange,
} from '@tempo/shared';
import { apiRequest, googleApi } from '../api/client';
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

const WEEKDAY_NAMES = [
  { day: 1, short: 'Mon', full: 'Monday' },
  { day: 2, short: 'Tue', full: 'Tuesday' },
  { day: 3, short: 'Wed', full: 'Wednesday' },
  { day: 4, short: 'Thu', full: 'Thursday' },
  { day: 5, short: 'Fri', full: 'Friday' },
  { day: 6, short: 'Sat', full: 'Saturday' },
  { day: 7, short: 'Sun', full: 'Sunday' },
];

const ROUTINE_CATEGORIES: Array<{
  value: RoutineCategory;
  label: string;
  icon: any;
}> = [
  { value: 'SLEEP', label: 'Sleep & Rest', icon: Moon },
  { value: 'MORNING_ROUTINE', label: 'Morning Routine', icon: Sun },
  { value: 'MEAL', label: 'Meal & Nutrition', icon: Coffee },
  { value: 'EXERCISE', label: 'Exercise & Fitness', icon: Activity },
  { value: 'EVENING_ROUTINE', label: 'Evening Routine', icon: Moon },
  { value: 'STUDY', label: 'Study & Learning', icon: Layers },
  { value: 'WORK', label: 'Work & Deep Focus', icon: Zap },
  { value: 'PERSONAL', label: 'Personal Time', icon: User },
  { value: 'RELAXATION', label: 'Relaxation & Leisure', icon: Sparkles },
  { value: 'OTHER', label: 'Other Commitment', icon: Clock },
];

type SettingsSection = 'account' | 'routines' | 'preferences' | 'notifications' | 'integrations';

export function SettingsPage() {
  const { user, preference, updateProfile, updatePreferences } = useAuth();
  const { themeMode, resolvedTheme, setThemeMode } = useTheme();
  const location = useLocation();

  // Active section state
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');

  // Account State
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  // Preferences State
  const [timezone, setTimezone] = useState(preference?.timezone || 'Asia/Kolkata');
  const [wakeTime, setWakeTime] = useState(preference?.wakeTime || '07:00');
  const [sleepTime, setSleepTime] = useState(preference?.sleepTime || '23:00');
  const [preferredWorkStart, setPreferredWorkStart] = useState(
    preference?.preferredWorkStart || '09:00'
  );
  const [preferredWorkEnd, setPreferredWorkEnd] = useState(preference?.preferredWorkEnd || '18:00');
  const [defaultBreakDuration, setDefaultBreakDuration] = useState(
    preference?.preferredBreakDuration || 15
  );

  // Day-of-week custom wake/sleep schedules
  const [weekdayWakeTimes, setWeekdayWakeTimes] = useState<Record<string, string>>(
    (preference as any)?.weekdayWakeTimes || {}
  );
  const [weekdaySleepTimes, setWeekdaySleepTimes] = useState<Record<string, string>>(
    (preference as any)?.weekdaySleepTimes || {}
  );
  const [showWeekdaySchedules, setShowWeekdaySchedules] = useState(false);

  // Routines State
  const [routines, setRoutines] = useState<PersonalRoutineDTO[]>([]);
  const [routinesLoading, setRoutinesLoading] = useState(false);
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | 'ALL'>('ALL');

  // Routine Modal State
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<PersonalRoutineDTO | null>(null);
  const [routineName, setRoutineName] = useState('');
  const [routineCategory, setRoutineCategory] = useState<RoutineCategory>('OTHER');
  const [routineClassification, setRoutineClassification] =
    useState<RoutineClassification>('FIXED');
  const [routineStartTime, setRoutineStartTime] = useState('08:00');
  const [routineEndTime, setRoutineEndTime] = useState('09:00');
  const [routineDays, setRoutineDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [routineDescription, setRoutineDescription] = useState('');
  const [routineSaving, setRoutineSaving] = useState(false);

  // Copy Routines Modal State
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyFromDay, setCopyFromDay] = useState<number>(1);
  const [copyToDays, setCopyToDays] = useState<number[]>([2, 3, 4, 5]);
  const [copySaving, setCopySaving] = useState(false);

  // Notifications State
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(true);
  const [pushLoading, setPushLoading] = useState(false);
  const [autoPlanning, setAutoPlanning] = useState(
    preference?.autoNightlyPlanningEnabled ?? true
  );
  const [notifyTomorrowPlan, setNotifyTomorrowPlan] = useState(
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
  const [planningTime, setPlanningTime] = useState(
    preference?.preferredPlanningTime || '21:00'
  );

  // Google Integrations State
  const [googleCalendarStatus, setGoogleCalendarStatus] = useState<GoogleCalendarStatusDTO | null>(
    null
  );
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [disconnectingCalendar, setDisconnectingCalendar] = useState(false);
  const [unlinkingGoogle, setUnlinkingGoogle] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);

  // UI feedback
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Handle URL hash / search params for section routing (e.g. /settings?section=routines)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sec = params.get('section') as SettingsSection | null;
    if (sec && ['account', 'routines', 'preferences', 'notifications', 'integrations'].includes(sec)) {
      setActiveSection(sec);
    }
  }, [location.search]);

  // Load user data into form
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  useEffect(() => {
    if (preference) {
      setTimezone(preference.timezone || 'Asia/Kolkata');
      setWakeTime(preference.wakeTime || '07:00');
      setSleepTime(preference.sleepTime || '23:00');
      setPreferredWorkStart(preference.preferredWorkStart || '09:00');
      setPreferredWorkEnd(preference.preferredWorkEnd || '18:00');
      setDefaultBreakDuration(preference.preferredBreakDuration || 15);
      setWeekdayWakeTimes((preference as any).weekdayWakeTimes || {});
      setWeekdaySleepTimes((preference as any).weekdaySleepTimes || {});
      setAutoPlanning(preference.autoNightlyPlanningEnabled ?? true);
      setNotifyTomorrowPlan(preference.notifyTomorrowPlanReady ?? true);
      setNotifyTaskReminders(preference.notifyTaskReminders ?? true);
      setNotifyScheduleReminders(preference.notifyScheduleReminders ?? true);
      setNotifyScheduleChanges(preference.notifyScheduleChanges ?? true);
      setPlanningTime(preference.preferredPlanningTime || '21:00');
    }
  }, [preference]);

  // Check push subscription state
  useEffect(() => {
    getPushSubscriptionState().then((state) => {
      setPushSupported(state.supported);
      setPushEnabled(state.subscribed);
    });
  }, []);

  // Fetch Google Calendar integration status
  useEffect(() => {
    fetchGoogleStatus();
    loadRoutines();
  }, []);

  const fetchGoogleStatus = async () => {
    try {
      const status = await googleApi.getCalendarStatus();
      setGoogleCalendarStatus(status);
    } catch {
      // Ignored if unconfigured
    }
  };

  const loadRoutines = async () => {
    setRoutinesLoading(true);
    try {
      const data = await apiRequest<PersonalRoutineDTO[]>('/api/routines');
      setRoutines(data || []);
    } catch {
      // Ignored
    } finally {
      setRoutinesLoading(false);
    }
  };

  // Routine Handlers
  const openAddRoutineModal = () => {
    setEditingRoutine(null);
    setRoutineName('');
    setRoutineCategory('MEAL');
    setRoutineClassification('FIXED');
    setRoutineStartTime('12:30');
    setRoutineEndTime('13:15');
    setRoutineDays([1, 2, 3, 4, 5, 6, 7]);
    setRoutineDescription('');
    setIsRoutineModalOpen(true);
  };

  const openEditRoutineModal = (r: PersonalRoutineDTO) => {
    setEditingRoutine(r);
    setRoutineName(r.name);
    setRoutineCategory(r.category);
    setRoutineClassification(r.classification);
    setRoutineStartTime(r.startTime);
    setRoutineEndTime(r.endTime);
    setRoutineDays(r.daysOfWeek || [1, 2, 3, 4, 5, 6, 7]);
    setRoutineDescription(r.description || '');
    setIsRoutineModalOpen(true);
  };

  const handleSaveRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineName.trim()) {
      setMessage({ type: 'error', text: 'Routine title is required' });
      return;
    }

    setRoutineSaving(true);
    try {
      const payload = {
        name: routineName.trim(),
        category: routineCategory,
        classification: routineClassification,
        startTime: routineStartTime,
        endTime: routineEndTime,
        daysOfWeek: routineDays,
        description: routineDescription.trim() || undefined,
        isEnabled: editingRoutine ? editingRoutine.isEnabled : true,
      };

      if (editingRoutine) {
        await apiRequest(`/api/routines/${editingRoutine.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setMessage({ type: 'success', text: 'Routine updated successfully' });
      } else {
        await apiRequest('/api/routines', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setMessage({ type: 'success', text: 'Routine created successfully' });
      }

      setIsRoutineModalOpen(false);
      await loadRoutines();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save routine' });
    } finally {
      setRoutineSaving(false);
    }
  };

  const handleDeleteRoutine = async (id: string) => {
    if (!confirm('Are you sure you want to remove this personal routine?')) return;
    try {
      await apiRequest(`/api/routines/${id}`, { method: 'DELETE' });
      setMessage({ type: 'success', text: 'Routine removed' });
      await loadRoutines();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete routine' });
    }
  };

  const handleToggleRoutine = async (r: PersonalRoutineDTO) => {
    try {
      await apiRequest(`/api/routines/${r.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isEnabled: !r.isEnabled }),
      });
      setRoutines((prev) =>
        prev.map((item) => (item.id === r.id ? { ...item, isEnabled: !item.isEnabled } : item))
      );
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to toggle routine' });
    }
  };

  const handleCopyRoutines = async (e: React.FormEvent) => {
    e.preventDefault();
    if (copyToDays.length === 0) {
      setMessage({ type: 'error', text: 'Select at least one destination day' });
      return;
    }
    setCopySaving(true);
    try {
      await apiRequest('/api/routines/copy', {
        method: 'POST',
        body: JSON.stringify({ fromDay: copyFromDay, toDays: copyToDays }),
      });
      setMessage({ type: 'success', text: 'Routines copied successfully across weekdays' });
      setIsCopyModalOpen(false);
      await loadRoutines();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to copy routines' });
    } finally {
      setCopySaving(false);
    }
  };

  // Google Handlers
  const handleConnectGoogle = async (action: 'login' | 'link' = 'link') => {
    try {
      const res = await googleApi.getAuthUrl(action);
      window.location.href = res.url;
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to initiate Google authorization' });
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const res = await googleApi.getCalendarConnectUrl();
      window.location.href = res.url;
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to initiate Calendar authorization' });
    }
  };

  const handleSyncCalendar = async () => {
    setSyncingCalendar(true);
    try {
      const res = await googleApi.syncCalendar(false);
      setMessage({ type: 'success', text: res.message || 'Calendar synchronized successfully' });
      await fetchGoogleStatus();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to synchronize calendar' });
    } finally {
      setSyncingCalendar(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar integration?')) return;
    setDisconnectingCalendar(true);
    try {
      const res = await googleApi.disconnectCalendar();
      setMessage({ type: 'success', text: res.message || 'Calendar disconnected successfully' });
      await fetchGoogleStatus();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to disconnect calendar' });
    } finally {
      setDisconnectingCalendar(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!googleCalendarStatus?.hasPasswordAuth) {
      setMessage({
        type: 'error',
        text: 'Please set a local password before unlinking your Google account',
      });
      return;
    }
    if (!confirm('Are you sure you want to unlink your Google account from Tempo?')) return;
    setUnlinkingGoogle(true);
    try {
      const res = await googleApi.unlinkGoogle();
      setMessage({ type: 'success', text: res.message || 'Google account unlinked successfully' });
      await fetchGoogleStatus();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to unlink Google account' });
    } finally {
      setUnlinkingGoogle(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    setSettingPassword(true);
    try {
      const res = await googleApi.setPassword(newPassword);
      setMessage({ type: 'success', text: res.message || 'Password set successfully' });
      setNewPassword('');
      setConfirmPassword('');
      await fetchGoogleStatus();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to set password' });
    } finally {
      setSettingPassword(false);
    }
  };

  // Push Notifications Toggle
  const handleTogglePush = async () => {
    if (!pushSupported) return;
    setPushLoading(true);
    setMessage(null);
    try {
      if (pushEnabled) {
        const success = await unsubscribeFromPush();
        if (success) {
          setPushEnabled(false);
          setMessage({ type: 'success', text: 'Push notifications disabled' });
        }
      } else {
        const sub = await subscribeToPush();
        if (sub) {
          setPushEnabled(true);
          setMessage({ type: 'success', text: 'Push notifications enabled successfully!' });
        } else {
          setMessage({
            type: 'error',
            text: 'Could not enable push notifications. Check browser permissions.',
          });
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update push subscription' });
    } finally {
      setPushLoading(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!TIME_REGEX.test(wakeTime) || !TIME_REGEX.test(sleepTime)) {
      setMessage({ type: 'error', text: 'Please enter valid times in HH:mm format' });
      return;
    }

    setSaving(true);
    try {
      // 1. Update Profile (Name & Avatar)
      if (user && (name !== user.name || avatarUrl !== (user.avatarUrl || ''))) {
        await updateProfile({
          name: name.trim() || undefined,
          avatarUrl: avatarUrl.trim() || undefined,
        });
      }

      // 2. Update Preferences & Notifications
      await updatePreferences({
        timezone,
        wakeTime,
        sleepTime,
        preferredWorkStart,
        preferredWorkEnd,
        preferredBreakDuration: Number(defaultBreakDuration),
        autoNightlyPlanningEnabled: autoPlanning,
        notifyTomorrowPlanReady: notifyTomorrowPlan,
        notifyTaskReminders: notifyTaskReminders,
        notifyScheduleReminders: notifyScheduleReminders,
        notifyScheduleChanges: notifyScheduleChanges,
        preferredPlanningTime: planningTime,
      });

      setMessage({ type: 'success', text: 'Settings updated successfully' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const filteredRoutines = routines.filter((r) => {
    if (selectedDayFilter === 'ALL') return true;
    return (r.daysOfWeek || []).includes(selectedDayFilter);
  });

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#101010] text-[#080808] dark:text-[#F5F5F5] font-sans pb-28 md:pb-12 transition-colors">
      <Navbar />

      <div className="md:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          {/* Header with Back Navigation */}
          <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-4">
            <div className="flex items-center space-x-3">
              <Link
                to="/profile"
                className="p-2 -ml-2 rounded-xl text-[#777777] hover:text-[#080808] hover:bg-[#EFEFEF] transition inline-flex items-center justify-center min-w-[44px] min-h-[44px]"
                aria-label="Back to Profile"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[#080808] tracking-tight flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#080808]" />
                  <span>Settings</span>
                </h1>
                <p className="text-xs text-[#777777] mt-0.5">
                  Configure routines, preferences, integrations, and notification rules.
                </p>
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#080808] text-white text-xs font-semibold hover:bg-[#222222] transition disabled:opacity-50 min-h-[44px]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="hidden sm:inline">Save Changes</span>
              <span className="sm:hidden">Save</span>
            </button>
          </div>

          {/* Feedback Alert */}
          {message && (
            <div
              className={`p-4 rounded-xl flex items-center justify-between text-xs font-medium ${
                message.type === 'success'
                  ? 'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]'
                  : 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]'
              }`}
            >
              <div className="flex items-center space-x-2">
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
              <button
                onClick={() => setMessage(null)}
                className="p-1 hover:opacity-75 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Settings Section Tabs (Responsive Horizontal Scroll) */}
          <div className="flex border-b border-[#D9D9D9] overflow-x-auto no-scrollbar space-x-1 sm:space-x-2 pb-px">
            {[
              { id: 'account', label: 'Account', icon: User },
              { id: 'routines', label: 'Daily Routine', icon: Sun },
              { id: 'preferences', label: 'Preferences', icon: Clock },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'integrations', label: 'Integrations', icon: Calendar },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveSection(tab.id as SettingsSection);
                    setMessage(null);
                  }}
                  className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-t-xl text-xs font-semibold whitespace-nowrap transition min-h-[44px] ${
                    isActive
                      ? 'bg-white border-t border-l border-r border-[#D9D9D9] text-[#080808] -mb-px'
                      : 'text-[#777777] hover:text-[#080808] hover:bg-[#F5F5F5]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ======================================================== */}
          {/* SECTION A: ACCOUNT SETTINGS                              */}
          {/* ======================================================== */}
          {activeSection === 'account' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#D9D9D9] rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
                <div className="flex items-center space-x-4 pb-4 border-b border-[#EFEFEF]">
                  <div className="w-14 h-14 rounded-full bg-[#080808] text-white flex items-center justify-center font-bold text-lg overflow-hidden border border-[#D9D9D9]">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={name || 'Avatar'} className="w-full h-full object-cover" />
                    ) : (
                      (name || user?.email || 'U')[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#080808]">{name || 'Your Profile'}</h2>
                    <p className="text-xs text-[#777777]">{user?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#080808]">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D9D9] bg-[#FAFAFA] text-[#080808] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#080808] transition min-h-[44px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#080808]">Email Address</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D9D9] bg-[#F0F0F0] text-[#777777] cursor-not-allowed min-h-[44px]"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-[#080808]">Avatar Image URL</label>
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D9D9] bg-[#FAFAFA] text-[#080808] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#080808] transition min-h-[44px]"
                    />
                    <p className="text-[11px] text-[#777777]">
                      Provide an image URL to customize your avatar.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-[#080808] text-white text-xs font-semibold hover:bg-[#222222] transition min-h-[44px]"
                  >
                    {saving ? 'Saving...' : 'Update Account'}
                  </button>
                </div>
              </div>

              {/* Set Password Option (If Google Account without local password) */}
              {googleCalendarStatus?.googleAccountConnected && !googleCalendarStatus.hasPasswordAuth && (
                <div className="bg-white border border-[#D9D9D9] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
                  <div className="flex items-center space-x-2">
                    <Key className="w-4 h-4 text-[#080808]" />
                    <h3 className="text-sm font-bold text-[#080808]">Create Local Password</h3>
                  </div>
                  <p className="text-xs text-[#777777]">
                    You signed up using Google. Create a local password if you want to sign in with email and password directly.
                  </p>

                  <form onSubmit={handleSetPassword} className="space-y-3 max-w-md">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#080808]">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D9D9] bg-[#FAFAFA] text-[#080808] focus:bg-white focus:outline-hidden min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#080808]">Confirm Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D9D9] bg-[#FAFAFA] text-[#080808] focus:bg-white focus:outline-hidden min-h-[44px]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={settingPassword}
                      className="px-4 py-2 rounded-xl bg-[#080808] text-white text-xs font-semibold hover:bg-[#222222] transition min-h-[44px]"
                    >
                      {settingPassword ? 'Saving Password...' : 'Save Local Password'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION B: DAILY ROUTINE SETTINGS                        */}
          {/* ======================================================== */}
          {activeSection === 'routines' && (
            <div className="space-y-6">
              {/* Core Wake & Sleep Schedule */}
              <div className="bg-white border border-[#D9D9D9] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sun className="w-4 h-4 text-[#080808]" />
                    <h3 className="text-sm font-bold text-[#080808]">Daily Sleep & Wake Times</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowWeekdaySchedules(!showWeekdaySchedules)}
                    className="text-xs text-[#080808] underline font-medium hover:text-[#555555] min-h-[44px] inline-flex items-center"
                  >
                    {showWeekdaySchedules ? 'Hide Weekday Overrides' : 'Custom Weekday Times'}
                  </button>
                </div>
                <p className="text-xs text-[#777777]">
                  Tempo protects your sleep by never scheduling work or tasks during sleep hours. Times are formatted in 12-hour AM/PM.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5 p-3 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9]">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#080808] flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-[#080808]" />
                        <span>Default Wake Time</span>
                      </label>
                      <span className="text-xs font-bold text-[#080808] font-mono">
                        {formatTimeTo12Hour(wakeTime)}
                      </span>
                    </div>
                    <input
                      type="time"
                      value={wakeTime}
                      onChange={(e) => setWakeTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9D9D9] bg-white text-[#080808] focus:outline-hidden min-h-[44px]"
                    />
                  </div>

                  <div className="space-y-1.5 p-3 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9]">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#080808] flex items-center gap-1.5">
                        <Moon className="w-3.5 h-3.5 text-[#080808]" />
                        <span>Default Sleep Time</span>
                      </label>
                      <span className="text-xs font-bold text-[#080808] font-mono">
                        {formatTimeTo12Hour(sleepTime)}
                      </span>
                    </div>
                    <input
                      type="time"
                      value={sleepTime}
                      onChange={(e) => setSleepTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9D9D9] bg-white text-[#080808] focus:outline-hidden min-h-[44px]"
                    />
                  </div>
                </div>

                {/* Optional Weekday-Specific Wake/Sleep Schedule */}
                {showWeekdaySchedules && (
                  <div className="pt-3 border-t border-[#EFEFEF] space-y-3">
                    <p className="text-xs font-semibold text-[#080808]">Weekday-Specific Sleep/Wake Overrides:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {WEEKDAY_NAMES.map(({ day, short, full }) => (
                        <div key={day} className="p-2.5 rounded-xl border border-[#D9D9D9] bg-[#FAFAFA] space-y-2">
                          <p className="text-xs font-bold text-[#080808]">{full} ({short})</p>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-[#777777] block text-[10px]">
                                Wake ({formatTimeTo12Hour(weekdayWakeTimes[String(day)] || wakeTime)})
                              </span>
                              <input
                                type="time"
                                value={weekdayWakeTimes[String(day)] || wakeTime}
                                onChange={(e) =>
                                  setWeekdayWakeTimes({ ...weekdayWakeTimes, [String(day)]: e.target.value })
                                }
                                className="w-full px-2 py-1 text-xs rounded border border-[#D9D9D9] bg-white min-h-[36px]"
                              />
                            </div>
                            <div>
                              <span className="text-[#777777] block text-[10px]">
                                Sleep ({formatTimeTo12Hour(weekdaySleepTimes[String(day)] || sleepTime)})
                              </span>
                              <input
                                type="time"
                                value={weekdaySleepTimes[String(day)] || sleepTime}
                                onChange={(e) =>
                                  setWeekdaySleepTimes({ ...weekdaySleepTimes, [String(day)]: e.target.value })
                                }
                                className="w-full px-2 py-1 text-xs rounded border border-[#D9D9D9] bg-white min-h-[36px]"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Personal Routines List & Management */}
              <div className="bg-white border border-[#D9D9D9] rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EFEFEF]">
                  <div>
                    <h3 className="text-sm font-bold text-[#080808] flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#080808]" />
                      <span>Recurring Personal Routines</span>
                    </h3>
                    <p className="text-xs text-[#777777] mt-0.5">
                      Configure meals, workouts, morning habits, and fixed commitments.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCopyModalOpen(true)}
                      className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-[#D9D9D9] bg-[#FAFAFA] hover:bg-white text-xs font-semibold text-[#080808] transition min-h-[44px]"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Weekdays</span>
                    </button>
                    <button
                      type="button"
                      onClick={openAddRoutineModal}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#080808] hover:bg-[#222222] text-xs font-semibold text-white transition min-h-[44px]"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Routine</span>
                    </button>
                  </div>
                </div>

                {/* Day Filter Pills */}
                <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    onClick={() => setSelectedDayFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition min-h-[36px] ${
                      selectedDayFilter === 'ALL'
                        ? 'bg-[#080808] text-white'
                        : 'bg-[#FAFAFA] border border-[#D9D9D9] text-[#777777] hover:text-[#080808]'
                    }`}
                  >
                    All Days
                  </button>
                  {WEEKDAY_NAMES.map(({ day, short }) => (
                    <button
                      key={day}
                      onClick={() => setSelectedDayFilter(day)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition min-h-[36px] ${
                        selectedDayFilter === day
                          ? 'bg-[#080808] text-white'
                          : 'bg-[#FAFAFA] border border-[#D9D9D9] text-[#777777] hover:text-[#080808]'
                      }`}
                    >
                      {short}
                    </button>
                  ))}
                </div>

                {/* Routines Cards */}
                {routinesLoading ? (
                  <div className="py-8 text-center text-xs text-[#777777] flex items-center justify-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading routines...</span>
                  </div>
                ) : filteredRoutines.length === 0 ? (
                  <div className="py-10 text-center space-y-2 border border-dashed border-[#D9D9D9] rounded-xl">
                    <Clock className="w-8 h-8 text-[#777777] mx-auto opacity-50" />
                    <p className="text-xs font-semibold text-[#080808]">No routines for this day</p>
                    <p className="text-[11px] text-[#777777]">
                      Add recurring meals, workouts, or study slots to build your daily rhythm.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredRoutines.map((routine) => {
                      const catConfig =
                        ROUTINE_CATEGORIES.find((c) => c.value === routine.category) ||
                        ROUTINE_CATEGORIES[9];
                      const Icon = catConfig.icon;
                      return (
                        <div
                          key={routine.id}
                          className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 ${
                            routine.isEnabled
                              ? 'bg-white border-[#D9D9D9] hover:border-[#080808]'
                              : 'bg-[#FAFAFA] border-[#E5E5E5] opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-lg bg-[#FAFAFA] border border-[#D9D9D9] flex items-center justify-center shrink-0">
                                <Icon className="w-4 h-4 text-[#080808]" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-[#080808] leading-tight">
                                  {routine.name}
                                </h4>
                                <span className="text-[10px] text-[#777777] font-medium">
                                  {catConfig.label}
                                </span>
                              </div>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                routine.classification === 'FIXED'
                                  ? 'bg-[#080808] text-white'
                                  : 'bg-[#F0F0F0] text-[#404040] border border-[#D9D9D9]'
                              }`}
                            >
                              {routine.classification}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs font-black text-[#080808] font-mono">
                              {formatTimeRange(routine.startTime, routine.endTime)}
                            </p>
                            <div className="flex flex-wrap gap-1 pt-1">
                              {WEEKDAY_NAMES.map(({ day, short }) => {
                                const active = (routine.daysOfWeek || []).includes(day);
                                return (
                                  <span
                                    key={day}
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                                      active
                                        ? 'bg-[#EAEAEA] text-[#080808] font-bold'
                                        : 'text-[#AAAAAA]'
                                    }`}
                                  >
                                    {short}
                                  </span>
                                );
                              })}
                            </div>
                            {routine.description && (
                              <p className="text-[11px] text-[#777777] pt-1 italic line-clamp-1">
                                {routine.description}
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-[#EFEFEF] flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => handleToggleRoutine(routine)}
                              className={`text-[11px] font-semibold transition min-h-[36px] inline-flex items-center ${
                                routine.isEnabled
                                  ? 'text-[#166534] hover:underline'
                                  : 'text-[#777777] hover:text-[#080808]'
                              }`}
                            >
                              {routine.isEnabled ? 'Active' : 'Disabled'}
                            </button>

                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => openEditRoutineModal(routine)}
                                className="p-2 rounded-lg text-[#777777] hover:text-[#080808] hover:bg-[#F5F5F5] transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                                title="Edit Routine"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRoutine(routine.id)}
                                className="p-2 rounded-lg text-[#777777] hover:text-[#991B1B] hover:bg-[#FEE2E2] transition min-w-[36px] min-h-[36px] flex items-center justify-center"
                                title="Delete Routine"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION C: PREFERENCES & TIMEZONE                        */}
          {/* ======================================================== */}
          {activeSection === 'preferences' && (
            <div className="space-y-6">
              {/* Appearance & Theme Mode Card */}
              <div className="bg-white dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#2A2A2A] rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs transition-colors">
                <div className="flex items-center justify-between pb-3 border-b border-[#EFEFEF] dark:border-[#262626]">
                  <div className="flex items-center space-x-2">
                    <Sun className="w-4 h-4 text-[#080808] dark:text-[#F3F3F3]" />
                    <h3 className="text-sm font-bold text-[#080808] dark:text-[#F3F3F3]">
                      Appearance & Theme
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-[#FAFAFA] dark:bg-[#222222] border border-[#EAEAEA] dark:border-[#333333] text-[#080808] dark:text-[#F3F3F3]">
                    Active: {resolvedTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Auto Option */}
                    <button
                      type="button"
                      onClick={() => setThemeMode('AUTO')}
                      className={`p-4 rounded-xl border text-left transition relative flex flex-col justify-between ${
                        themeMode === 'AUTO'
                          ? 'border-[#080808] dark:border-[#F3F3F3] bg-[#FAFAFA] dark:bg-[#222222] ring-1 ring-[#080808] dark:ring-[#F3F3F3]'
                          : 'border-[#D9D9D9] dark:border-[#2E2E2E] bg-white dark:bg-[#181818] hover:border-[#080808] dark:hover:border-[#555555]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-1.5">
                            <Sun className="w-3.5 h-3.5 text-[#080808] dark:text-[#F3F3F3]" />
                            <span className="text-xs text-[#777777] dark:text-[#888888]">/</span>
                            <Moon className="w-3.5 h-3.5 text-[#080808] dark:text-[#F3F3F3]" />
                          </div>
                          {themeMode === 'AUTO' && (
                            <span className="w-2 h-2 rounded-full bg-[#080808] dark:bg-[#F3F3F3]" />
                          )}
                        </div>
                        <p className="text-sm font-bold text-[#080808] dark:text-[#F3F3F3]">Auto</p>
                        <p className="text-[11px] text-[#777777] dark:text-[#A3A3A3] mt-1 leading-relaxed">
                          Follows local rhythm. Light at 6:00 AM, Dark at 6:00 PM.
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-[#EAEAEA] dark:border-[#333333]">
                        <span className="text-[10px] font-mono text-[#080808] dark:text-[#F3F3F3] font-medium">
                          {themeMode === 'AUTO'
                            ? `Currently ${resolvedTheme}`
                            : 'Automatic schedule'}
                        </span>
                      </div>
                    </button>

                    {/* Light Option */}
                    <button
                      type="button"
                      onClick={() => setThemeMode('LIGHT')}
                      className={`p-4 rounded-xl border text-left transition relative flex flex-col justify-between ${
                        themeMode === 'LIGHT'
                          ? 'border-[#080808] dark:border-[#F3F3F3] bg-[#FAFAFA] dark:bg-[#222222] ring-1 ring-[#080808] dark:ring-[#F3F3F3]'
                          : 'border-[#D9D9D9] dark:border-[#2E2E2E] bg-white dark:bg-[#181818] hover:border-[#080808] dark:hover:border-[#555555]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Sun className="w-4 h-4 text-[#080808] dark:text-[#F3F3F3]" />
                          {themeMode === 'LIGHT' && (
                            <span className="w-2 h-2 rounded-full bg-[#080808] dark:bg-[#F3F3F3]" />
                          )}
                        </div>
                        <p className="text-sm font-bold text-[#080808] dark:text-[#F3F3F3]">Light</p>
                        <p className="text-[11px] text-[#777777] dark:text-[#A3A3A3] mt-1 leading-relaxed">
                          Crisp off-white surfaces with high contrast ink typography.
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-[#EAEAEA] dark:border-[#333333]">
                        <span className="text-[10px] font-mono text-[#080808] dark:text-[#F3F3F3] font-medium">
                          Always daytime
                        </span>
                      </div>
                    </button>

                    {/* Dark Option */}
                    <button
                      type="button"
                      onClick={() => setThemeMode('DARK')}
                      className={`p-4 rounded-xl border text-left transition relative flex flex-col justify-between ${
                        themeMode === 'DARK'
                          ? 'border-[#080808] dark:border-[#F3F3F3] bg-[#FAFAFA] dark:bg-[#222222] ring-1 ring-[#080808] dark:ring-[#F3F3F3]'
                          : 'border-[#D9D9D9] dark:border-[#2E2E2E] bg-white dark:bg-[#181818] hover:border-[#080808] dark:hover:border-[#555555]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Moon className="w-4 h-4 text-[#080808] dark:text-[#F3F3F3]" />
                          {themeMode === 'DARK' && (
                            <span className="w-2 h-2 rounded-full bg-[#080808] dark:bg-[#F3F3F3]" />
                          )}
                        </div>
                        <p className="text-sm font-bold text-[#080808] dark:text-[#F3F3F3]">Dark</p>
                        <p className="text-[11px] text-[#777777] dark:text-[#A3A3A3] mt-1 leading-relaxed">
                          Layered charcoal & deep grey tones to reduce eye fatigue.
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-[#EAEAEA] dark:border-[#333333]">
                        <span className="text-[10px] font-mono text-[#080808] dark:text-[#F3F3F3] font-medium">
                          Always nighttime
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* Informational description */}
                  <p className="text-[11px] text-[#777777] dark:text-[#888888] pt-1">
                    {themeMode === 'AUTO'
                      ? `Auto switches based on your configured timezone (${timezone}): 6:00 AM – 6:00 PM uses Light mode, 6:00 PM – 6:00 AM uses Dark mode.`
                      : `Fixed appearance locked to ${themeMode.toLowerCase()} mode across all devices.`}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#D9D9D9] rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
                <div className="flex items-center space-x-2 pb-3 border-b border-[#EFEFEF]">
                  <Clock className="w-4 h-4 text-[#080808]" />
                  <h3 className="text-sm font-bold text-[#080808]">Timezone & Display Format</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#080808]">Timezone (IANA)</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D9D9] bg-[#FAFAFA] text-[#080808] focus:bg-white focus:outline-hidden min-h-[44px]"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-[#777777]">
                      Schedules and timetables are generated according to your selected timezone.
                    </p>
                  </div>

                  {/* 12-Hour Display Indicator Notice */}
                  <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] flex items-start space-x-3 text-xs">
                    <Clock className="w-4 h-4 text-[#080808] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[#080808]">12-Hour Time Display</p>
                      <p className="text-[#777777] mt-0.5 leading-relaxed">
                        Tempo consistently uses 12-hour format with AM/PM (e.g. 6:00 AM, 12:30 PM, 11:45 PM) across all dashboard timelines, calendars, tasks, and routines.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-[#080808]">Work Start</label>
                        <span className="text-[11px] font-mono text-[#777777]">
                          {formatTimeTo12Hour(preferredWorkStart)}
                        </span>
                      </div>
                      <input
                        type="time"
                        value={preferredWorkStart}
                        onChange={(e) => setPreferredWorkStart(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D9D9] bg-[#FAFAFA] text-[#080808] min-h-[44px]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-[#080808]">Work End</label>
                        <span className="text-[11px] font-mono text-[#777777]">
                          {formatTimeTo12Hour(preferredWorkEnd)}
                        </span>
                      </div>
                      <input
                        type="time"
                        value={preferredWorkEnd}
                        onChange={(e) => setPreferredWorkEnd(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D9D9] bg-[#FAFAFA] text-[#080808] min-h-[44px]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#080808]">Break Duration</label>
                      <select
                        value={defaultBreakDuration}
                        onChange={(e) => setDefaultBreakDuration(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D9D9] bg-[#FAFAFA] text-[#080808] min-h-[44px]"
                      >
                        <option value={10}>10 minutes</option>
                        <option value={15}>15 minutes (Standard)</option>
                        <option value={20}>20 minutes</option>
                        <option value={30}>30 minutes</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-[#080808] text-white text-xs font-semibold hover:bg-[#222222] transition min-h-[44px]"
                  >
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION D: NOTIFICATIONS                                 */}
          {/* ======================================================== */}
          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <PWAInstallBanner />

              <div className="bg-white border border-[#D9D9D9] rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#EFEFEF]">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-[#080808]" />
                    <h3 className="text-sm font-bold text-[#080808]">Push & Reminder Notifications</h3>
                  </div>

                  <button
                    type="button"
                    onClick={handleTogglePush}
                    disabled={pushLoading || !pushSupported}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition min-h-[44px] flex items-center space-x-1.5 ${
                      pushEnabled
                        ? 'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]'
                        : 'bg-[#080808] text-white hover:bg-[#222222]'
                    }`}
                  >
                    {pushLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : pushEnabled ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Bell className="w-3.5 h-3.5" />
                    )}
                    <span>{pushEnabled ? 'Push Enabled' : 'Enable Web Push'}</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9]">
                    <div>
                      <p className="text-xs font-bold text-[#080808]">Auto Nightly Planning</p>
                      <p className="text-[11px] text-[#777777]">
                        Automatically generate tomorrow&apos;s schedule draft in the background.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoPlanning}
                      onChange={(e) => setAutoPlanning(e.target.checked)}
                      className="w-4 h-4 rounded text-[#080808] accent-[#080808]"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9]">
                    <div>
                      <p className="text-xs font-bold text-[#080808]">Tomorrow&apos;s Plan Notification</p>
                      <p className="text-[11px] text-[#777777]">
                        Notify you when tomorrow&apos;s schedule is generated and ready for review.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyTomorrowPlan}
                      onChange={(e) => setNotifyTomorrowPlan(e.target.checked)}
                      className="w-4 h-4 rounded text-[#080808] accent-[#080808]"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9]">
                    <div>
                      <p className="text-xs font-bold text-[#080808]">Task Reminders</p>
                      <p className="text-[11px] text-[#777777]">
                        Receive alerts for tasks approaching their due dates.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyTaskReminders}
                      onChange={(e) => setNotifyTaskReminders(e.target.checked)}
                      className="w-4 h-4 rounded text-[#080808] accent-[#080808]"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9]">
                    <div>
                      <p className="text-xs font-bold text-[#080808]">Schedule Block Reminders</p>
                      <p className="text-[11px] text-[#777777]">
                        Receive 5-minute alerts before focus blocks or routine sessions start.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyScheduleReminders}
                      onChange={(e) => setNotifyScheduleReminders(e.target.checked)}
                      className="w-4 h-4 rounded text-[#080808] accent-[#080808]"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9]">
                    <div>
                      <p className="text-xs font-bold text-[#080808]">Schedule Change Alerts</p>
                      <p className="text-[11px] text-[#777777]">
                        Notify you when rescheduling shifts your daily blocks.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyScheduleChanges}
                      onChange={(e) => setNotifyScheduleChanges(e.target.checked)}
                      className="w-4 h-4 rounded text-[#080808] accent-[#080808]"
                    />
                  </div>

                  <div className="space-y-1.5 p-3 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9]">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#080808]">
                        Preferred Planning Time
                      </label>
                      <span className="text-xs font-bold text-[#080808] font-mono">
                        {formatTimeTo12Hour(planningTime)}
                      </span>
                    </div>
                    <input
                      type="time"
                      value={planningTime}
                      onChange={(e) => setPlanningTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#D9D9D9] bg-white min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-[#080808] text-white text-xs font-semibold hover:bg-[#222222] transition min-h-[44px]"
                  >
                    {saving ? 'Saving...' : 'Save Notification Preferences'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION E: INTEGRATIONS (GOOGLE AUTH & CALENDAR)        */}
          {/* ======================================================== */}
          {activeSection === 'integrations' && (
            <div className="space-y-6">
              {/* Informational Callout: Sign-In vs Calendar Authorization */}
              <div className="p-4 rounded-xl bg-white border border-[#D9D9D9] space-y-2 text-xs shadow-xs">
                <h4 className="font-bold text-[#080808] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#080808]" />
                  <span>Google Integration Overview</span>
                </h4>
                <p className="text-[#777777] leading-relaxed">
                  Tempo separates <strong>Google Sign-In</strong> (which authenticates your identity) from <strong>Google Calendar Authorization</strong> (which synchronizes your events to avoid scheduling conflicts). You can connect your calendar independently of how you sign in.
                </p>
              </div>

              {/* 1. Google Account Linking */}
              <div className="bg-white border border-[#D9D9D9] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#EFEFEF]">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-[#080808]" />
                    <h3 className="text-sm font-bold text-[#080808]">Google Identity & Sign-In</h3>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      googleCalendarStatus?.googleAccountConnected
                        ? 'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]'
                        : 'bg-[#F5F5F5] text-[#777777] border border-[#D9D9D9]'
                    }`}
                  >
                    {googleCalendarStatus?.googleAccountConnected ? 'Connected' : 'Not Linked'}
                  </span>
                </div>

                {googleCalendarStatus?.googleAccountConnected ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9]">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-[#080808] text-white flex items-center justify-center font-bold text-xs">
                          G
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#080808]">
                            {googleCalendarStatus.googleName || 'Google Account'}
                          </p>
                          <p className="text-[11px] text-[#777777]">
                            {googleCalendarStatus.googleEmail}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleUnlinkGoogle}
                        disabled={unlinkingGoogle}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-[#D9D9D9] text-[#991B1B] hover:bg-[#FEF2F2] text-xs font-semibold transition min-h-[44px]"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        <span>{unlinkingGoogle ? 'Unlinking...' : 'Unlink'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-[#777777]">
                      Link your Google account to log into Tempo with a single click.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleConnectGoogle('link')}
                      className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-[#D9D9D9] bg-white hover:bg-[#FAFAFA] text-[#080808] text-xs font-semibold shadow-xs transition min-h-[44px]"
                    >
                      <LinkIcon className="w-4 h-4" />
                      <span>Link Google Account</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Google Calendar Integration */}
              <div className="bg-white border border-[#D9D9D9] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#EFEFEF]">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-[#080808]" />
                    <h3 className="text-sm font-bold text-[#080808]">Google Calendar Sync</h3>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      googleCalendarStatus?.calendarConnected
                        ? 'bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]'
                        : 'bg-[#F5F5F5] text-[#777777] border border-[#D9D9D9]'
                    }`}
                  >
                    {googleCalendarStatus?.calendarConnected ? 'Sync Active' : 'Disconnected'}
                  </span>
                </div>

                {googleCalendarStatus?.calendarConnected ? (
                  <div className="space-y-4">
                    <p className="text-xs text-[#777777]">
                      Google Calendar events are imported into Tempo as busy time blocks to prevent scheduling overlaps.
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9]">
                      <div>
                        <p className="text-xs font-bold text-[#080808]">
                          Last Synchronized:
                        </p>
                        <p className="text-[11px] text-[#777777] font-mono mt-0.5">
                          {googleCalendarStatus.lastSyncedAt
                            ? new Date(googleCalendarStatus.lastSyncedAt).toLocaleString()
                            : 'Never'}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={handleSyncCalendar}
                          disabled={syncingCalendar}
                          className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#080808] text-white text-xs font-semibold hover:bg-[#222222] transition min-h-[44px]"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingCalendar ? 'animate-spin' : ''}`} />
                          <span>{syncingCalendar ? 'Syncing...' : 'Sync Now'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleDisconnectCalendar}
                          disabled={disconnectingCalendar}
                          className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-[#D9D9D9] text-[#991B1B] hover:bg-[#FEF2F2] text-xs font-semibold transition min-h-[44px]"
                        >
                          <span>Disconnect</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-[#777777]">
                      Connect Google Calendar to import meetings and appointments automatically. Tempo keeps your task schedule in harmony with your external commitments.
                    </p>
                    <button
                      type="button"
                      onClick={handleConnectCalendar}
                      className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#080808] text-white text-xs font-semibold hover:bg-[#222222] transition min-h-[44px]"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Connect Google Calendar</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODAL: ADD / EDIT ROUTINE                                */}
          {/* ======================================================== */}
          {isRoutineModalOpen && (
            <div className="fixed inset-0 z-50 bg-[#000000]/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="bg-white border-t sm:border border-[#D9D9D9] rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-[#EFEFEF]">
                  <h3 className="text-sm font-bold text-[#080808]">
                    {editingRoutine ? 'Edit Personal Routine' : 'Add Personal Routine'}
                  </h3>
                  <button
                    onClick={() => setIsRoutineModalOpen(false)}
                    className="p-1.5 text-[#777777] hover:text-[#080808] rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveRoutine} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#080808]">Routine Name</label>
                    <input
                      type="text"
                      value={routineName}
                      onChange={(e) => setRoutineName(e.target.value)}
                      placeholder="e.g. Morning Workout or Lunch Break"
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D9D9] bg-[#FAFAFA] text-[#080808] focus:bg-white focus:outline-hidden min-h-[44px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#080808]">Category</label>
                      <select
                        value={routineCategory}
                        onChange={(e) => setRoutineCategory(e.target.value as RoutineCategory)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D9D9] bg-[#FAFAFA] text-[#080808] min-h-[44px]"
                      >
                        {ROUTINE_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#080808]">Classification</label>
                      <select
                        value={routineClassification}
                        onChange={(e) =>
                          setRoutineClassification(e.target.value as RoutineClassification)
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D9D9] bg-[#FAFAFA] text-[#080808] min-h-[44px]"
                      >
                        <option value="FIXED">FIXED (Non-negotiable)</option>
                        <option value="FLEXIBLE">FLEXIBLE (Can shift)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-[#080808]">Start Time</label>
                        <span className="text-[10px] font-mono font-bold text-[#080808]">
                          {formatTimeTo12Hour(routineStartTime)}
                        </span>
                      </div>
                      <input
                        type="time"
                        value={routineStartTime}
                        onChange={(e) => setRoutineStartTime(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D9D9] bg-[#FAFAFA] min-h-[44px]"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-[#080808]">End Time</label>
                        <span className="text-[10px] font-mono font-bold text-[#080808]">
                          {formatTimeTo12Hour(routineEndTime)}
                        </span>
                      </div>
                      <input
                        type="time"
                        value={routineEndTime}
                        onChange={(e) => setRoutineEndTime(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D9D9] bg-[#FAFAFA] min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#080808]">Active Days</label>
                    <div className="grid grid-cols-7 gap-1">
                      {WEEKDAY_NAMES.map(({ day, short }) => {
                        const selected = routineDays.includes(day);
                        return (
                          <button
                            type="button"
                            key={day}
                            onClick={() => {
                              if (selected) {
                                if (routineDays.length > 1) {
                                  setRoutineDays(routineDays.filter((d) => d !== day));
                                }
                              } else {
                                setRoutineDays([...routineDays, day].sort());
                              }
                            }}
                            className={`py-2 rounded-lg text-xs font-mono font-bold transition min-h-[44px] ${
                              selected
                                ? 'bg-[#080808] text-white'
                                : 'bg-[#FAFAFA] border border-[#D9D9D9] text-[#777777]'
                            }`}
                          >
                            {short}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#080808]">Notes (Optional)</label>
                    <input
                      type="text"
                      value={routineDescription}
                      onChange={(e) => setRoutineDescription(e.target.value)}
                      placeholder="e.g. Gym or meal preferences"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D9D9] bg-[#FAFAFA] min-h-[44px]"
                    />
                  </div>

                  <div className="pt-3 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsRoutineModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-[#D9D9D9] text-xs font-semibold text-[#777777] hover:bg-[#F5F5F5] transition min-h-[44px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={routineSaving}
                      className="px-4 py-2 rounded-xl bg-[#080808] text-white text-xs font-semibold hover:bg-[#222222] transition min-h-[44px]"
                    >
                      {routineSaving ? 'Saving...' : editingRoutine ? 'Update Routine' : 'Create Routine'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODAL: COPY ROUTINES BETWEEN WEEKDAYS                    */}
          {/* ======================================================== */}
          {isCopyModalOpen && (
            <div className="fixed inset-0 z-50 bg-[#000000]/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="bg-white border-t sm:border border-[#D9D9D9] rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-[#EFEFEF]">
                  <h3 className="text-sm font-bold text-[#080808]">Copy Routines Between Days</h3>
                  <button
                    onClick={() => setIsCopyModalOpen(false)}
                    className="p-1.5 text-[#777777] hover:text-[#080808] rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCopyRoutines} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#080808]">Copy From Day:</label>
                    <select
                      value={copyFromDay}
                      onChange={(e) => setCopyFromDay(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D9D9] bg-[#FAFAFA] min-h-[44px]"
                    >
                      {WEEKDAY_NAMES.map(({ day, full }) => (
                        <option key={day} value={day}>
                          {full}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#080808]">Copy To Days:</label>
                    <div className="grid grid-cols-7 gap-1">
                      {WEEKDAY_NAMES.map(({ day, short }) => {
                        const selected = copyToDays.includes(day);
                        const isSource = copyFromDay === day;
                        return (
                          <button
                            type="button"
                            key={day}
                            disabled={isSource}
                            onClick={() => {
                              if (selected) {
                                setCopyToDays(copyToDays.filter((d) => d !== day));
                              } else {
                                setCopyToDays([...copyToDays, day].sort());
                              }
                            }}
                            className={`py-2 rounded-lg text-xs font-mono font-bold transition min-h-[44px] ${
                              isSource
                                ? 'bg-[#E5E5E5] text-[#999999] cursor-not-allowed'
                                : selected
                                  ? 'bg-[#080808] text-white'
                                  : 'bg-[#FAFAFA] border border-[#D9D9D9] text-[#777777]'
                            }`}
                          >
                            {short}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsCopyModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-[#D9D9D9] text-xs font-semibold text-[#777777] hover:bg-[#F5F5F5] min-h-[44px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={copySaving}
                      className="px-4 py-2 rounded-xl bg-[#080808] text-white text-xs font-semibold hover:bg-[#222222] min-h-[44px]"
                    >
                      {copySaving ? 'Copying...' : 'Copy Routines'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
