import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Clock, Sun, Briefcase, Coffee, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { TIME_REGEX, formatTimeTo12Hour } from '@tempo/shared';
import { TempoLogo } from '../components/TempoLogo';

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

export function OnboardingPage() {
  const { user, preference, updatePreferences, updateProfile } = useAuth();
  const navigate = useNavigate();

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

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): string | null => {
    if (!name.trim()) return 'Name is required';
    if (!TIME_REGEX.test(wakeTime)) return 'Wake-up time must be valid (HH:mm)';
    if (!TIME_REGEX.test(sleepTime)) return 'Sleep time must be valid (HH:mm)';
    if (!TIME_REGEX.test(preferredWorkStart)) return 'Work start time must be valid (HH:mm)';
    if (!TIME_REGEX.test(preferredWorkEnd)) return 'Work end time must be valid (HH:mm)';
    if (!TIME_REGEX.test(breakfastTime)) return 'Breakfast time must be valid (HH:mm)';
    if (!TIME_REGEX.test(lunchTime)) return 'Lunch time must be valid (HH:mm)';
    if (!TIME_REGEX.test(dinnerTime)) return 'Dinner time must be valid (HH:mm)';
    if (preferredBreakDuration < 5 || preferredBreakDuration > 120) {
      return 'Break duration must be between 5 and 120 minutes';
    }
    if (maxContinuousWorkDuration < 15 || maxContinuousWorkDuration > 360) {
      return 'Max continuous work must be between 15 and 360 minutes';
    }
    if (dailyLeisureTarget < 0 || dailyLeisureTarget > 720) {
      return 'Daily leisure target must be between 0 and 720 minutes';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

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
        onboardingCompleted: true,
      });

      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to save onboarding preferences');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#101010] text-[#080808] dark:text-[#F5F5F5] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <TempoLogo size="lg" showTagline={false} className="items-center" />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#080808] dark:text-[#F5F5F5] flex items-baseline justify-center gap-2">
            <span>Set up your daily</span>
            <span className="font-handwritten text-3xl font-normal text-[#777777] dark:text-[#858585]">rhythm</span>
          </h1>
          <p className="text-[#777777] dark:text-[#858585] text-xs sm:text-sm max-w-md mx-auto">
            Tempo adapts around your natural routine. Configure your baseline sleep, working hours,
            and meal intervals. You can adjust these anytime in settings.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-[#F5F5F5] dark:bg-[#262626] border border-[#080808] dark:border-[#F5F5F5] text-[#080808] dark:text-[#F5F5F5] text-xs flex items-center space-x-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Identity & Timezone */}
          <div className="bg-[#FFFFFF] dark:bg-[#1E1E1E] border border-[#D9D9D9] dark:border-[#353535] rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center space-x-2 text-[#080808] dark:text-[#F5F5F5] text-sm font-semibold">
              <Clock className="w-4 h-4" />
              <span>General Profile & Timezone</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#404040] dark:text-[#D4D4D4] mb-1.5">
                  Your Preferred Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFA] dark:bg-[#121212] border border-[#D9D9D9] dark:border-[#2A2A2A] text-[#080808] dark:text-[#F3F3F3] text-sm focus:outline-none focus:border-[#080808] dark:focus:border-[#F3F3F3] focus:bg-[#FFFFFF] dark:focus:bg-[#181818]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#404040] dark:text-[#D4D4D4] mb-1.5">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFA] dark:bg-[#121212] border border-[#D9D9D9] dark:border-[#2A2A2A] text-[#080808] dark:text-[#F3F3F3] text-sm focus:outline-none focus:border-[#080808] dark:focus:border-[#F3F3F3] focus:bg-[#FFFFFF] dark:focus:bg-[#181818]"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Sleep & Awakening Cycle */}
          <div className="bg-[#FFFFFF] dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#2A2A2A] rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center space-x-2 text-[#080808] dark:text-[#F3F3F3] text-sm font-semibold">
              <Sun className="w-4 h-4" />
              <span>Sleep & Awakening Cycle</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-[#404040] dark:text-[#D4D4D4]">
                    Typical Wake-up Time
                  </label>
                  <span className="text-[11px] font-mono font-bold text-[#080808] dark:text-[#F3F3F3]">
                    {formatTimeTo12Hour(wakeTime)}
                  </span>
                </div>
                <input
                  type="time"
                  required
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFA] dark:bg-[#121212] border border-[#D9D9D9] dark:border-[#2A2A2A] text-[#080808] dark:text-[#F3F3F3] text-sm focus:outline-none focus:border-[#080808] dark:focus:border-[#F3F3F3] focus:bg-[#FFFFFF] dark:focus:bg-[#181818]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-[#404040] dark:text-[#D4D4D4]">
                    Target Sleep Time
                  </label>
                  <span className="text-[11px] font-mono font-bold text-[#080808] dark:text-[#F3F3F3]">
                    {formatTimeTo12Hour(sleepTime)}
                  </span>
                </div>
                <input
                  type="time"
                  required
                  value={sleepTime}
                  onChange={(e) => setSleepTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFA] dark:bg-[#121212] border border-[#D9D9D9] dark:border-[#2A2A2A] text-[#080808] dark:text-[#F3F3F3] text-sm focus:outline-none focus:border-[#080808] dark:focus:border-[#F3F3F3] focus:bg-[#FFFFFF] dark:focus:bg-[#181818]"
                />
              </div>
            </div>
          </div>

          {/* 3. Work & Study Habits */}
          <div className="bg-[#FFFFFF] dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#2A2A2A] rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center space-x-2 text-[#080808] dark:text-[#F3F3F3] text-sm font-semibold">
              <Briefcase className="w-4 h-4" />
              <span>Work & Study Habits</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-[#404040] dark:text-[#D4D4D4]">
                    Work Start Time
                  </label>
                  <span className="text-[11px] font-mono font-bold text-[#080808] dark:text-[#F3F3F3]">
                    {formatTimeTo12Hour(preferredWorkStart)}
                  </span>
                </div>
                <input
                  type="time"
                  required
                  value={preferredWorkStart}
                  onChange={(e) => setPreferredWorkStart(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFA] dark:bg-[#121212] border border-[#D9D9D9] dark:border-[#2A2A2A] text-[#080808] dark:text-[#F3F3F3] text-sm focus:outline-none focus:border-[#080808] dark:focus:border-[#F3F3F3] focus:bg-[#FFFFFF] dark:focus:bg-[#181818]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-[#404040] dark:text-[#D4D4D4]">
                    Work End Time
                  </label>
                  <span className="text-[11px] font-mono font-bold text-[#080808] dark:text-[#F3F3F3]">
                    {formatTimeTo12Hour(preferredWorkEnd)}
                  </span>
                </div>
                <input
                  type="time"
                  required
                  value={preferredWorkEnd}
                  onChange={(e) => setPreferredWorkEnd(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFA] dark:bg-[#121212] border border-[#D9D9D9] dark:border-[#2A2A2A] text-[#080808] dark:text-[#F3F3F3] text-sm focus:outline-none focus:border-[#080808] dark:focus:border-[#F3F3F3] focus:bg-[#FFFFFF] dark:focus:bg-[#181818]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#404040] dark:text-[#D4D4D4] mb-1.5">
                  Preferred Break Duration (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  required
                  value={preferredBreakDuration}
                  onChange={(e) => setPreferredBreakDuration(parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFA] dark:bg-[#121212] border border-[#D9D9D9] dark:border-[#2A2A2A] text-[#080808] dark:text-[#F3F3F3] text-sm focus:outline-none focus:border-[#080808] dark:focus:border-[#F3F3F3] focus:bg-[#FFFFFF] dark:focus:bg-[#181818]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#404040] dark:text-[#D4D4D4] mb-1.5">
                  Max Continuous Work Duration (minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  max="360"
                  required
                  value={maxContinuousWorkDuration}
                  onChange={(e) => setMaxContinuousWorkDuration(parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFA] dark:bg-[#121212] border border-[#D9D9D9] dark:border-[#2A2A2A] text-[#080808] dark:text-[#F3F3F3] text-sm focus:outline-none focus:border-[#080808] dark:focus:border-[#F3F3F3] focus:bg-[#FFFFFF] dark:focus:bg-[#181818]"
                />
              </div>
            </div>
          </div>

          {/* 4. Meals & Leisure */}
          <div className="bg-[#FFFFFF] dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#2A2A2A] rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center space-x-2 text-[#080808] dark:text-[#F3F3F3] text-sm font-semibold">
              <Coffee className="w-4 h-4" />
              <span>Meal Timings & Downtime</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#404040] dark:text-[#D4D4D4] mb-1.5">
                  Breakfast Time
                </label>
                <input
                  type="time"
                  required
                  value={breakfastTime}
                  onChange={(e) => setBreakfastTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFA] dark:bg-[#121212] border border-[#D9D9D9] dark:border-[#2A2A2A] text-[#080808] dark:text-[#F3F3F3] text-sm focus:outline-none focus:border-[#080808] dark:focus:border-[#F3F3F3] focus:bg-[#FFFFFF] dark:focus:bg-[#181818]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#404040] dark:text-[#D4D4D4] mb-1.5">
                  Lunch Time
                </label>
                <input
                  type="time"
                  required
                  value={lunchTime}
                  onChange={(e) => setLunchTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFA] dark:bg-[#121212] border border-[#D9D9D9] dark:border-[#2A2A2A] text-[#080808] dark:text-[#F3F3F3] text-sm focus:outline-none focus:border-[#080808] dark:focus:border-[#F3F3F3] focus:bg-[#FFFFFF] dark:focus:bg-[#181818]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#404040] dark:text-[#D4D4D4] mb-1.5">
                  Dinner Time
                </label>
                <input
                  type="time"
                  required
                  value={dinnerTime}
                  onChange={(e) => setDinnerTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFA] dark:bg-[#121212] border border-[#D9D9D9] dark:border-[#2A2A2A] text-[#080808] dark:text-[#F3F3F3] text-sm focus:outline-none focus:border-[#080808] dark:focus:border-[#F3F3F3] focus:bg-[#FFFFFF] dark:focus:bg-[#181818]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#404040] dark:text-[#D4D4D4] mb-1.5">
                Daily Leisure / Personal Downtime Target (minutes)
              </label>
              <input
                type="number"
                min="0"
                max="720"
                required
                value={dailyLeisureTarget}
                onChange={(e) => setDailyLeisureTarget(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFA] dark:bg-[#121212] border border-[#D9D9D9] dark:border-[#2A2A2A] text-[#080808] dark:text-[#F3F3F3] text-sm focus:outline-none focus:border-[#080808] dark:focus:border-[#F3F3F3] focus:bg-[#FFFFFF] dark:focus:bg-[#181818]"
              />
              <p className="text-[11px] text-[#777777] dark:text-[#A3A3A3] mt-1">
                E.g. 120 minutes = 2 hours reserved for exercise, hobbies, reading, or downtime.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-xl bg-[#080808] hover:bg-[#171717] dark:bg-[#F3F3F3] dark:hover:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#080808] font-medium text-sm transition flex items-center space-x-2 disabled:opacity-50 active:scale-[0.99]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Preferences...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Onboarding & Enter Tempo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
