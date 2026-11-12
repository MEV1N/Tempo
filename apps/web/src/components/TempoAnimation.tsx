import { memo, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

export type AnimationAssetName = 'loading' | 'tea' | 'sun' | 'moon' | 'tasks';

export interface TempoAnimationProps {
  name: AnimationAssetName;
  alt: string;
  size?: number;
  className?: string;
  eager?: boolean;
  fallback?: React.ReactNode;
}

// Map of canonical animation asset paths in apps/web/public/animations/
const ANIMATION_URLS: Record<AnimationAssetName, string> = {
  loading: '/animations/loading.gif',
  tea: '/animations/tea.gif',
  sun: '/animations/sun.gif',
  moon: '/animations/moon.gif',
  tasks: '/animations/tasks.gif',
};

/**
 * Universal Tempo animation component usable across both Desktop and Mobile.
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

  // If user prefers reduced motion or asset fails to load, render fallback
  if ((prefersReducedMotion || loadError) && fallback) {
    return <>{fallback}</>;
  }

  const src = ANIMATION_URLS[name];

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

