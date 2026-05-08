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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="sd-guide-panel"
        className="sm:hidden glass inline-flex items-center justify-between w-full rounded-2xl px-4 py-3 min-h-[48px] text-sm font-medium text-fg-secondary hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring transition-colors motion-reduce:transition-none"
      >
        <span>{open ? t.guide.hide : t.guide.show}</span>
        <Chevron open={open} />
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
      className={`h-5 w-5 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
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
