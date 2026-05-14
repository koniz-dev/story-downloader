import { useEffect, useState } from 'react';
import { Guide } from './Guide';
import { useI18n } from '../lib/i18n';
import type { Platform } from '../types';

export function CollapsibleGuide({ platform }: { platform: Platform }) {
  const { t } = useI18n();
  // SSR-safe default (open). Effect closes it on mobile after mount.
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    setOpen(window.matchMedia('(min-width: 640px)').matches);
  }, [platform]);

  const intro = t.guide[platform].intro;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="sd-guide-panel"
        className="sm:hidden glass w-full rounded-2xl px-4 py-3 min-h-[64px] text-left hover:bg-bg-raised/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring transition-colors motion-reduce:transition-none"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-accent shrink-0">
              <BookIcon className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-medium text-fg truncate">
              {open ? t.guide.hide : t.guide.show}
            </span>
          </div>
          <Chevron open={open} />
        </div>
        {!open && (
          <p className="mt-2 text-xs text-fg-muted line-clamp-2 leading-relaxed">
            {intro}
          </p>
        )}
      </button>
      <div id="sd-guide-panel" className={open ? '' : 'hidden sm:block'}>
        <Guide platform={platform} />
      </div>
    </>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 shrink-0 text-fg-muted transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z" />
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20" />
    </svg>
  );
}
