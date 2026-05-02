import type { Platform } from '../types';
import { PlatformIcon } from './PlatformIcon';

interface Props {
  value: Platform | null;
  onChange: (platform: Platform) => void;
}

const OPTIONS: { value: Platform; title: string; subtitle: string }[] = [
  { value: 'instagram', title: 'Instagram', subtitle: 'Reel, Post, IGTV' },
  { value: 'facebook', title: 'Facebook', subtitle: 'Post, Video, Reel' },
];

export function PlatformSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={selected}
            className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
              selected
                ? 'border-indigo-400/60 bg-indigo-500/10 ring-2 ring-indigo-400/40'
                : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <PlatformIcon platform={opt.value} className="h-10 w-10 shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold text-slate-100">{opt.title}</div>
                <div className="text-xs text-slate-400">{opt.subtitle}</div>
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
