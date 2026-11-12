import { memo, useState, useContext } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { ThemeContext } from '../context/ThemeContext';

export type AnimationAssetName = 'loading' | 'tea' | 'sun' | 'moon' | 'tasks' | 'clock';

export interface TempoAnimationProps {
  name: AnimationAssetName;
  alt: string;
  size?: number;
  className?: string;
  eager?: boolean;
  fallback?: React.ReactNode;
}

// Canonical animation asset paths in apps/web/public/animations/
const LIGHT_ANIMATION_URLS: Record<AnimationAssetName, string> = {
  loading: '/animations/loading.gif',
  tea: '/animations/tea.gif',
  sun: '/animations/sun.gif',
  moon: '/animations/moon.gif',
  tasks: '/animations/tasks.gif',
  clock: '/animations/clock.gif',
};

// Dark-themed variants ending with dark; falls back to light asset if no dark asset exists
const DARK_ANIMATION_URLS: Record<AnimationAssetName, string> = {
  loading: '/animations/loading dark.gif',
  tea: '/animations/tea.gif',
  sun: '/animations/sun.gif',
  moon: '/animations/moon.gif',
  tasks: '/animations/tasks dark.gif',
  clock: '/animations/clock dark.gif',
};

/**
 * Universal Tempo animation component usable across both Desktop and Mobile.
 * - Automatically selects theme-appropriate animation (light vs dark variant)
 * - Aspect-ratio preserved (~309x309 square)
 * - Safe from React rerender flickering/restarts
 * - Respects prefers-reduced-motion with static icon fallback
 * - Graceful fallback if asset fails to load
 */
export const TempoAnimation = memo(function TempoAnimation({
  name,
  alt,
  size = 36,
  className = '',
  eager = false,
  fallback = null,
}: TempoAnimationProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [loadError, setLoadError] = useState(false);
  const themeContext = useContext(ThemeContext);

  // If user prefers reduced motion or asset fails to load, render fallback
  if ((prefersReducedMotion || loadError) && fallback) {
    return <>{fallback}</>;
  }

  const isDark =
    themeContext?.resolvedTheme === 'dark' ||
    (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  const src = isDark ? DARK_ANIMATION_URLS[name] : LIGHT_ANIMATION_URLS[name];

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setLoadError(true)}
      className={`inline-block select-none pointer-events-none object-contain ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        maxWidth: `${size}px`,
        maxHeight: `${size}px`,
      }}
    />
  );
});

// Re-export as MobileAnimation for backwards compatibility
export const MobileAnimation = TempoAnimation;

