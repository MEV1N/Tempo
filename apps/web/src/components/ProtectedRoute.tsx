import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TempoAnimation } from './TempoAnimation';
import { Clock } from 'lucide-react';

export function AppLoadingScreen({
  error,
  onRetry,
}: {
  message?: string;
  error?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#101010] text-[#080808] dark:text-[#F5F5F5] flex items-center justify-center p-6 select-none transition-colors">
      {error ? (
        <div className="flex flex-col items-center text-center space-y-3 max-w-sm">
          <p className="text-xs text-[#777777] dark:text-[#A3A3A3]">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-[#080808] dark:bg-[#F5F5F5] text-[#FFFFFF] dark:text-[#101010] text-xs font-semibold rounded-xl hover:opacity-90 transition shadow-xs"
            >
              Retry Connection
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center">
          <TempoAnimation
            name="loading"
            alt="Tempo loading animation"
            size={76}
            eager
            fallback={<Clock className="w-8 h-8 animate-spin text-[#080808] dark:text-[#F5F5F5]" />}
          />
        </div>
      )}
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
