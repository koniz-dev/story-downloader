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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {PLATFORMS.map((p) => {
        const selected = value === p;
        const meta = t.platform[p];
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-pressed={selected}
            className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
              selected
                ? 'border-indigo-400/60 bg-indigo-500/10 ring-2 ring-indigo-400/40'
                : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <PlatformIcon platform={p} className="h-10 w-10 shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-slate-100">{meta.name}</div>
                <div className="text-xs text-slate-400">{meta.kinds}</div>
              </div>
            </div>
            {selected && (
              <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-xs text-white">
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
