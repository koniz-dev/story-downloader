import type { Platform } from '../types';

export function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  if (platform === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <defs>
          <linearGradient id="ig-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FED373" />
            <stop offset="33%" stopColor="#F15245" />
            <stop offset="66%" stopColor="#D92E7F" />
            <stop offset="100%" stopColor="#9B36B7" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-gradient)" />
        <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.8" />
        <circle cx="17.5" cy="6.5" r="1.2" fill="#fff" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#1877F2" />
      <path
        d="M14.5 12h-2v6.5h-2.7V12H8.4V9.7h1.4V8.2c0-1.7 1-2.7 2.7-2.7h1.7v2.3h-1c-.5 0-.7.2-.7.7V9.7h1.7L14.5 12z"
        fill="#fff"
      />
    </svg>
  );
}
