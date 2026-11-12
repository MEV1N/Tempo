import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export type ThemeMode = 'AUTO' | 'LIGHT' | 'DARK';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  isAuto: boolean;
}

const THEME_STORAGE_KEY = 'tempo_theme_preference';
const TIMEZONE_STORAGE_KEY = 'tempo_user_timezone';

export function computeAutoTheme(timezone?: string): ResolvedTheme {
  try {
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: tz,
    });
    const hour = parseInt(formatter.format(new Date()), 10);
    // 6:00 AM (06) to 6:00 PM (18) is light; 18:00 to 06:00 is dark
    return hour >= 6 && hour < 18 ? 'light' : 'dark';
  } catch {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18 ? 'light' : 'dark';
  }
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { preference, updatePreferences } = useAuth();

  // Initialize theme mode from storage or backend preference, defaulting to AUTO
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'AUTO';
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (stored && ['AUTO', 'LIGHT', 'DARK'].includes(stored)) {
      return stored;
    }
    return (preference?.themePreference as ThemeMode) || 'AUTO';
  });

  // Keep user's configured timezone updated in localStorage for early bootstrap
  useEffect(() => {
    if (preference?.timezone) {
      localStorage.setItem(TIMEZONE_STORAGE_KEY, preference.timezone);
    }
  }, [preference?.timezone]);

  // Sync with backend preference when loaded
  useEffect(() => {
    if (preference?.themePreference) {
      const serverTheme = preference.themePreference as ThemeMode;
      if (['AUTO', 'LIGHT', 'DARK'].includes(serverTheme)) {
        setThemeModeState((prev) => {
          if (prev !== serverTheme) {
            localStorage.setItem(THEME_STORAGE_KEY, serverTheme);
            return serverTheme;
          }
          return prev;
        });
      }
    }
  }, [preference?.themePreference]);

  const calculateResolvedTheme = useCallback(
    (mode: ThemeMode): ResolvedTheme => {
      if (mode === 'LIGHT') return 'light';
      if (mode === 'DARK') return 'dark';
      return computeAutoTheme(preference?.timezone);
    },
    [preference?.timezone]
  );

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    calculateResolvedTheme(themeMode)
  );

  // Apply class to document.documentElement
  const applyThemeToDOM = useCallback((resolved: ResolvedTheme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  // Update resolved theme whenever themeMode or timezone changes
  useEffect(() => {
    const resolved = calculateResolvedTheme(themeMode);
    setResolvedTheme(resolved);
    applyThemeToDOM(resolved);
  }, [themeMode, calculateResolvedTheme, applyThemeToDOM]);

  // Handle Auto mode time boundaries (6:00 AM & 6:00 PM), tab focus, and visibilitychange
  useEffect(() => {
    if (themeMode !== 'AUTO') return;

    const checkAndApply = () => {
      const current = calculateResolvedTheme('AUTO');
      setResolvedTheme((prev) => {
        if (prev !== current) {
          applyThemeToDOM(current);
          return current;
        }
        return prev;
      });
    };

    // 1. Recalculate when tab becomes active again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndApply();
      }
    };

    // 2. Recalculate on window focus
    const handleFocus = () => {
      checkAndApply();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // 3. Periodic heartbeat check every 30 seconds
    const interval = setInterval(checkAndApply, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [themeMode, calculateResolvedTheme, applyThemeToDOM]);

  // Set theme mode handler (persists to localStorage and optionally backend API)
  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    }
    const resolved = calculateResolvedTheme(mode);
    setResolvedTheme(resolved);
    applyThemeToDOM(resolved);

    // Persist to user preferences on backend if updatePreferences is available
    if (updatePreferences) {
      try {
        await updatePreferences({ themePreference: mode });
      } catch (err) {
        // Silent catch: local setting remains saved and active
      }
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        resolvedTheme,
        setThemeMode,
        isAuto: themeMode === 'AUTO',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

