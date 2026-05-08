import type { Platform } from '../types';
import { useI18n } from '../lib/i18n';
import { PlatformIcon } from './PlatformIcon';

interface Props {
  value: Platform | null;
  onChange: (platform: Platform) => void;
}

const PLATFORMS: Platform[] = ['instagram', 'facebook', 'tiktok'];

export function PlatformSelector({ value, onChange }: Props) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-2 gap-3 xs:gap-4 sm:grid-cols-3">
      {PLATFORMS.map((p) => {
        const selected = value === p;
        const meta = t.platform[p];
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-pressed={selected}
            className={`glass group relative overflow-hidden rounded-2xl p-4 sm:p-5 min-h-[76px] text-left transition-all duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 ${
              selected ? 'glow-accent ring-2 ring-accent-ring/50' : 'hover:shadow-card'
            }`}
          >
            <div className="flex items-center gap-3">
              <PlatformIcon platform={p} className="h-10 w-10 shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-fg">{meta.name}</div>
                <div className="text-xs text-fg-muted">{meta.kinds}</div>
              </div>
            </div>
            {selected && (
              <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs text-accent-fg">
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
