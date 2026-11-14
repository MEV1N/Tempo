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

// Canonical animation GIF paths in apps/web/public/animations/
const LIGHT_GIF_URLS: Record<AnimationAssetName, string> = {
  loading: '/animations/loading.gif',
  tea: '/animations/tea.gif',
  sun: '/animations/sun.gif',
  moon: '/animations/moon.gif',
  tasks: '/animations/tasks.gif',
  clock: '/animations/clock.gif',
};

// Dark-themed GIF variants
const DARK_GIF_URLS: Record<AnimationAssetName, string> = {
  loading: '/animations/loading%20dark.gif',
  tea: '/animations/tea%20dark.gif',
  sun: '/animations/sun.gif',
  moon: '/animations/moon.gif',
  tasks: '/animations/tasks%20dark.gif',
  clock: '/animations/clock%20dark.gif',
};

// Modern high-performance animated WebP alternatives (60-75% smaller, faster decode)
const LIGHT_WEBP_URLS: Record<AnimationAssetName, string> = {
  loading: '/animations/loading.webp',
  tea: '/animations/tea.webp',
  sun: '/animations/sun.webp',
  moon: '/animations/moon.webp',
  tasks: '/animations/tasks.webp',
  clock: '/animations/clock.webp',
};

const DARK_WEBP_URLS: Record<AnimationAssetName, string> = {
  loading: '/animations/loading%20dark.webp',
  tea: '/animations/tea%20dark.webp',
  sun: '/animations/sun.webp',
  moon: '/animations/moon.webp',
  tasks: '/animations/tasks%20dark.webp',
  clock: '/animations/clock%20dark.webp',
};

// Global in-memory preloader to eliminate load lag and cache images in browser memory
const preloadedUrls = new Set<string>();
function preloadAsset(url: string) {
  if (typeof window === 'undefined' || preloadedUrls.has(url)) return;
  preloadedUrls.add(url);
  const img = new Image();
  img.src = url;
}

if (typeof window !== 'undefined') {
  const schedulePreload = () => {
    (['loading', 'sun', 'moon', 'clock', 'tea', 'tasks'] as AnimationAssetName[]).forEach((name) => {
      preloadAsset(LIGHT_WEBP_URLS[name]);
      preloadAsset(DARK_WEBP_URLS[name]);
    });
  };
  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(schedulePreload);
  } else {
    setTimeout(schedulePreload, 200);
  }
}

/**
 * Universal Tempo animation component usable across both Desktop and Mobile.
 * - Prioritizes lightweight animated WebP with automatic GIF fallback via <picture>
 * - In-memory preloading for zero-latency instant rendering
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

  const gifSrc = isDark ? DARK_GIF_URLS[name] : LIGHT_GIF_URLS[name];
  const webpSrc = isDark ? DARK_WEBP_URLS[name] : LIGHT_WEBP_URLS[name];

  // Contrast adaptation: clock, loading, tasks, tea, and moon have dedicated dark assets with white strokes.
  // Only sun (lacking a dedicated dark asset) requires inversion in dark mode to yield white strokes.
  const shouldInvert = isDark && name === 'sun';

  return (
    <picture className={`inline-block leading-none ${className}`}>
      <source type="image/webp" srcSet={webpSrc} />
      <img
        src={gifSrc}
        alt={alt}
        width={size}
        height={size}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setLoadError(true)}
        className="inline-block select-none pointer-events-none object-contain"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          maxWidth: `${size}px`,
          maxHeight: `${size}px`,
          filter: shouldInvert ? 'invert(1)' : undefined,
          mixBlendMode: isDark ? 'screen' : undefined,
        }}
      />
    </picture>
  );
});

// Re-export as MobileAnimation for backwards compatibility
export const MobileAnimation = TempoAnimation;
