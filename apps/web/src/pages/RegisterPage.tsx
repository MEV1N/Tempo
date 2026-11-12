import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { TempoLogo } from '../components/TempoLogo';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await register({ name: name.trim(), email: email.trim().toLowerCase(), password });
      navigate('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#080808] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 max-w-full overflow-x-hidden">
      <div className="w-full max-w-md mx-auto text-center">
        <TempoLogo size="xl" showTagline={true} className="items-center" />
        <h2 className="mt-6 text-xl font-semibold tracking-tight text-[#080808]">
          Begin your journey
        </h2>
        <p className="mt-1 font-handwritten text-xl text-[#777777]">find your daily rhythm</p>
      </div>

      <div className="mt-8 w-full max-w-md mx-auto">
        <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-[#F5F5F5] border border-[#080808] text-[#080808] text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Continue with Google */}
          <div>
            <a
              href="/api/auth/google"
              className="w-full py-2.5 px-4 rounded-xl bg-[#FFFFFF] hover:bg-[#F5F5F5] text-[#080808] font-medium text-xs sm:text-sm border border-[#D9D9D9] transition flex items-center justify-center space-x-2.5 active:scale-[0.99]"
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
            <div className="flex-1 border-t border-[#D9D9D9]" />
            <span className="shrink-0 bg-[#FFFFFF] px-3 text-[11px] font-medium tracking-wider text-[#777777] uppercase">
              Or with email
            </span>
            <div className="flex-1 border-t border-[#D9D9D9]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#404040] mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] placeholder-[#777777] text-sm focus:outline-none focus:border-[#080808] focus:bg-[#FFFFFF] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#404040] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] placeholder-[#777777] text-sm focus:outline-none focus:border-[#080808] focus:bg-[#FFFFFF] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#404040] mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] placeholder-[#777777] text-sm focus:outline-none focus:border-[#080808] focus:bg-[#FFFFFF] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#404040] mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFA] border border-[#D9D9D9] text-[#080808] placeholder-[#777777] text-sm focus:outline-none focus:border-[#080808] focus:bg-[#FFFFFF] transition"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#080808] hover:bg-[#171717] text-[#FFFFFF] font-medium text-sm transition flex items-center justify-center space-x-2 disabled:opacity-50 active:scale-[0.99]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-[#EFEFEF] text-center text-xs text-[#777777]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[#080808] font-semibold underline hover:opacity-80 transition"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
