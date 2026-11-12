import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { TempoLogo } from '../components/TempoLogo';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const err = searchParams.get('error');
    const msg = searchParams.get('message');
    if (err === 'ACCOUNT_EXISTS_LINK_REQUIRED') {
      setError(
        'An account with this email already exists. Please log in with your password and link your Google account in Settings.'
      );
    } else if (msg) {
      setError(decodeURIComponent(msg));
    } else if (err) {
      setError(`Google sign-in error: ${err}`);
    }
  }, [location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    setSubmitting(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#101010] text-[#080808] dark:text-[#F2F2F2] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 max-w-full overflow-x-hidden">
      <div className="w-full max-w-md mx-auto text-center">
        <TempoLogo size="xl" showTagline={true} className="items-center" />
        <h2 className="mt-6 text-xl font-semibold tracking-tight text-[#080808] dark:text-[#F2F2F2]">Welcome back</h2>
        <p className="mt-1 font-handwritten text-xl text-[#777777] dark:text-[#858585]">
          sign in to access your rhythm
        </p>
      </div>

      <div className="mt-8 w-full max-w-md mx-auto">
        <div className="bg-[#FFFFFF] dark:bg-[#1D1D1D] border border-[#D9D9D9] dark:border-[#353535] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-[#F5F5F5] dark:bg-[#252525] border border-[#080808] dark:border-[#F5F5F5] text-[#080808] dark:text-[#F2F2F2] text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Continue with Google */}
          <div>
            <a
              href="/api/auth/google"
              className="w-full py-2.5 px-4 rounded-xl bg-[#FFFFFF] dark:bg-[#252525] hover:bg-[#F5F5F5] dark:hover:bg-[#292929] text-[#080808] dark:text-[#F2F2F2] font-medium text-xs sm:text-sm border border-[#D9D9D9] dark:border-[#353535] transition flex items-center justify-center space-x-2.5 active:scale-[0.99]"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </a>
          </div>

          <div className="relative flex items-center py-0.5">
            <div className="flex-1 border-t border-[#D9D9D9] dark:border-[#2A2A2A]" />
            <span className="shrink-0 bg-[#FFFFFF] dark:bg-[#181818] px-3 text-[11px] font-medium tracking-wider text-[#777777] dark:text-[#A3A3A3] uppercase">
              Or with email
            </span>
            <div className="flex-1 border-t border-[#D9D9D9] dark:border-[#2A2A2A]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#404040] dark:text-[#D4D4D4] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFA] dark:bg-[#121212] border border-[#D9D9D9] dark:border-[#2A2A2A] text-[#080808] dark:text-[#F3F3F3] placeholder-[#777777] dark:placeholder-[#666666] text-sm focus:outline-none focus:border-[#080808] dark:focus:border-[#F3F3F3] focus:bg-[#FFFFFF] dark:focus:bg-[#181818] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#404040] dark:text-[#D4D4D4] mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFA] dark:bg-[#121212] border border-[#D9D9D9] dark:border-[#2A2A2A] text-[#080808] dark:text-[#F3F3F3] placeholder-[#777777] dark:placeholder-[#666666] text-sm focus:outline-none focus:border-[#080808] dark:focus:border-[#F3F3F3] focus:bg-[#FFFFFF] dark:focus:bg-[#181818] transition"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#080808] hover:bg-[#171717] dark:bg-[#F3F3F3] dark:hover:bg-[#FFFFFF] text-[#FFFFFF] dark:text-[#080808] font-medium text-sm transition flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-[0.99]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-[#EFEFEF] dark:border-[#2A2A2A] space-y-3">
            <div className="p-3 rounded-xl bg-[#F5F5F5] dark:bg-[#222222] border border-[#D9D9D9] dark:border-[#2A2A2A] text-xs text-[#777777] dark:text-[#A3A3A3] flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#080808] dark:text-[#F3F3F3]">Demo Account</p>
                <p className="text-[#404040] dark:text-[#D4D4D4] font-mono text-[11px] truncate">demo@tempo.app</p>
                <p className="text-[#777777] dark:text-[#A3A3A3] font-mono text-[10px]">Password123!</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail('demo@tempo.app');
                  setPassword('Password123!');
                }}
                className="px-2.5 py-1.5 text-xs rounded-lg bg-[#FFFFFF] dark:bg-[#181818] text-[#080808] dark:text-[#F3F3F3] hover:bg-[#EFEFEF] dark:hover:bg-[#2A2A2A] border border-[#D9D9D9] dark:border-[#333333] transition font-medium shrink-0"
              >
                Auto-fill
              </button>
            </div>

            <div className="text-center text-xs text-[#777777] dark:text-[#A3A3A3]">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-[#080808] dark:text-[#F3F3F3] font-semibold underline hover:opacity-80 transition"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
