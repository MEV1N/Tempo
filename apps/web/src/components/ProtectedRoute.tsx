import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TempoLogo } from './TempoLogo';
import { TempoAnimation } from './TempoAnimation';
import { Clock } from 'lucide-react';

export function AppLoadingScreen({
  message = 'Initializing your rhythm...',
  error,
  onRetry,
}: {
  message?: string;
  error?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#121212] text-[#080808] dark:text-[#F3F3F3] flex flex-col items-center justify-center p-6 select-none transition-colors">
      <div className="flex flex-col items-center text-center space-y-4 max-w-sm">
        <TempoLogo size="lg" showTagline={true} />

        <div className="py-2">
          {error ? (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-[#777777] dark:text-[#A3A3A3]">{error}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 bg-[#080808] dark:bg-[#F3F3F3] text-[#FFFFFF] dark:text-[#080808] text-xs font-semibold rounded-xl hover:opacity-90 transition shadow-xs"
                >
                  Retry Connection
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-3">
              <TempoAnimation
                name="loading"
                alt="Tempo loading animation"
                size={56}
                eager
                fallback={<Clock className="w-6 h-6 animate-spin text-[#080808] dark:text-[#F3F3F3]" />}
              />
              <p className="text-xs text-[#777777] dark:text-[#A3A3A3] font-medium tracking-wide">
                {message}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, preference, loading, refreshAuth } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AppLoadingScreen onRetry={refreshAuth} />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect users who have not completed onboarding to onboarding
  const isOnboardingDone = preference?.onboardingCompleted ?? user.onboardingCompleted ?? false;
  if (!isOnboardingDone && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // If onboarding is completed and user navigates to /onboarding, redirect to dashboard
  if (isOnboardingDone && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, preference, loading, refreshAuth } = useAuth();

  if (loading) {
    return <AppLoadingScreen onRetry={refreshAuth} />;
  }

  if (user) {
    const isOnboardingDone = preference?.onboardingCompleted ?? user.onboardingCompleted ?? false;
    if (!isOnboardingDone) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
