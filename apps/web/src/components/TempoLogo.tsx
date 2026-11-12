import { Link } from 'react-router-dom';

interface TempoLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  to?: string;
  className?: string;
}

export function TempoLogo({
  size = 'md',
  showTagline = true,
  to = '/',
  className = '',
}: TempoLogoProps) {
  const fontSizes = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
    xl: 'text-5xl sm:text-6xl',
  };

  const taglineSizes = {
    sm: 'text-[10px]',
    md: 'text-[11px]',
    lg: 'text-xs',
    xl: 'text-sm',
  };

  const content = (
    <div className={`inline-flex flex-col select-none ${className}`}>
      <div className="flex items-baseline space-x-1">
        <span
          className={`font-brand font-bold tracking-tight text-[#080808] dark:text-[#F3F3F3] leading-none ${fontSizes[size]}`}
          style={{ letterSpacing: '-0.02em' }}
        >
          tempo
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#080808] dark:bg-[#F3F3F3] mb-1 transform translate-y-[-2px]" />
      </div>
      {showTagline && (
        <span
          className={`font-interface tracking-wide text-[#777777] dark:text-[#A3A3A3] font-normal leading-tight mt-0.5 ${taglineSizes[size]}`}
        >
          Find your rhythm.
        </span>
      )}
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="inline-flex hover:opacity-80 transition-opacity focus:outline-none"
        title="Tempo — Find your rhythm."
      >
        {content}
      </Link>
    );
  }

  return content;
}
