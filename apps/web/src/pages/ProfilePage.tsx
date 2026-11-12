import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { ActivityHeatmap } from '../components/ActivityHeatmap';
import { TempoAnimation } from '../components/TempoAnimation';
import {
  Settings,
  Edit3,
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ArrowRight,
  Coffee,
} from 'lucide-react';

export function ProfilePage() {
  const { user, preference, updateProfile } = useAuth();

  // Edit Profile Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOpenEdit = () => {
    setName(user?.name || '');
    setAvatarUrl(user?.avatarUrl || '');
    setMessage(null);
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await updateProfile({
        name: name.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });
      setMessage({ type: 'success', text: 'Profile updated successfully' });
      setTimeout(() => {
        setIsEditModalOpen(false);
        setMessage(null);
      }, 700);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const timezone = preference?.timezone || 'Asia/Kolkata';

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#181818] text-[#080808] dark:text-[#F5F5F5] font-sans pb-28 md:pb-12 transition-colors">
      <Navbar />

      <div className="md:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          {/* Personal Information & Header Card */}
          <div className="bg-white dark:bg-[#181818] border border-[#D9D9D9] dark:border-[#383838] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EFEFEF] dark:border-[#383838]">
              {/* Avatar & User Details */}
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#080808] dark:bg-[#282828] text-white dark:text-[#F5F5F5] flex items-center justify-center font-black text-2xl sm:text-3xl overflow-hidden border-2 border-[#D9D9D9] dark:border-[#383838] shrink-0">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name || 'User Avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (user?.name || user?.email || 'U')[0].toUpperCase()
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black text-[#080808] dark:text-[#F5F5F5] tracking-tight">
                      {user?.name || 'Tempo User'}
                    </h1>
                  </div>

                  <p className="text-xs sm:text-sm text-[#777777] dark:text-[#929292] font-medium">{user?.email}</p>

                  <div className="flex items-center space-x-3 text-xs text-[#777777] dark:text-[#929292] pt-0.5">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-[#080808] dark:text-[#F5F5F5]" />
                      <span>{timezone}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-[#080808] dark:text-[#F5F5F5]" />
                      <span>12-Hour Active</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Edit Profile & Settings Gear */}
              <div className="flex items-center space-x-2 self-start sm:self-auto">
                <button
                  onClick={handleOpenEdit}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-[#D9D9D9] dark:border-[#383838] bg-[#FAFAFA] dark:bg-[#282828] hover:bg-white dark:hover:bg-[#282828] text-xs font-semibold text-[#080808] dark:text-[#F5F5F5] transition shadow-2xs min-h-[44px]"
                  aria-label="Edit Profile"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>

                <Link
                  to="/settings"
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#080808] dark:bg-[#F5F5F5] hover:bg-[#222222] dark:hover:bg-[#E5E5E5] text-xs font-semibold text-white dark:text-[#181818] transition shadow-2xs min-h-[44px]"
                  aria-label="Open Settings"
                  title="Configure Tempo Settings"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Activity Heatmap Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-base font-bold text-[#080808] dark:text-[#F5F5F5]">Personal Activity Snapshot</h2>
                <p className="text-xs text-[#777777] dark:text-[#929292]">
                  Your 365-day productivity heatmap and focus consistency.
                </p>
              </div>
              <Link
                to="/analytics"
                className="text-xs font-semibold text-[#080808] dark:text-[#F5F5F5] hover:underline inline-flex items-center gap-1"
              >
                <span>Full Analytics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <ActivityHeatmap />
          </div>

          {/* Decorative Calm Break / Tea Cup Animation */}
          <div className="pt-8 pb-4 flex flex-col items-center justify-center text-center space-y-2 select-none pointer-events-none">
            <TempoAnimation
              name="tea"
              alt="Tea cup with rising steam"
              size={110}
              className="opacity-90"
              fallback={<Coffee className="w-10 h-10 text-[#777777] dark:text-[#929292]" />}
            />
            <p className="font-handwritten text-xl text-[#777777] dark:text-[#929292]">
              find your rhythm
            </p>
          </div>

          {/* Compact Edit Profile Modal */}
          {isEditModalOpen && (
            <div className="fixed inset-0 z-50 bg-[#000000]/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="bg-white dark:bg-[#181818] border-t sm:border border-[#D9D9D9] dark:border-[#383838] rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-[#EFEFEF] dark:border-[#383838]">
                  <h3 className="text-sm font-bold text-[#080808] dark:text-[#F5F5F5] flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-[#080808] dark:text-[#F5F5F5]" />
                    <span>Edit Profile Details</span>
                  </h3>
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="p-1.5 text-[#777777] dark:text-[#929292] hover:text-[#080808] dark:hover:text-[#F5F5F5] rounded-lg transition"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {message && (
                  <div
                    className={`p-3 rounded-xl flex items-center space-x-2 text-xs font-medium ${
                      message.type === 'success'
                        ? 'bg-[#F0FDF4] dark:bg-[#14532D]/30 text-[#166534] dark:text-[#86EFAC] border border-[#BBF7D0] dark:border-[#166534]'
                        : 'bg-[#FEF2F2] dark:bg-[#7F1D1D]/30 text-[#991B1B] dark:text-[#FCA5A5] border border-[#FECACA] dark:border-[#991B1B]'
                    }`}
                  >
                    {message.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{message.text}</span>
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#080808] dark:text-[#F5F5F5]">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D9D9] dark:border-[#383838] bg-[#FAFAFA] dark:bg-[#202020] text-[#080808] dark:text-[#F5F5F5] focus:bg-white dark:focus:bg-[#202020] focus:outline-hidden min-h-[44px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#080808] dark:text-[#F5F5F5]">Email Address</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D9D9] dark:border-[#383838] bg-[#F5F5F5] dark:bg-[#282828] text-[#777777] dark:text-[#929292] cursor-not-allowed min-h-[44px]"
                    />
                    <p className="text-[10px] text-[#777777] dark:text-[#929292]">
                      Email address cannot be changed directly.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#080808] dark:text-[#F5F5F5]">Avatar Image URL</label>
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#D9D9D9] dark:border-[#383838] bg-[#FAFAFA] dark:bg-[#202020] text-[#080808] dark:text-[#F5F5F5] focus:bg-white dark:focus:bg-[#202020] focus:outline-hidden min-h-[44px]"
                    />
                  </div>

                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-[#D9D9D9] dark:border-[#383838] text-xs font-semibold text-[#777777] dark:text-[#929292] hover:bg-[#F5F5F5] dark:hover:bg-[#282828] min-h-[44px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-[#080808] dark:bg-[#F5F5F5] text-white dark:text-[#181818] text-xs font-semibold hover:bg-[#222222] dark:hover:bg-[#E5E5E5] transition min-h-[44px]"
                    >
                      {saving ? (
                        <div className="flex items-center space-x-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </div>
                      ) : (
                        'Save Changes'
                      )}
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
