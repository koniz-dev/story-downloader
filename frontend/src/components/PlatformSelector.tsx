import type { Platform } from '../types';
import { useI18n } from '../lib/i18n';
import { PlatformIcon } from './PlatformIcon';

interface Props {
  value: Platform | null;
  onChange: (platform: Platform) => void;
}

const PLATFORMS: Platform[] = ['instagram', 'facebook', 'tiktok'];

// Mobile-first: full-width stacked rows so each tile is a big horizontal
// touch target (~76px min-height) and the 3 platforms align symmetrically.
// On sm+ collapse to a 3-up grid where tiles use a vertical "card" arrangement
// for desktop visual balance.
export function PlatformSelector({ value, onChange }: Props) {
  const { t } = useI18n();
  return (
    <div
      aria-label={t.steps.selectPlatform}
      className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-4"
    >
      {PLATFORMS.map((p) => {
        const selected = value === p;
        const meta = t.platform[p];
        return (
          <button
            key={p}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(p)}
            className={`glass group relative overflow-hidden rounded-2xl text-left transition-all duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring active:scale-[0.99] motion-reduce:active:scale-100 sm:hover:-translate-y-0.5 motion-reduce:sm:hover:translate-y-0 ${
              selected
                ? 'glow-accent ring-2 ring-accent-ring/50'
                : 'hover:shadow-card'
            } p-4 sm:p-5 min-h-[72px] sm:min-h-[120px]`}
          >
            {/* Mobile: row layout (icon left, text right). sm+: column layout. */}
            <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2.5">
              <PlatformIcon
                platform={p}
                className="h-10 w-10 shrink-0 sm:h-9 sm:w-9"
              />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-fg text-base sm:text-sm">
                  {meta.name}
                </div>
                <div className="text-xs text-fg-muted truncate sm:whitespace-normal">
                  {meta.kinds}
                </div>
              </div>
              {/* Mobile-only forward chevron — signals "tap to continue". */}
              <ChevronIcon
                className={`h-5 w-5 shrink-0 sm:hidden transition-opacity motion-reduce:transition-none ${
                  selected ? 'opacity-0' : 'text-fg-muted opacity-70'
                }`}
              />
            </div>
            {selected && (
              <span
                aria-hidden="true"
                className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-fg shadow-card"
              >
                <CheckIcon className="h-3.5 w-3.5" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
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
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
